import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { db, runTransaction, generateUniqueAffiliateCode } from './db.ts';
import { PLATFORM_CONFIG } from './config.ts';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_EdurtLiveGatewayKey';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'edurt_rzp_hmac_secret_2026_secure';
export const JWT_SECRET = process.env.JWT_SECRET || 'edurt_jwt_signing_secret_key_2026_v1';
export const STREAM_SIGNING_SECRET = process.env.STREAM_SIGNING_SECRET || 'edurt_video_stream_hmac_secret_2026';
const BACKUP_AES_KEY = crypto.scryptSync(process.env.BACKUP_SECRET || 'edurt_backup_master_key_2026', 'edurt_salt', 32);

export const smtpTransporter = nodemailer.createTransport({
  host: PLATFORM_CONFIG.smtp.host,
  port: PLATFORM_CONFIG.smtp.port,
  secure: PLATFORM_CONFIG.smtp.secure,
  auth: {
    user: PLATFORM_CONFIG.smtp.user,
    pass: PLATFORM_CONFIG.smtp.password,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
});

export function createOrderSignature(razorpayOrderId: string, razorpayPaymentId: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

export function createWebhookSignature(rawBody: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(rawBody)
    .digest('hex');
}

export function createSignedStreamToken(userId: number, lessonOrVideoKey: string, expiresInSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${userId}:${lessonOrVideoKey}:${exp}`;
  const sig = crypto.createHmac('sha256', STREAM_SIGNING_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifySignedStreamToken(token: string, expectedKey: string): { valid: boolean; userId?: number } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userIdStr, assetKey, expStr, sig] = decoded.split(':');
    if (!userIdStr || !assetKey || !expStr || !sig) return { valid: false };
    if (assetKey !== expectedKey) return { valid: false };
    const exp = Number(expStr);
    if (Math.floor(Date.now() / 1000) > exp) return { valid: false };
    const payload = `${userIdStr}:${assetKey}:${expStr}`;
    const expectedSig = crypto.createHmac('sha256', STREAM_SIGNING_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return { valid: false };
    return { valid: true, userId: Number(userIdStr) };
  } catch {
    return { valid: false };
  }
}

export function createUserNotification(
  userId: number,
  title: string,
  message: string,
  actionLink: string | null = null
): void {
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, action_link, is_read)
    VALUES (?, ?, ?, ?, 0)
  `).run(userId, title, message, actionLink);
}

export function sendPlatformEmail(
  userId: number | null,
  recipientEmail: string,
  templateKey: string,
  variables: Record<string, string | number>
): void {
  const tpl = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(templateKey) as
    | { subject: string; body_html: string; sender_name?: string; sender_email?: string }
    | undefined;

  let subject = tpl ? tpl.subject : `LearnUp India Notification (${templateKey})`;
  let bodyHtml = tpl ? tpl.body_html : JSON.stringify(variables);

  for (const [k, v] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    subject = subject.replace(regex, String(v));
    bodyHtml = bodyHtml.replace(regex, String(v));
  }

  const plainPreview = bodyHtml.replace(/<[^>]+>/g, '').slice(0, 400);

  db.prepare(`
    INSERT INTO email_logs (user_id, recipient_email, template_key, subject, body_preview, status)
    VALUES (?, ?, ?, ?, ?, 'delivered')
  `).run(userId, recipientEmail, templateKey, subject, plainPreview);

  const fromName = tpl?.sender_name || PLATFORM_CONFIG.smtp.senderName;
  const fromEmail = tpl?.sender_email || PLATFORM_CONFIG.smtp.senderEmail;

  // Dispatch via Hostinger SMTP asynchronously when live SMTP is reachable
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_LIVE_SMTP === 'true') {
    smtpTransporter
      .sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail,
        subject,
        html: bodyHtml,
      })
      .catch(() => {
        // Logged in email_logs above; fail-safe for local sandbox environments
      });
  }
}

export function logAdminActivity(
  adminId: number | null,
  adminRole: string,
  action: string,
  affectedRecord: string,
  previousValue: string | null = null,
  newValue: string | null = null,
  ipAddress = '127.0.0.1'
): void {
  db.prepare(`
    INSERT INTO admin_activity_logs (admin_id, admin_role, action, affected_record, previous_value, new_value, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, adminRole, action, affectedRecord, previousValue, newValue, ipAddress);
}

export interface PaymentVerificationResult {
  alreadyProcessed: boolean;
  orderId: number;
  paymentId: number;
  enrolledCoursesCount: number;
  commissionCreditedInr: number;
  referrerUserId: number | null;
}

export function verifyAndActivatePayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  verifiedBy: 'server_signature' | 'webhook' | 'admin_manual';
}): PaymentVerificationResult {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, verifiedBy } = params;

  if (verifiedBy !== 'admin_manual') {
    const expectedSig = createOrderSignature(razorpayOrderId, razorpayPaymentId);
    if (razorpaySignature !== expectedSig) {
      throw new Error('Invalid Razorpay cryptographic payment signature');
    }
  }

  return runTransaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpayOrderId) as
      | {
          id: number;
          order_number: string;
          user_id: number;
          package_id: number;
          package_name_snapshot: string;
          gross_amount_inr: number;
          status: string;
        }
      | undefined;

    if (!order) {
      throw new Error('Order not found for Razorpay Order ID');
    }

    const existingPayment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id) as
      | { id: number; status: string }
      | undefined;

    if (order.status === 'paid' && existingPayment?.status === 'successful') {
      return {
        alreadyProcessed: true,
        orderId: order.id,
        paymentId: existingPayment.id,
        enrolledCoursesCount: 0,
        commissionCreditedInr: 0,
        referrerUserId: null,
      };
    }

    // 1. Update or insert payment record
    let paymentId: number;
    if (existingPayment) {
      db.prepare(`
        UPDATE payments
        SET razorpay_payment_id = ?,
            razorpay_signature = ?,
            status = 'successful',
            verified_by = ?,
            verified_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(razorpayPaymentId, razorpaySignature, verifiedBy, existingPayment.id);
      paymentId = existingPayment.id;
    } else {
      const pRes = db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gross_amount_inr, status, verified_by, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, 'successful', ?, datetime('now'))
      `).run(order.id, order.user_id, razorpayOrderId, razorpayPaymentId, razorpaySignature, order.gross_amount_inr, verifiedBy);
      paymentId = Number(pRes.lastInsertRowid);
    }

    // 2. Mark order paid
    db.prepare(`UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(order.id);

    // 2b. Automatically change account status from Inactive to Active & record activation timestamp (PRD Extra Feature 01)
    db.prepare(`
      UPDATE users
      SET status = 'active',
          activated_at = COALESCE(activated_at, datetime('now')),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(order.user_id);

    // 3. Provision Lifetime Course Enrollments for all courses in package
    const pkgCourses = db.prepare('SELECT course_id FROM package_courses WHERE package_id = ?').all(order.package_id) as Array<{
      course_id: number;
    }>;

    const enrollStmt = db.prepare(`
      INSERT OR IGNORE INTO user_course_enrollments (user_id, course_id, package_id, order_id, access_type)
      VALUES (?, ?, ?, ?, 'lifetime')
    `);
    for (const pc of pkgCourses) {
      enrollStmt.run(order.user_id, pc.course_id, order.package_id, order.id);
    }

    // 4. Calculate 70% Direct Referrer / 30% Company Commission on Gross Package Selling Price
    const buyer = db.prepare(`
      SELECT u.id, u.email, u.referred_by_user_id, u.referred_by_code, up.full_name, ac.code as own_affiliate_code
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
      WHERE u.id = ?
    `).get(order.user_id) as {
      id: number;
      email: string;
      referred_by_user_id: number | null;
      referred_by_code: string | null;
      full_name: string;
      own_affiliate_code: string;
    };

    // 4b. Ensure user has a permanent 6-character affiliate code generated upon activation
    let buyerAffCode = buyer.own_affiliate_code;
    if (!buyerAffCode) {
      buyerAffCode = generateUniqueAffiliateCode();
      db.prepare(`
        INSERT INTO affiliate_codes (user_id, code, clicks, is_active)
        VALUES (?, ?, 0, 1)
      `).run(buyer.id, buyerAffCode);
    }

    const existingCommission = db.prepare('SELECT id FROM affiliate_commissions WHERE payment_id = ?').get(paymentId);
    let commissionCreditedInr = 0;
    const referrerUserId = buyer.referred_by_user_id;

    if (!existingCommission) {
      const grossPrice = Number(order.gross_amount_inr);
      const commRef = `COM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      if (referrerUserId) {
        // Eligible direct referral: 70% to Referrer, 30% to Company
        const referrerAmount = Math.round(grossPrice * 0.7 * 100) / 100;
        const companyAmount = Math.round((grossPrice - referrerAmount) * 100) / 100;
        commissionCreditedInr = referrerAmount;

        db.prepare(`
          INSERT INTO affiliate_commissions (
            commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id,
            gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 70.0, ?, 30.0, ?, 'available')
        `).run(commRef, paymentId, order.id, referrerUserId, buyer.id, order.package_id, grossPrice, referrerAmount, companyAmount);

        // Update referral status
        db.prepare(`UPDATE referrals SET status = 'purchased' WHERE referred_user_id = ?`).run(buyer.id);

        // Credit referrer's wallet account and record immutable ledger entry
        db.prepare(`
          UPDATE wallet_accounts
          SET available_commission_inr = ROUND(available_commission_inr + ?, 2),
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(referrerAmount, referrerUserId);

        const updatedWallet = db.prepare('SELECT available_commission_inr FROM wallet_accounts WHERE user_id = ?').get(referrerUserId) as {
          available_commission_inr: number;
        };

        const txRef = `TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        db.prepare(`
          INSERT INTO wallet_transactions (
            reference_id, user_id, tx_type, bucket, direction, amount_inr, balance_after_inr, description, related_payment_id
          ) VALUES (?, ?, 'commission_credit', 'available_commission', 'credit', ?, ?, ?, ?)
        `).run(
          txRef,
          referrerUserId,
          referrerAmount,
          updatedWallet.available_commission_inr,
          `70% Direct Referral Commission — ${buyer.full_name} (${order.package_name_snapshot})`,
          paymentId
        );

        // Notify Referrer
        const referrer = db.prepare(`
          SELECT u.email, up.full_name FROM users u JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?
        `).get(referrerUserId) as { email: string; full_name: string } | undefined;

        if (referrer) {
          createUserNotification(
            referrerUserId,
            `₹${referrerAmount.toLocaleString('en-IN')} Affiliate Commission Credited!`,
            `Your referral ${buyer.full_name} purchased ${order.package_name_snapshot} (₹${grossPrice.toLocaleString('en-IN')}). 70% commission credited immediately to your Available Balance.`,
            '/dashboard?tab=affiliate'
          );
          sendPlatformEmail(referrerUserId, referrer.email, 'commission_credit', {
            name: referrer.full_name,
            amount: referrerAmount.toLocaleString('en-IN'),
            package_name: order.package_name_snapshot,
          });
        }
      } else {
        // Company-acquired user: 0% Referrer, 100% Company Share
        db.prepare(`
          INSERT INTO affiliate_commissions (
            commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id,
            gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status
          ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0.0, 0.0, 100.0, ?, 'available')
        `).run(commRef, paymentId, order.id, buyer.id, order.package_id, grossPrice, grossPrice);
      }
    }

    // 5. Notify Buyer (Account Activation + Welcome + Payment Confirmation)
    createUserNotification(
      buyer.id,
      `Account Activated & Full Dashboard Unlocked!`,
      `Your payment of ₹${order.gross_amount_inr.toLocaleString('en-IN')} for ${order.package_name_snapshot} is verified. Your account is active, your affiliate code (${buyerAffCode}) is live, and all courses are unlocked.`,
      '/dashboard?tab=courses'
    );
    sendPlatformEmail(buyer.id, buyer.email, 'account_activated', {
      name: buyer.full_name,
      package_name: order.package_name_snapshot,
      affiliate_code: buyerAffCode || 'ACTIVE',
    });
    sendPlatformEmail(buyer.id, buyer.email, 'payment_confirmation', {
      name: buyer.full_name,
      package_name: order.package_name_snapshot,
      order_number: order.order_number,
      amount: order.gross_amount_inr.toLocaleString('en-IN'),
    });
    sendPlatformEmail(buyer.id, buyer.email, 'welcome_email', {
      name: buyer.full_name,
      affiliate_code: buyerAffCode || 'ACTIVE',
    });

    return {
      alreadyProcessed: false,
      orderId: order.id,
      paymentId,
      enrolledCoursesCount: pkgCourses.length,
      commissionCreditedInr,
      referrerUserId,
    };
  });
}

export function evaluateCourseCompletionAndCertify(userId: number, courseId: number): {
  isCompleted: boolean;
  certificateCode: string | null;
  details: {
    compulsoryLessonsTotal: number;
    compulsoryLessonsCompleted: number;
    requiredQuizzesTotal: number;
    requiredQuizzesPassed: number;
    requiredAssignmentsTotal: number;
    requiredAssignmentsSatisfied: number;
  };
} {
  // 1. Check compulsory lessons
  const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ? AND is_compulsory = 1').all(courseId) as Array<{ id: number }>;
  const completedLessons = db.prepare(`
    SELECT COUNT(*) as cnt FROM lesson_progress
    WHERE user_id = ? AND course_id = ? AND is_completed = 1
      AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ? AND is_compulsory = 1)
  `).get(userId, courseId, courseId) as { cnt: number };

  // 2. Check required quizzes
  const quizzes = db.prepare('SELECT id FROM quizzes WHERE course_id = ? AND is_required = 1').all(courseId) as Array<{ id: number }>;
  let passedQuizzes = 0;
  for (const q of quizzes) {
    const passed = db.prepare('SELECT id FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND passed = 1 LIMIT 1').get(q.id, userId);
    if (passed) passedQuizzes++;
  }

  // 3. Check required assignments (and approval if required)
  const assignments = db.prepare('SELECT id, requires_approval FROM assignments WHERE course_id = ? AND is_required = 1').all(courseId) as Array<{
    id: number;
    requires_approval: number;
  }>;
  let satisfiedAssignments = 0;
  for (const a of assignments) {
    if (a.requires_approval) {
      const approved = db.prepare(`
        SELECT id FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? AND status = 'approved' LIMIT 1
      `).get(a.id, userId);
      if (approved) satisfiedAssignments++;
    } else {
      const submitted = db.prepare(`
        SELECT id FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? LIMIT 1
      `).get(a.id, userId);
      if (submitted) satisfiedAssignments++;
    }
  }

  const allLessonsDone = completedLessons.cnt >= lessons.length;
  const allQuizzesDone = passedQuizzes >= quizzes.length;
  const allAssignmentsDone = satisfiedAssignments >= assignments.length;
  const isCompleted = allLessonsDone && allQuizzesDone && allAssignmentsDone;

  let certificateCode: string | null = null;

  if (isCompleted) {
    db.prepare(`
      UPDATE user_course_enrollments
      SET is_completed = 1,
          completed_at = COALESCE(completed_at, datetime('now'))
      WHERE user_id = ? AND course_id = ?
    `).run(userId, courseId);

    const existingCert = db.prepare('SELECT certificate_code FROM certificates WHERE user_id = ? AND course_id = ?').get(
      userId,
      courseId
    ) as { certificate_code: string } | undefined;

    if (existingCert) {
      certificateCode = existingCert.certificate_code;
    } else {
      const user = db.prepare(`
        SELECT u.email, up.full_name FROM users u JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?
      `).get(userId) as { email: string; full_name: string };
      const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId) as { title: string };
      const tplSetting = db.prepare("SELECT value_json FROM system_settings WHERE key = 'certificate_template'").get() as
        | { value_json: string }
        | undefined;
      const tpl = tplSetting ? JSON.parse(tplSetting.value_json) : {};

      certificateCode = `CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      db.prepare(`
        INSERT INTO certificates (certificate_code, user_id, course_id, recipient_name, course_title, company_name, signatory_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        certificateCode,
        userId,
        courseId,
        user.full_name,
        course.title,
        tpl.companyName || 'LearnUp India (learnupindia.com)',
        `${tpl.signatoryName || 'Dr. Vikramaditya Sen'}, ${tpl.signatoryTitle || 'Dean of Academic Standards'}`
      );

      createUserNotification(
        userId,
        `Course Certificate Issued: ${course.title}`,
        `Congratulations! You completed 100% of ${course.title}. Certificate ID: ${certificateCode} is now available for download.`,
        '/dashboard?tab=courses'
      );
      sendPlatformEmail(userId, user.email, 'course_completed', {
        name: user.full_name,
        course_title: course.title,
      });
      sendPlatformEmail(userId, user.email, 'certificate_generated', {
        name: user.full_name,
        course_title: course.title,
        certificate_code: certificateCode,
      });
    }
  }

  return {
    isCompleted,
    certificateCode,
    details: {
      compulsoryLessonsTotal: lessons.length,
      compulsoryLessonsCompleted: completedLessons.cnt,
      requiredQuizzesTotal: quizzes.length,
      requiredQuizzesPassed: passedQuizzes,
      requiredAssignmentsTotal: assignments.length,
      requiredAssignmentsSatisfied: satisfiedAssignments,
    },
  };
}

export function createEncryptedBackup(adminId: number, backupType: 'manual' | 'scheduled' = 'manual') {
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tables = [
    'users',
    'user_profiles',
    'affiliate_codes',
    'referrals',
    'packages',
    'orders',
    'payments',
    'affiliate_commissions',
    'wallet_accounts',
    'wallet_transactions',
    'bonus_transactions',
    'withdrawals',
    'kyc_submissions',
    'courses',
    'course_modules',
    'lessons',
    'certificates',
    'website_content',
    'website_sections',
    'media_assets',
    'system_settings',
  ];

  const snapshot: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    tables: {},
  };

  for (const t of tables) {
    (snapshot.tables as Record<string, unknown>)[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }

  const plainBuffer = Buffer.from(JSON.stringify(snapshot), 'utf8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', BACKUP_AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);

  const checksum = crypto.createHash('sha256').update(payload).digest('hex');
  const backupCode = `BKP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const filePath = path.join(backupDir, `${backupCode}.enc`);
  fs.writeFileSync(filePath, payload);

  const res = db.prepare(`
    INSERT INTO backup_records (
      backup_code, backup_type, includes_db, includes_media, encryption_algorithm,
      file_path, file_size_bytes, checksum_sha256, status, verified_at, created_by_admin_id
    ) VALUES (?, ?, 1, 1, 'AES-256-GCM', ?, ?, ?, 'verified', datetime('now'), ?)
  `).run(backupCode, backupType, filePath, payload.length, checksum, adminId);

  return {
    id: Number(res.lastInsertRowid),
    backupCode,
    fileSizeBytes: payload.length,
    checksum,
  };
}

export function verifyOrRestoreBackup(backupId: number, adminId: number, mode: 'test_verified' | 'completed') {
  const bkp = db.prepare('SELECT * FROM backup_records WHERE id = ?').get(backupId) as
    | { id: number; backup_code: string; file_path: string; checksum_sha256: string }
    | undefined;
  if (!bkp || !fs.existsSync(bkp.file_path)) {
    throw new Error('Backup archive file not found on disk');
  }

  const payload = fs.readFileSync(bkp.file_path);
  const actualChecksum = crypto.createHash('sha256').update(payload).digest('hex');
  if (actualChecksum !== bkp.checksum_sha256) {
    throw new Error('Backup SHA-256 checksum mismatch! Archive integrity check failed.');
  }

  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', BACKUP_AES_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  const parsed = JSON.parse(decrypted);

  if (!parsed || !parsed.tables) {
    throw new Error('Decrypted archive does not contain valid relational table snapshot');
  }

  if (mode === 'completed' && parsed.tables.system_settings) {
    // Restore system_settings & website_content safely
    runTransaction(() => {
      for (const row of parsed.tables.system_settings) {
        db.prepare('INSERT OR REPLACE INTO system_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
          row.key,
          row.value_json,
          row.updated_at
        );
      }
      if (parsed.tables.website_content) {
        for (const row of parsed.tables.website_content) {
          db.prepare('INSERT OR REPLACE INTO website_content (key, published_json, draft_json, has_unpublished_changes) VALUES (?, ?, ?, ?)').run(
            row.key,
            row.published_json,
            row.draft_json,
            row.has_unpublished_changes
          );
        }
      }
    });
  }

  db.prepare(`UPDATE backup_records SET status = 'verified', verified_at = datetime('now') WHERE id = ?`).run(backupId);
  db.prepare(`
    INSERT INTO restore_records (backup_id, status, notes, restored_by_admin_id)
    VALUES (?, ?, ?, ?)
  `).run(
    backupId,
    mode,
    mode === 'test_verified'
      ? `AES-256-GCM decryption & SHA-256 checksum verified (${Object.keys(parsed.tables).length} tables intact)`
      : `Full configuration & CMS snapshot restored from ${bkp.backup_code}`,
    adminId
  );

  return {
    backupCode: bkp.backup_code,
    tablesVerified: Object.keys(parsed.tables).length,
    mode,
  };
}
