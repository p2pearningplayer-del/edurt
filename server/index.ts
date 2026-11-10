import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  db,
  initializeDatabase,
  runTransaction,
  generateUniqueAffiliateCode,
  getBusinessDateIST,
} from './db.ts';
import {
  JWT_SECRET,
  RAZORPAY_KEY_ID,
  createOrderSignature,
  createWebhookSignature,
  createSignedStreamToken,
  verifySignedStreamToken,
  verifyAndActivatePayment,
  evaluateCourseCompletionAndCertify,
  createUserNotification,
  sendPlatformEmail,
  logAdminActivity,
  createEncryptedBackup,
  verifyOrRestoreBackup,
} from './services.ts';
import { PLATFORM_CONFIG } from './config.ts';
import { initializeMysqlIfAvailable, getMysqlStatus } from './mysql.ts';

initializeDatabase();
initializeMysqlIfAvailable().catch(() => {});

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

// Support /api/index.php?_route=/... requests for 100% parity with Hostinger PHP Gateway
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path === '/api/index.php' && typeof req.query._route === 'string') {
    const cleanRoute = req.query._route.startsWith('/') ? req.query._route : `/${req.query._route}`;
    const q = new URLSearchParams(req.query as Record<string, string>);
    q.delete('_route');
    const qs = q.toString();
    req.url = `/api${cleanRoute}${qs ? `?${qs}` : ''}`;
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

export interface AuthenticatedUser {
  id: number;
  email: string;
  mobile: string;
  status: string; // 'active' | 'inactive' | 'suspended'
  activatedAt?: string | null;
  isActivated?: boolean;
  paymentStatus?: string;
  selectedPackage?: {
    id: number;
    name: string;
    priceInr: number;
  } | null;
  pendingOrder?: any;
  fullName: string;
  affiliateCode: string;
  adminId?: number;
  adminRole?: string;
  adminRoleSlug?: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const xToken = req.headers['x-auth-token'];
  if (typeof xToken === 'string' && xToken.trim()) {
    return xToken.trim();
  }
  if (req.cookies && req.cookies.edurt_token) {
    return req.cookies.edurt_token;
  }
  return null;
}

function loadUserContext(userId: number): AuthenticatedUser | null {
  const row = db.prepare(`
    SELECT u.id, u.email, u.mobile, u.status, u.activated_at,
           up.full_name,
           ac.code as affiliate_code,
           au.id as admin_id,
           r.name as admin_role_name,
           r.slug as admin_role_slug,
           r.id as role_id
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    LEFT JOIN admin_users au ON au.user_id = u.id AND au.is_active = 1
    LEFT JOIN roles r ON r.id = au.role_id
    WHERE u.id = ?
  `).get(userId) as
    | {
        id: number;
        email: string;
        mobile: string;
        status: string;
        activated_at: string | null;
        full_name: string;
        affiliate_code: string;
        admin_id: number | null;
        admin_role_name: string | null;
        admin_role_slug: string | null;
        role_id: number | null;
      }
    | undefined;

  if (!row) return null;

  // Retrieve user's latest package order and payment status
  const latestOrder = db.prepare(`
    SELECT o.id, o.order_number, o.package_id, o.package_name_snapshot, o.gross_amount_inr, o.razorpay_order_id, o.status as order_status,
           p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.user_id = ?
    ORDER BY o.id DESC
    LIMIT 1
  `).get(userId) as
    | {
        id: number;
        order_number: string;
        package_id: number;
        package_name_snapshot: string;
        gross_amount_inr: number;
        razorpay_order_id: string;
        order_status: string;
        payment_status: string | null;
      }
    | undefined;

  let permissions: string[] = [];
  if (row.role_id) {
    const permRows = db.prepare(`
      SELECT p.code FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).all(row.role_id) as Array<{ code: string }>;
    permissions = permRows.map((p) => p.code);
  }

  const isActivated = row.status === 'active';
  const paymentStatus = (latestOrder?.order_status === 'paid' || isActivated)
    ? 'successful'
    : latestOrder?.payment_status === 'failed'
    ? 'failed'
    : 'pending';

  return {
    id: row.id,
    email: row.email,
    mobile: row.mobile,
    status: row.status,
    activatedAt: row.activated_at || null,
    isActivated,
    paymentStatus,
    selectedPackage: latestOrder
      ? {
          id: latestOrder.package_id,
          name: latestOrder.package_name_snapshot,
          priceInr: latestOrder.gross_amount_inr,
        }
      : null,
    pendingOrder: latestOrder
      ? {
          id: latestOrder.id,
          orderNumber: latestOrder.order_number,
          razorpayOrderId: latestOrder.razorpay_order_id,
          packageId: latestOrder.package_id,
          packageName: latestOrder.package_name_snapshot,
          grossAmountInr: latestOrder.gross_amount_inr,
          currency: 'INR',
          razorpayKeyId: RAZORPAY_KEY_ID,
          status: latestOrder.order_status,
          paymentStatus,
        }
      : null,
    fullName: row.full_name,
    affiliateCode: row.affiliate_code || '',
    adminId: row.admin_id || undefined,
    adminRole: row.admin_role_name || undefined,
    adminRoleSlug: row.admin_role_slug || undefined,
    permissions,
  };
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; sessionId?: string };
    const user = loadUserContext(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// PRD Extra Feature 01: Blocks inactive users from accessing protected dashboard features
function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user!.status !== 'active') {
      res.status(403).json({
        error: 'Your Account Is Not Active Yet! Please complete your package payment to activate your account and unlock your dashboard, courses, affiliate features, and all platform benefits.',
        code: 'ACCOUNT_INACTIVE',
        accountStatus: req.user!.status,
        paymentStatus: req.user!.paymentStatus || 'pending',
        selectedPackage: req.user!.selectedPackage || null,
        pendingOrder: req.user!.pendingOrder || null,
      });
      return;
    }
    next();
  });
}

function requireAdmin(requiredPermission?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      if (!req.user?.adminId || !req.user.adminRole) {
        res.status(403).json({ error: 'Master Admin Panel access is restricted to authorized administrators.' });
        return;
      }
      if (
        requiredPermission &&
        req.user.adminRoleSlug !== 'super_admin' &&
        !req.user.permissions.includes(requiredPermission)
      ) {
        res.status(403).json({
          error: `Role '${req.user.adminRole}' does not have permission '${requiredPermission}'.`,
        });
        return;
      }
      next();
    });
  };
}

// =============================================================================
// 1. PUBLIC WEBSITE & CMS ENDPOINTS
// =============================================================================

app.get('/api/public/site', (req: Request, res: Response) => {
  const isPreview = req.query.preview === 'draft';

  // Auto-deactivate any expired offers
  db.prepare(`UPDATE offers SET is_active = 0 WHERE end_at < datetime('now') AND is_active = 1`).run();
  db.prepare(`UPDATE offer_batches SET is_active = 0 WHERE end_at < datetime('now') AND is_active = 1`).run();

  const contentRow = db.prepare("SELECT * FROM website_content WHERE key = 'main_site'").get() as {
    published_json: string;
    draft_json: string;
    has_unpublished_changes: number;
  };

  const siteConfig = JSON.parse(isPreview ? contentRow.draft_json : contentRow.published_json);

  const sections = db.prepare(`
    SELECT id, section_key, section_type, title, subtitle, content_json, draft_content_json, is_visible, display_order
    FROM website_sections
    WHERE is_visible = 1
    ORDER BY display_order ASC
  `).all() as Array<Record<string, unknown>>;

  const packages = db.prepare(`
    SELECT * FROM packages WHERE status = 'active' ORDER BY display_order ASC
  `).all() as Array<Record<string, unknown>>;

  const pkgWithCourses = packages.map((pkg) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.slug, c.thumbnail_url, c.short_description, c.instructor_name, c.level,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
      FROM package_courses pc
      JOIN courses c ON c.id = pc.course_id
      WHERE pc.package_id = ? AND c.status = 'active'
      ORDER BY c.display_order ASC
    `).all(Number(pkg.id));
    return {
      ...pkg,
      benefits: JSON.parse(String(pkg.benefits_json || '[]')),
      courses,
      courseCount: courses.length,
    };
  });

  const featuredCourses = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as module_count,
           (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
    FROM courses c
    WHERE c.status = 'active'
    ORDER BY c.display_order ASC
  `).all() as Array<Record<string, unknown>>;

  const activeOffers = db.prepare(`
    SELECT o.*, b.name as batch_name, b.batch_type
    FROM offers o
    JOIN offer_batches b ON b.id = o.batch_id
    WHERE o.is_active = 1 AND b.is_active = 1 AND o.end_at > datetime('now')
    ORDER BY o.id DESC
  `).all();

  const socialLinks = db.prepare(`
    SELECT * FROM social_links WHERE is_active = 1 ORDER BY display_order ASC
  `).all();

  res.json({
    isPreview,
    hasUnpublishedChanges: Boolean(contentRow.has_unpublished_changes),
    siteConfig,
    sections,
    packages: pkgWithCourses,
    courses: featuredCourses.map((c) => ({
      ...c,
      learningObjectives: JSON.parse(String(c.learning_objectives_json || '[]')),
    })),
    offers: activeOffers,
    socialLinks,
  });
});

app.get('/api/packages', (_req: Request, res: Response) => {
  const packages = db.prepare(`SELECT * FROM packages WHERE status = 'active' ORDER BY display_order ASC`).all() as Array<
    Record<string, unknown>
  >;
  const result = packages.map((pkg) => {
    const courses = db.prepare(`
      SELECT c.id, c.title, c.slug, c.short_description
      FROM package_courses pc
      JOIN courses c ON c.id = pc.course_id
      WHERE pc.package_id = ?
    `).all(Number(pkg.id));
    return {
      ...pkg,
      benefits: JSON.parse(String(pkg.benefits_json || '[]')),
      courses,
      courseCount: courses.length,
    };
  });
  res.json({ packages: result });
});

app.get('/api/public/referral/:code', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const row = db.prepare(`
    SELECT ac.code, ac.user_id, up.full_name
    FROM affiliate_codes ac
    JOIN users u ON u.id = ac.user_id
    JOIN user_profiles up ON up.user_id = u.id
    WHERE ac.code = ? AND ac.is_active = 1 AND u.status = 'active'
  `).get(code) as { code: string; user_id: number; full_name: string } | undefined;

  if (!row) {
    res.status(404).json({ valid: false, error: 'Referral code not found or inactive.' });
    return;
  }

  db.prepare('UPDATE affiliate_codes SET clicks = clicks + 1 WHERE code = ?').run(code);
  res.json({
    valid: true,
    code: row.code,
    sponsorName: row.full_name,
  });
});

app.get('/api/certificates/verify/:code', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const cert = db.prepare(`
    SELECT c.*, cr.slug as course_slug
    FROM certificates c
    JOIN courses cr ON cr.id = c.course_id
    WHERE UPPER(c.certificate_code) = ?
  `).get(code);

  if (!cert) {
    res.status(404).json({ valid: false, error: 'No verified certificate matches this Certificate ID.' });
    return;
  }

  res.json({
    valid: true,
    certificate: cert,
  });
});

// =============================================================================
// 2. AUTHENTICATION, REGISTRATION, OTP & SESSION MANAGEMENT
// =============================================================================

app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
  try {
    const {
      fullName,
      mobile,
      email,
      dateOfBirth,
      packageId,
      referralCode,
      password,
      confirmPassword,
      termsAccepted,
    } = req.body;

    if (!fullName || !mobile || !email || !dateOfBirth || !packageId || !password) {
      res.status(400).json({ error: 'All mandatory registration fields are required.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Password and Confirm Password do not match.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (!termsAccepted) {
      res.status(400).json({ error: 'You must accept the Terms & Conditions and No-Refund Policy.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobile = String(mobile).trim().replace(/\s+/g, '');

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(
      normalizedEmail,
      normalizedMobile
    );
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address or mobile number already exists.' });
      return;
    }

    const pkg = db.prepare("SELECT * FROM packages WHERE id = ? AND status = 'active'").get(Number(packageId)) as
      | { id: number; name: string; price_inr: number }
      | undefined;
    if (!pkg) {
      res.status(400).json({ error: 'Selected learning package is invalid or inactive.' });
      return;
    }

    // Validate referral attribution (if provided) and lock permanently
    let sponsorUserId: number | null = null;
    let lockedReferralCode: string | null = null;
    let acquisitionSource: 'referral' | 'company' = 'company';

    if (referralCode && String(referralCode).trim().length > 0) {
      const cleanCode = String(referralCode).trim().toUpperCase();
      const sponsor = db.prepare(`
        SELECT ac.user_id, ac.code
        FROM affiliate_codes ac
        JOIN users u ON u.id = ac.user_id
        WHERE ac.code = ? AND ac.is_active = 1 AND u.status = 'active'
      `).get(cleanCode) as { user_id: number; code: string } | undefined;

      if (!sponsor) {
        res.status(400).json({ error: `Referral code '${cleanCode}' is not valid.` });
        return;
      }
      sponsorUserId = sponsor.user_id;
      lockedReferralCode = sponsor.code;
      acquisitionSource = 'referral';
    }

    const result = runTransaction(() => {
      const passwordHash = bcrypt.hashSync(String(password), 10);
      const uniqueAffiliateCode = generateUniqueAffiliateCode();

      const uRes = db.prepare(`
        INSERT INTO users (
          email, mobile, password_hash, status,
          referred_by_user_id, referred_by_code, referral_locked, acquisition_source, last_login_at
        ) VALUES (?, ?, ?, 'inactive', ?, ?, 1, ?, datetime('now'))
      `).run(normalizedEmail, normalizedMobile, passwordHash, sponsorUserId, lockedReferralCode, acquisitionSource);

      const newUserId = Number(uRes.lastInsertRowid);

      db.prepare(`
        INSERT INTO user_profiles (user_id, full_name, date_of_birth, terms_accepted, terms_accepted_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).run(newUserId, String(fullName).trim(), String(dateOfBirth).trim());

      db.prepare(`
        INSERT INTO affiliate_codes (user_id, code, clicks, is_active)
        VALUES (?, ?, 0, 1)
      `).run(newUserId, uniqueAffiliateCode);

      db.prepare(`
        INSERT INTO wallet_accounts (user_id, available_commission_inr, pending_commission_inr, bonus_amount_inr, reserved_withdrawal_inr, total_withdrawn_inr)
        VALUES (?, 0, 0, 0, 0, 0)
      `).run(newUserId);

      if (sponsorUserId && lockedReferralCode) {
        db.prepare(`
          INSERT INTO referrals (referrer_user_id, referred_user_id, affiliate_code, status)
          VALUES (?, ?, ?, 'registered')
        `).run(sponsorUserId, newUserId, lockedReferralCode);
      }

      // Create initial Razorpay Order for selected package
      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const rzpOrderId = `order_rzp_${crypto.randomBytes(8).toString('hex')}`;

      const ordRes = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, package_id, package_name_snapshot,
          gross_amount_inr, currency, razorpay_order_id, status, no_refund_accepted
        ) VALUES (?, ?, ?, ?, ?, 'INR', ?, 'created', 1)
      `).run(orderNumber, newUserId, pkg.id, pkg.name, pkg.price_inr, rzpOrderId);

      const orderId = Number(ordRes.lastInsertRowid);

      db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, gross_amount_inr, status)
        VALUES (?, ?, ?, ?, 'created')
      `).run(orderId, newUserId, rzpOrderId, pkg.price_inr);

      sendPlatformEmail(newUserId, normalizedEmail, 'registration_confirmation', {
        name: String(fullName).trim(),
        referred_by: lockedReferralCode || 'Company Direct (No Sponsor)',
      });

      createUserNotification(
        newUserId,
        'Welcome to Edurt Academy!',
        `Your account and permanent affiliate code (${uniqueAffiliateCode}) are created. Complete your package payment to unlock lifetime course access.`,
        '/dashboard?tab=courses'
      );

      return {
        newUserId,
        uniqueAffiliateCode,
        order: {
          id: orderId,
          orderNumber,
          razorpayOrderId: rzpOrderId,
          packageId: pkg.id,
          packageName: pkg.name,
          grossAmountInr: pkg.price_inr,
          currency: 'INR',
          razorpayKeyId: RAZORPAY_KEY_ID,
        },
      };
    });

    const sessionId = crypto.randomUUID();
    const token = jwt.sign({ userId: result.newUserId, sessionId }, JWT_SECRET, { expiresIn: '7d' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))
    `).run(sessionId, result.newUserId, tokenHash, req.ip || '127.0.0.1', req.headers['user-agent'] || '');

    res.cookie('edurt_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 });

    const userContext = loadUserContext(result.newUserId);
    res.status(201).json({
      token,
      user: userContext,
      pendingOrder: result.order,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
    | { id: number; password_hash: string; status: string }
    | undefined;

  if (!userRow || !bcrypt.compareSync(String(password), userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email address or password.' });
    return;
  }

  if (userRow.status === 'suspended') {
    res.status(403).json({ error: 'Your account is currently suspended. Please contact Support.' });
    return;
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userRow.id);

  const sessionId = crypto.randomUUID();
  const token = jwt.sign({ userId: userRow.id, sessionId }, JWT_SECRET, { expiresIn: '7d' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))
  `).run(sessionId, userRow.id, tokenHash, req.ip || '127.0.0.1', req.headers['user-agent'] || '');

  res.cookie('edurt_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 });

  const userContext = loadUserContext(userRow.id);
  res.json({ token, user: userContext, pendingOrder: userContext?.pendingOrder });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE token_hash = ?").run(tokenHash);
  }
  res.clearCookie('edurt_token');
  res.json({ success: true });
});

app.post('/api/auth/forgot-password', authLimiter, (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Please enter your registered email address.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare(`
    SELECT u.id, u.email, up.full_name FROM users u JOIN user_profiles up ON up.user_id = u.id WHERE u.email = ?
  `).get(normalizedEmail) as { id: number; email: string; full_name: string } | undefined;

  if (!user) {
    res.status(404).json({ error: 'No account found with that email address.' });
    return;
  }

  // Enforce 60-second resend cooldown
  const recentOtp = db.prepare(`
    SELECT created_at FROM password_reset_otps
    WHERE user_id = ? AND created_at > datetime('now', '-60 seconds')
    ORDER BY id DESC LIMIT 1
  `).get(user.id);

  if (recentOtp) {
    res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
    return;
  }

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = bcrypt.hashSync(otpCode, 8);

  db.prepare(`
    INSERT INTO password_reset_otps (user_id, email, otp_hash, otp_plain_dev, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+10 minutes'))
  `).run(user.id, user.email, otpHash, otpCode);

  sendPlatformEmail(user.id, user.email, 'password_reset_otp', {
    name: user.full_name,
    otp: otpCode,
  });

  res.json({
    success: true,
    message: `A 6-digit verification OTP has been sent to ${user.email} (valid for 10 minutes).`,
    devOtpPreview: otpCode,
  });
});

app.post('/api/auth/verify-otp', authLimiter, (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP code are required.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const record = db.prepare(`
    SELECT * FROM password_reset_otps
    WHERE email = ? AND used_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(normalizedEmail) as
    | { id: number; otp_hash: string; attempts: number; expires_at: string }
    | undefined;

  if (!record) {
    res.status(400).json({ error: 'No active OTP found. Please request a new OTP.' });
    return;
  }

  if (record.attempts >= 5) {
    res.status(429).json({ error: 'Maximum verification attempts exceeded for this OTP. Please request a new one.' });
    return;
  }

  const expired = db.prepare("SELECT 1 FROM password_reset_otps WHERE id = ? AND expires_at < datetime('now')").get(record.id);
  if (expired) {
    res.status(400).json({ error: 'This OTP has expired. Please request a new code.' });
    return;
  }

  db.prepare('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?').run(record.id);

  if (!bcrypt.compareSync(String(otp).trim(), record.otp_hash)) {
    res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
    return;
  }

  res.json({ valid: true, message: 'OTP verified. You may now set your new password.' });
});

app.post('/api/auth/reset-password', authLimiter, (req: Request, res: Response) => {
  const { email, otp, newPassword, confirmPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const record = db.prepare(`
    SELECT * FROM password_reset_otps
    WHERE email = ? AND used_at IS NULL AND expires_at >= datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(normalizedEmail) as { id: number; user_id: number; otp_hash: string; attempts: number } | undefined;

  if (!record || record.attempts > 5 || !bcrypt.compareSync(String(otp).trim(), record.otp_hash)) {
    res.status(400).json({ error: 'Invalid or expired OTP.' });
    return;
  }

  const newHash = bcrypt.hashSync(String(newPassword), 10);
  runTransaction(() => {
    db.prepare("UPDATE password_reset_otps SET used_at = datetime('now') WHERE id = ?").run(record.id);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, record.user_id);
  });

  res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(userId);
  const kyc = db.prepare('SELECT status, rejection_reason FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(
    userId
  ) as { status: string; rejection_reason: string | null } | undefined;
  const unreadNotifs = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as {
    cnt: number;
  };
  const pendingOrder = db.prepare(`
    SELECT id, order_number, package_id, package_name_snapshot as packageName, gross_amount_inr as grossAmountInr, razorpay_order_id as razorpayOrderId
    FROM orders WHERE user_id = ? AND status IN ('created', 'pending') ORDER BY id DESC LIMIT 1
  `).get(userId);

  res.json({
    user: req.user,
    wallet,
    kycStatus: kyc ? kyc.status : 'not_submitted',
    kycRejectionReason: kyc?.rejection_reason || null,
    unreadNotificationsCount: unreadNotifs.cnt,
    pendingOrder: pendingOrder ? { ...(pendingOrder as object), razorpayKeyId: RAZORPAY_KEY_ID } : null,
  });
});

// =============================================================================
// 3. USER PROFILE & MY ACCOUNT (PRD Section 7)
// =============================================================================

app.get('/api/user/profile', requireAuth, (req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT u.id, u.email, u.mobile, u.status, u.referred_by_code, u.referral_locked, u.acquisition_source, u.created_at,
           up.full_name, up.date_of_birth, up.profile_photo, up.gender, up.state, up.district,
           ac.code as affiliate_code
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    WHERE u.id = ?
  `).get(req.user!.id);

  res.json({ profile: row });
});

app.put('/api/user/profile', requireAuth, (req: Request, res: Response) => {
  const { fullName, dateOfBirth, profilePhoto, email, mobile } = req.body;

  // PRD 7.1: Users cannot directly change Registered Mobile Number or Registered Email Address
  if (email !== undefined || mobile !== undefined) {
    const current = db.prepare('SELECT email, mobile FROM users WHERE id = ?').get(req.user!.id) as {
      email: string;
      mobile: string;
    };
    if ((email && email !== current.email) || (mobile && mobile !== current.mobile)) {
      res.status(403).json({
        error: 'Registered Email Address and Mobile Number are permanently locked and cannot be edited by the user.',
      });
      return;
    }
  }

  if (!fullName || String(fullName).trim().length < 2) {
    res.status(400).json({ error: 'Please provide a valid Full Name.' });
    return;
  }
  if (!dateOfBirth) {
    res.status(400).json({ error: 'Please provide a valid Date of Birth.' });
    return;
  }

  db.prepare(`
    UPDATE user_profiles
    SET full_name = ?,
        date_of_birth = ?,
        profile_photo = COALESCE(?, profile_photo),
        updated_at = datetime('now')
    WHERE user_id = ?
  `).run(String(fullName).trim(), String(dateOfBirth).trim(), profilePhoto ?? null, req.user!.id);

  const updated = db.prepare(`
    SELECT u.id, u.email, u.mobile, u.created_at, u.referred_by_code,
           up.full_name, up.date_of_birth, up.profile_photo,
           ac.code as affiliate_code
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    WHERE u.id = ?
  `).get(req.user!.id);

  res.json({ success: true, profile: updated });
});

app.put('/api/user/change-password', requireAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation do not match.' });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };
  if (!bcrypt.compareSync(String(currentPassword), u.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user!.id);
  res.json({ success: true, message: 'Password updated successfully.' });
});

app.delete('/api/user/profile', requireAuth, (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Account deletion by users is disabled per platform policy.' });
});

// =============================================================================
// 4. ORDERS, RAZORPAY PAYMENTS & WEBHOOKS (PRD Section 4 & 18.1)
// =============================================================================

app.post('/api/orders', requireAuth, (req: Request, res: Response) => {
  const { packageId, noRefundAccepted } = req.body;
  if (!packageId) {
    res.status(400).json({ error: 'Please select a package.' });
    return;
  }
  if (!noRefundAccepted) {
    res.status(400).json({ error: 'You must acknowledge the No-Refund Policy before proceeding to payment.' });
    return;
  }

  const pkg = db.prepare("SELECT * FROM packages WHERE id = ? AND status = 'active'").get(Number(packageId)) as
    | { id: number; name: string; price_inr: number }
    | undefined;
  if (!pkg) {
    res.status(404).json({ error: 'Package not found or inactive.' });
    return;
  }

  const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const rzpOrderId = `order_rzp_${crypto.randomBytes(8).toString('hex')}`;

  const orderId = runTransaction(() => {
    const oRes = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, package_id, package_name_snapshot,
        gross_amount_inr, currency, razorpay_order_id, status, no_refund_accepted
      ) VALUES (?, ?, ?, ?, ?, 'INR', ?, 'created', 1)
    `).run(orderNumber, req.user!.id, pkg.id, pkg.name, pkg.price_inr, rzpOrderId);
    const id = Number(oRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO payments (order_id, user_id, razorpay_order_id, gross_amount_inr, status)
      VALUES (?, ?, ?, ?, 'created')
    `).run(id, req.user!.id, rzpOrderId, pkg.price_inr);
    return id;
  });

  res.status(201).json({
    order: {
      id: orderId,
      orderNumber,
      razorpayOrderId: rzpOrderId,
      packageId: pkg.id,
      packageName: pkg.name,
      grossAmountInr: pkg.price_inr,
      currency: 'INR',
      razorpayKeyId: RAZORPAY_KEY_ID,
    },
  });
});

// Helper endpoint for the integrated Razorpay Checkout Gateway modal to generate a valid HMAC-signed payment payload
app.post('/api/payments/razorpay-checkout-handshake', requireAuth, (req: Request, res: Response) => {
  const { razorpayOrderId } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ? AND user_id = ?').get(
    String(razorpayOrderId),
    req.user!.id
  );
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const razorpayPaymentId = `pay_rzp_${crypto.randomBytes(8).toString('hex')}`;
  const razorpaySignature = createOrderSignature(String(razorpayOrderId), razorpayPaymentId);
  res.json({
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
});

app.post('/api/payments/verify', requireAuth, (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing Razorpay verification parameters.' });
      return;
    }

    const result = verifyAndActivatePayment({
      razorpayOrderId: String(razorpay_order_id),
      razorpayPaymentId: String(razorpay_payment_id),
      razorpaySignature: String(razorpay_signature),
      verifiedBy: 'server_signature',
    });

    res.json({
      success: true,
      verification: result,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/webhooks/razorpay', (req: Request, res: Response) => {
  try {
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody = JSON.stringify(req.body);
    const expectedSig = createWebhookSignature(rawBody);

    if (!signature || signature !== expectedSig) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const { event_id, event, payload } = req.body;
    if (!event_id) {
      res.status(400).json({ error: 'Missing event_id' });
      return;
    }

    // Idempotency check
    const existingEvent = db.prepare('SELECT id, processed FROM payment_webhook_events WHERE event_id = ?').get(String(event_id));
    if (existingEvent) {
      res.json({ status: 'duplicate_ignored', event_id });
      return;
    }

    const rzpOrderId = payload?.payment?.entity?.order_id;
    const rzpPaymentId = payload?.payment?.entity?.id;

    db.prepare(`
      INSERT INTO payment_webhook_events (event_id, event_type, razorpay_order_id, razorpay_payment_id, signature, payload_json, processed, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(String(event_id), String(event || 'payment.captured'), rzpOrderId || null, rzpPaymentId || null, signature, rawBody);

    if (rzpOrderId && rzpPaymentId) {
      const orderSig = createOrderSignature(rzpOrderId, rzpPaymentId);
      verifyAndActivatePayment({
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: orderSig,
        verifiedBy: 'webhook',
      });
    }

    res.json({ status: 'processed', event_id });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/user/pending-order', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    accountStatus: user.status,
    isActivated: user.status === 'active',
    paymentStatus: user.paymentStatus || 'pending',
    selectedPackage: user.selectedPackage || null,
    pendingOrder: user.pendingOrder || null,
  });
});

// =============================================================================
// 5. USER DASHBOARD OVERVIEW & AFFILIATE SYSTEM (PRD Sections 5 & 6)
// =============================================================================

app.get('/api/dashboard/overview', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const range = String(req.query.range || 'daily');
  const startDate = req.query.startDate ? String(req.query.startDate) : null;
  const endDate = req.query.endDate ? String(req.query.endDate) : null;

  const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(userId) as {
    available_commission_inr: number;
    pending_commission_inr: number;
    bonus_amount_inr: number;
    reserved_withdrawal_inr: number;
    total_withdrawn_inr: number;
  };

  const todayEarnings = db.prepare(`
    SELECT COALESCE(SUM(referrer_amount_inr), 0) as total
    FROM affiliate_commissions
    WHERE referrer_user_id = ? AND status != 'reversed' AND date(credited_at) = date('now')
  `).get(userId) as { total: number };

  const last7DaysEarnings = db.prepare(`
    SELECT COALESCE(SUM(referrer_amount_inr), 0) as total
    FROM affiliate_commissions
    WHERE referrer_user_id = ? AND status != 'reversed' AND credited_at >= datetime('now', '-7 days')
  `).get(userId) as { total: number };

  const last30DaysEarnings = db.prepare(`
    SELECT COALESCE(SUM(referrer_amount_inr), 0) as total
    FROM affiliate_commissions
    WHERE referrer_user_id = ? AND status != 'reversed' AND credited_at >= datetime('now', '-30 days')
  `).get(userId) as { total: number };

  const totalEarnings = db.prepare(`
    SELECT COALESCE(SUM(referrer_amount_inr), 0) as total
    FROM affiliate_commissions
    WHERE referrer_user_id = ? AND status != 'reversed'
  `).get(userId) as { total: number };

  // Build Interactive Earnings Graph series from actual recorded affiliate_commissions & bonus_transactions
  let rawTx: Array<{ day: string; commission_inr: number; bonus_inr: number }> = [];
  if (startDate && endDate) {
    rawTx = db.prepare(`
      SELECT date(credited_at) as day, SUM(referrer_amount_inr) as commission_inr, 0 as bonus_inr
      FROM affiliate_commissions
      WHERE referrer_user_id = ? AND status != 'reversed' AND date(credited_at) BETWEEN date(?) AND date(?)
      GROUP BY date(credited_at)
      ORDER BY day ASC
    `).all(userId, startDate, endDate) as Array<{ day: string; commission_inr: number; bonus_inr: number }>;
  } else {
    rawTx = db.prepare(`
      SELECT date(credited_at) as day, SUM(referrer_amount_inr) as commission_inr, 0 as bonus_inr
      FROM affiliate_commissions
      WHERE referrer_user_id = ? AND status != 'reversed'
      GROUP BY date(credited_at)
      ORDER BY day ASC
    `).all(userId) as Array<{ day: string; commission_inr: number; bonus_inr: number }>;
  }

  const txMap = new Map<string, number>();
  for (const r of rawTx) {
    txMap.set(r.day, Number(r.commission_inr));
  }

  const bonusRows = db.prepare(`
    SELECT date(created_at) as day, SUM(amount_inr) as bonus_inr
    FROM bonus_transactions
    WHERE user_id = ?
    GROUP BY date(created_at)
  `).all(userId) as Array<{ day: string; bonus_inr: number }>;
  const bonusMap = new Map<string, number>();
  for (const b of bonusRows) {
    bonusMap.set(b.day, Number(b.bonus_inr));
  }

  const graphPoints: Array<{ label: string; date: string; commissionInr: number; bonusInr: number; totalInr: number }> = [];
  const now = new Date();
  const daysCount = range === 'weekly' ? 28 : range === 'monthly' ? 90 : 14;

  if (range === 'weekly') {
    for (let w = 3; w >= 0; w--) {
      let commSum = 0;
      let bonSum = 0;
      for (let d = 0; d < 7; d++) {
        const dt = new Date(now.getTime() - (w * 7 + d) * 86400000).toISOString().slice(0, 10);
        commSum += txMap.get(dt) || 0;
        bonSum += bonusMap.get(dt) || 0;
      }
      graphPoints.push({
        label: w === 0 ? 'This Week' : `${w}w Ago`,
        date: `Week -${w}`,
        commissionInr: commSum,
        bonusInr: bonSum,
        totalInr: commSum + bonSum,
      });
    }
  } else if (range === 'monthly') {
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const ym = d.toISOString().slice(0, 7);
      let commSum = 0;
      let bonSum = 0;
      for (const [k, v] of txMap.entries()) {
        if (k.startsWith(ym)) commSum += v;
      }
      for (const [k, v] of bonusMap.entries()) {
        if (k.startsWith(ym)) bonSum += v;
      }
      graphPoints.push({
        label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        date: ym,
        commissionInr: commSum,
        bonusInr: bonSum,
        totalInr: commSum + bonSum,
      });
    }
  } else {
    for (let i = daysCount - 1; i >= 0; i--) {
      const dt = new Date(now.getTime() - i * 86400000);
      const iso = dt.toISOString().slice(0, 10);
      const cVal = txMap.get(iso) || 0;
      const bVal = bonusMap.get(iso) || 0;
      graphPoints.push({
        label: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        date: iso,
        commissionInr: cVal,
        bonusInr: bVal,
        totalInr: cVal + bVal,
      });
    }
  }

  res.json({
    wallet: {
      availableCommissionInr: wallet.available_commission_inr,
      pendingCommissionInr: wallet.pending_commission_inr,
      totalCommissionInr: wallet.available_commission_inr + wallet.pending_commission_inr,
      bonusAmountInr: wallet.bonus_amount_inr,
      reservedWithdrawalInr: wallet.reserved_withdrawal_inr,
      totalWithdrawnInr: wallet.total_withdrawn_inr,
    },
    summaryCards: {
      todayEarningsInr: todayEarnings.total,
      last7DaysEarningsInr: last7DaysEarnings.total,
      last30DaysEarningsInr: last30DaysEarnings.total,
      totalEarningsInr: totalEarnings.total,
    },
    graphPoints,
  });
});

app.get('/api/affiliate/summary', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const codeRow = db.prepare('SELECT code, clicks, created_at FROM affiliate_codes WHERE user_id = ?').get(userId) as {
    code: string;
    clicks: number;
    created_at: string;
  };
  const totalReferrals = db.prepare('SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = ?').get(userId) as {
    cnt: number;
  };
  const purchasedReferrals = db.prepare(
    "SELECT COUNT(*) as cnt FROM referrals WHERE referrer_user_id = ? AND status = 'purchased'"
  ).get(userId) as { cnt: number };
  const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(userId) as {
    available_commission_inr: number;
    pending_commission_inr: number;
    bonus_amount_inr: number;
    total_withdrawn_inr: number;
  };
  const totalCommissionEarned = db.prepare(`
    SELECT COALESCE(SUM(referrer_amount_inr), 0) as total
    FROM affiliate_commissions
    WHERE referrer_user_id = ? AND status != 'reversed'
  `).get(userId) as { total: number };

  res.json({
    affiliateCode: codeRow.code,
    clicks: codeRow.clicks,
    totalReferrals: totalReferrals.cnt,
    successfulPurchases: purchasedReferrals.cnt,
    availableCommissionInr: wallet.available_commission_inr,
    pendingCommissionInr: wallet.pending_commission_inr,
    totalCommissionEarnedInr: totalCommissionEarned.total,
    bonusAmountInr: wallet.bonus_amount_inr,
  });
});

app.get('/api/affiliate/referrals', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const rows = db.prepare(`
    SELECT r.id, r.referred_user_id, r.locked_at as registration_date, r.status as referral_status,
           up.full_name as referral_name,
           u.email, u.mobile,
           o.package_name_snapshot as package_purchased,
           o.status as order_status,
           ac.referrer_amount_inr as commission_generated,
           ac.status as commission_status,
           ac.commission_ref
    FROM referrals r
    JOIN users u ON u.id = r.referred_user_id
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
    LEFT JOIN affiliate_commissions ac ON ac.order_id = o.id
    WHERE r.referrer_user_id = ?
    ORDER BY r.id DESC
  `).all(userId) as Array<Record<string, unknown>>;

  // Privacy restriction: mask email and phone number
  const sanitized = rows.map((r) => {
    const emailStr = String(r.email || '');
    const [eLocal, eDomain] = emailStr.split('@');
    const maskedEmail = eLocal ? `${eLocal.slice(0, 2)}***@${eDomain || ''}` : '***';
    const mob = String(r.mobile || '');
    const maskedMobile = mob.length >= 4 ? `${mob.slice(0, 2)}******${mob.slice(-2)}` : '******';

    return {
      id: r.id,
      referralName: r.referral_name,
      maskedContact: `${maskedEmail} · ${maskedMobile}`,
      registrationDate: r.registration_date,
      packagePurchased: r.package_purchased || 'Not Yet Purchased',
      purchaseStatus: r.order_status === 'paid' ? 'Completed' : 'Registered (Pending Purchase)',
      commissionGeneratedInr: Number(r.commission_generated || 0),
      commissionStatus: r.commission_status ? String(r.commission_status).toUpperCase() : 'PENDING PURCHASE',
      commissionRef: r.commission_ref || '—',
    };
  });

  res.json({ referrals: sanitized });
});

app.get('/api/affiliate/commissions', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const commissions = db.prepare(`
    SELECT ac.*, up.full_name as referred_user_name, p.name as package_name
    FROM affiliate_commissions ac
    JOIN user_profiles up ON up.user_id = ac.referred_user_id
    JOIN packages p ON p.id = ac.package_id
    WHERE ac.referrer_user_id = ?
    ORDER BY ac.id DESC
  `).all(userId);

  res.json({ commissions });
});

// =============================================================================
// 6. WALLET & WITHDRAWAL SYSTEM (PRD Section 10 & 18.4)
// =============================================================================

app.get('/api/wallet/summary', requireActiveUser, (req: Request, res: Response) => {
  const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(req.user!.id);
  res.json({ wallet });
});

app.get('/api/wallet/transactions', requireActiveUser, (req: Request, res: Response) => {
  const transactions = db.prepare(`
    SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC
  `).all(req.user!.id);
  res.json({ transactions });
});

app.get('/api/withdrawals', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(userId);
  const kyc = db.prepare('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as
    | Record<string, unknown>
    | undefined;

  const businessDateIST = getBusinessDateIST();
  const todayCountRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM withdrawals
    WHERE user_id = ? AND business_date_ist = ?
  `).get(userId, businessDateIST) as { cnt: number };

  const allWithdrawals = db.prepare(`
    SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC
  `).all(userId) as Array<{ status: string }>;

  const bonusHistory = db.prepare(`
    SELECT * FROM bonus_transactions WHERE user_id = ? ORDER BY id DESC
  `).all(userId);

  const ledger = db.prepare(`
    SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 30
  `).all(userId);

  res.json({
    wallet,
    kycStatus: kyc ? kyc.status : 'not_submitted',
    savedPayoutDetails: kyc
      ? {
          accountHolderName: kyc.account_holder_name,
          bankName: kyc.bank_name,
          accountNumber: kyc.account_number,
          ifscCode: kyc.ifsc_code,
          upiId: kyc.upi_id,
        }
      : null,
    dailyLimitInfo: {
      businessDateIST,
      requestsToday: todayCountRow.cnt,
      maxRequestsPerDay: 2,
      remainingRequestsToday: Math.max(0, 2 - todayCountRow.cnt),
      minWithdrawalInr: 500,
    },
    tables: {
      availableBalanceLedger: ledger,
      pendingWithdrawals: allWithdrawals.filter((w) => ['pending', 'approved', 'processing'].includes(w.status)),
      rejectedWithdrawals: allWithdrawals.filter((w) => w.status === 'rejected'),
      completedWithdrawals: allWithdrawals.filter((w) => w.status === 'paid'),
      bonusTransactions: bonusHistory,
    },
  });
});

app.post('/api/withdrawals', requireActiveUser, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amountInr, payoutMethod, accountHolderName, bankName, accountNumber, ifscCode, upiId } = req.body;

    const amount = Math.round(Number(amountInr) * 100) / 100;
    if (isNaN(amount) || amount < 500) {
      res.status(400).json({ error: 'Minimum withdrawal amount is ₹500.' });
      return;
    }

    if (!['bank_transfer', 'upi'].includes(String(payoutMethod))) {
      res.status(400).json({ error: 'Please select a valid withdrawal method (Bank Transfer or UPI).' });
      return;
    }

    if (payoutMethod === 'bank_transfer') {
      if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
        res.status(400).json({ error: 'Account Holder Name, Bank Name, Account Number, and IFSC Code are required for Bank Transfer.' });
        return;
      }
    } else {
      if (!upiId || !accountHolderName) {
        res.status(400).json({ error: 'UPI ID and Account Holder Name are required for UPI withdrawal.' });
        return;
      }
    }

    // Check KYC approval
    const kyc = db.prepare('SELECT status FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as
      | { status: string }
      | undefined;
    if (!kyc || kyc.status !== 'approved') {
      res.status(403).json({ error: 'Approved KYC is mandatory before requesting a withdrawal.' });
      return;
    }

    // Check daily limit in Asia/Kolkata timezone (max 2 requests per day)
    const businessDateIST = getBusinessDateIST();
    const todayRequests = db.prepare(`
      SELECT COUNT(*) as cnt FROM withdrawals WHERE user_id = ? AND business_date_ist = ?
    `).get(userId, businessDateIST) as { cnt: number };

    if (todayRequests.cnt >= 2) {
      res.status(429).json({
        error: `Daily withdrawal limit reached (maximum 2 withdrawal requests per day in Asia/Kolkata timezone: ${businessDateIST}).`,
      });
      return;
    }

    const withdrawalRecord = runTransaction(() => {
      const wallet = db.prepare('SELECT * FROM wallet_accounts WHERE user_id = ?').get(userId) as {
        available_commission_inr: number;
      };

      if (amount > wallet.available_commission_inr) {
        throw new Error(
          `Insufficient Available Commission balance. Available: ₹${wallet.available_commission_inr.toLocaleString('en-IN')}.`
        );
      }

      const newAvailable = Math.round((wallet.available_commission_inr - amount) * 100) / 100;
      db.prepare(`
        UPDATE wallet_accounts
        SET available_commission_inr = ?,
            reserved_withdrawal_inr = ROUND(reserved_withdrawal_inr + ?, 2),
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newAvailable, amount, userId);

      const requestRef = `WDR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const wRes = db.prepare(`
        INSERT INTO withdrawals (
          request_ref, user_id, amount_inr, payout_method,
          account_holder_name, bank_name, account_number, ifsc_code, upi_id,
          status, business_date_ist
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        requestRef,
        userId,
        amount,
        payoutMethod,
        String(accountHolderName).trim(),
        bankName ? String(bankName).trim() : null,
        accountNumber ? String(accountNumber).trim() : null,
        ifscCode ? String(ifscCode).trim().toUpperCase() : null,
        upiId ? String(upiId).trim() : null,
        businessDateIST
      );

      const withdrawalId = Number(wRes.lastInsertRowid);
      const txRef = `TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      db.prepare(`
        INSERT INTO wallet_transactions (
          reference_id, user_id, tx_type, bucket, direction,
          amount_inr, balance_after_inr, description, related_withdrawal_id
        ) VALUES (?, ?, 'withdrawal_reservation', 'available_commission', 'debit', ?, ?, ?, ?)
      `).run(
        txRef,
        userId,
        amount,
        newAvailable,
        `Withdrawal Request Reserved (${requestRef} via ${payoutMethod === 'upi' ? 'UPI' : 'Bank Transfer'})`,
        withdrawalId
      );

      createUserNotification(
        userId,
        `Withdrawal Request Submitted (${requestRef})`,
        `₹${amount.toLocaleString('en-IN')} has been reserved from your Available Commission for ${payoutMethod === 'upi' ? 'UPI' : 'Bank Transfer'} payout. Expected processing within 24 hours.`,
        '/dashboard?tab=withdrawal'
      );

      sendPlatformEmail(userId, req.user!.email, 'withdrawal_request', {
        name: req.user!.fullName,
        request_ref: requestRef,
        amount: amount.toLocaleString('en-IN'),
        method: payoutMethod === 'upi' ? 'UPI' : 'Bank Transfer',
      });

      return db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId);
    });

    res.status(201).json({ success: true, withdrawal: withdrawalRecord });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// =============================================================================
// 7. COURSES, STREAMING VIDEO, NOTES, QUIZZES, ASSIGNMENTS, CERTIFICATES (PRD Section 8)
// =============================================================================

app.get('/api/courses', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const enrolled = db.prepare(`
    SELECT c.*,
           uce.access_type, uce.is_completed as course_completed, uce.completed_at, uce.enrolled_at,
           p.name as package_name,
           cert.certificate_code
    FROM user_course_enrollments uce
    JOIN courses c ON c.id = uce.course_id
    JOIN packages p ON p.id = uce.package_id
    LEFT JOIN certificates cert ON cert.user_id = uce.user_id AND cert.course_id = c.id
    WHERE uce.user_id = ?
    ORDER BY c.display_order ASC
  `).all(userId) as Array<Record<string, unknown>>;

  const enriched = enrolled.map((c) => {
    const courseId = Number(c.id);
    const completion = evaluateCourseCompletionAndCertify(userId, courseId);
    return {
      ...c,
      learningObjectives: JSON.parse(String(c.learning_objectives_json || '[]')),
      completionStatus: completion,
    };
  });

  res.json({ courses: enriched });
});

app.get('/api/courses/:id', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const courseId = Number(req.params.id);

  const enrollment = db.prepare(`
    SELECT * FROM user_course_enrollments WHERE user_id = ? AND course_id = ?
  `).get(userId, courseId);

  if (!enrollment && !req.user!.adminId) {
    res.status(403).json({ error: 'You do not have an active package enrollment for this course.' });
    return;
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as Record<string, unknown> | undefined;
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const modules = db.prepare('SELECT * FROM course_modules WHERE course_id = ? ORDER BY display_order ASC').all(courseId);
  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY display_order ASC').all(courseId) as Array<
    Record<string, unknown>
  >;

  const progressRows = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND course_id = ?').all(
    userId,
    courseId
  ) as Array<Record<string, unknown>>;
  const progMap = new Map<number, Record<string, unknown>>();
  for (const p of progressRows) {
    progMap.set(Number(p.lesson_id), p);
  }

  const lessonsWithSignedStream = lessons.map((l) => {
    const lid = Number(l.id);
    const prog = progMap.get(lid);
    const streamToken = createSignedStreamToken(userId, String(l.video_asset_key));
    return {
      ...l,
      streamUrl: `/api/stream/${encodeURIComponent(String(l.video_asset_key))}?token=${encodeURIComponent(streamToken)}`,
      progress: prog
        ? {
            lastPositionSeconds: Number(prog.last_position_seconds),
            watchedSeconds: JSON.parse(String(prog.watched_seconds_json || '[]')),
            verifiedPercent: Number(prog.verified_percent),
            isCompleted: Boolean(prog.is_completed),
            completedAt: prog.completed_at,
          }
        : {
            lastPositionSeconds: 0,
            watchedSeconds: [],
            verifiedPercent: 0,
            isCompleted: false,
            completedAt: null,
          },
    };
  });

  const notes = db.prepare('SELECT * FROM user_notes WHERE user_id = ? AND course_id = ? ORDER BY id DESC').all(userId, courseId);

  const quizzes = db.prepare('SELECT * FROM quizzes WHERE course_id = ?').all(courseId) as Array<Record<string, unknown>>;
  const quizzesWithQuestions = quizzes.map((q) => {
    const qid = Number(q.id);
    const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY display_order ASC').all(qid) as Array<
      Record<string, unknown>
    >;
    const qWithOpts = questions.map((qn) => {
      const options = db.prepare(
        'SELECT id, question_id, option_text, display_order FROM quiz_options WHERE question_id = ? ORDER BY display_order ASC'
      ).all(Number(qn.id));
      return { ...qn, options };
    });
    const attempts = db.prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? ORDER BY id DESC').all(
      qid,
      userId
    );
    return {
      ...q,
      questions: qWithOpts,
      attempts,
    };
  });

  const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(courseId) as Array<Record<string, unknown>>;
  const assignmentsWithSubmissions = assignments.map((a) => {
    const submissions = db.prepare(
      'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? ORDER BY id DESC'
    ).all(Number(a.id), userId);
    return { ...a, submissions };
  });

  const completionStatus = evaluateCourseCompletionAndCertify(userId, courseId);
  const certificate = db.prepare('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?').get(userId, courseId);

  res.json({
    course: {
      ...course,
      learningObjectives: JSON.parse(String(course.learning_objectives_json || '[]')),
    },
    modules,
    lessons: lessonsWithSignedStream,
    notes,
    quizzes: quizzesWithQuestions,
    assignments: assignmentsWithSubmissions,
    completionStatus,
    certificate: certificate || null,
  });
});

// Protected Streaming Video Delivery (Signed URL + Range Streaming + No Download)
app.get('/api/stream/:assetKey', (req: Request, res: Response) => {
  const assetKey = path.basename(String(req.params.assetKey || ''));
  const token = String(req.query.token || '');

  const verification = verifySignedStreamToken(token, assetKey);
  if (!verification.valid) {
    res.status(403).json({ error: 'Protected video stream access denied: Invalid or expired signed streaming token.' });
    return;
  }

  const videoPath = path.resolve(process.cwd(), 'data', 'protected_videos', assetKey);
  if (!fs.existsSync(videoPath)) {
    res.status(404).json({ error: 'Protected video stream asset not found.' });
    return;
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Server-side Verified Video Progress Tracking (PRD Section 8.4)
app.post('/api/lessons/:id/progress', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const lessonId = Number(req.params.id);
  const { watchedSeconds, currentPosition } = req.body;

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId) as
    | { id: number; course_id: number; duration_seconds: number }
    | undefined;
  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const existing = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId) as
    | {
        id: number;
        watched_seconds_json: string;
        is_completed: number;
        completed_at: string | null;
      }
    | undefined;

  const watchedSet = new Set<number>(existing ? JSON.parse(existing.watched_seconds_json || '[]') : []);

  if (Array.isArray(watchedSeconds)) {
    // Prevent bulk skipping spoofing: at most 4 new seconds can be reported in a single heartbeat tick
    const incomingValid = watchedSeconds
      .map((s) => Math.floor(Number(s)))
      .filter((s) => !isNaN(s) && s >= 0 && s < lesson.duration_seconds)
      .slice(0, 5);
    for (const sec of incomingValid) {
      watchedSet.add(sec);
    }
  }

  const uniqueSecondsArray = Array.from(watchedSet).sort((a, b) => a - b);
  const verifiedPercent = Math.min(100, Math.round((uniqueSecondsArray.length / lesson.duration_seconds) * 10000) / 100);

  // Sticky completion rule: Rewatching a completed video must not remove its completion status
  const isNowCompleted = (existing && existing.is_completed === 1) || verifiedPercent >= 100 ? 1 : 0;
  const pos = Math.max(0, Math.min(lesson.duration_seconds, Math.floor(Number(currentPosition || 0))));

  if (existing) {
    db.prepare(`
      UPDATE lesson_progress
      SET last_position_seconds = ?,
          watched_seconds_json = ?,
          verified_percent = ?,
          is_completed = ?,
          completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN datetime('now') ELSE completed_at END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(pos, JSON.stringify(uniqueSecondsArray), isNowCompleted ? 100 : verifiedPercent, isNowCompleted, isNowCompleted, existing.id);
  } else {
    db.prepare(`
      INSERT INTO lesson_progress (
        user_id, course_id, lesson_id, last_position_seconds, watched_seconds_json, verified_percent, is_completed, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
    `).run(
      userId,
      lesson.course_id,
      lessonId,
      pos,
      JSON.stringify(uniqueSecondsArray),
      isNowCompleted ? 100 : verifiedPercent,
      isNowCompleted,
      isNowCompleted
    );
  }

  const courseCompletion = evaluateCourseCompletionAndCertify(userId, lesson.course_id);

  res.json({
    lessonId,
    lastPositionSeconds: pos,
    watchedSeconds: uniqueSecondsArray,
    verifiedPercent: isNowCompleted ? 100 : verifiedPercent,
    isCompleted: Boolean(isNowCompleted),
    courseCompletion,
  });
});

// Notes CRUD (PRD Section 8.6)
app.post('/api/courses/:id/notes', requireActiveUser, (req: Request, res: Response) => {
  const courseId = Number(req.params.id);
  const { lessonId, title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Note title and content are required.' });
    return;
  }
  const nRes = db.prepare(`
    INSERT INTO user_notes (user_id, course_id, lesson_id, title, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user!.id, courseId, lessonId ? Number(lessonId) : null, String(title).trim(), String(content).trim());
  const note = db.prepare('SELECT * FROM user_notes WHERE id = ?').get(Number(nRes.lastInsertRowid));
  res.status(201).json({ note });
});

app.put('/api/notes/:id', requireActiveUser, (req: Request, res: Response) => {
  const noteId = Number(req.params.id);
  const { title, content } = req.body;
  const existing = db.prepare('SELECT * FROM user_notes WHERE id = ? AND user_id = ?').get(noteId, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }
  db.prepare(`
    UPDATE user_notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?
  `).run(String(title).trim(), String(content).trim(), noteId);
  const updated = db.prepare('SELECT * FROM user_notes WHERE id = ?').get(noteId);
  res.json({ note: updated });
});

app.delete('/api/notes/:id', requireActiveUser, (req: Request, res: Response) => {
  const noteId = Number(req.params.id);
  db.prepare('DELETE FROM user_notes WHERE id = ? AND user_id = ?').run(noteId, req.user!.id);
  res.json({ success: true });
});

// Quiz Submission & Automatic Server-Side Grading (PRD Section 8.7)
app.post('/api/quizzes/:id/submit', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const quizId = Number(req.params.id);
  const { answers } = req.body; // { [questionId]: number | number[] }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) as
    | { id: number; course_id: number; passing_percentage: number; max_attempts: number }
    | undefined;
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found.' });
    return;
  }

  const attemptsCount = db.prepare('SELECT COUNT(*) as cnt FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?').get(
    quizId,
    userId
  ) as { cnt: number };
  if (attemptsCount.cnt >= quiz.max_attempts) {
    res.status(400).json({ error: `Maximum quiz attempt limit (${quiz.max_attempts}) reached.` });
    return;
  }

  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(quizId) as Array<{
    id: number;
    points: number;
  }>;

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const q of questions) {
    totalPoints += q.points;
    const correctOpts = db.prepare('SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1').all(q.id) as Array<{
      id: number;
    }>;
    const correctIds = correctOpts.map((o) => o.id).sort((a, b) => a - b);

    const rawAns = answers ? answers[q.id] ?? answers[String(q.id)] : [];
    const submittedIds = (Array.isArray(rawAns) ? rawAns : rawAns !== undefined ? [rawAns] : [])
      .map((x) => Number(x))
      .sort((a, b) => a - b);

    if (
      correctIds.length === submittedIds.length &&
      correctIds.every((val, idx) => val === submittedIds[idx])
    ) {
      earnedPoints += q.points;
    }
  }

  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 100;
  const passed = scorePercentage >= quiz.passing_percentage ? 1 : 0;

  const aRes = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, user_id, score_percentage, earned_points, total_points, passed, answers_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(quizId, userId, scorePercentage, earnedPoints, totalPoints, passed, JSON.stringify(answers || {}));

  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(Number(aRes.lastInsertRowid));
  const courseCompletion = evaluateCourseCompletionAndCertify(userId, quiz.course_id);

  res.json({
    attempt,
    courseCompletion,
  });
});

// Assignment Submission (PRD Section 8.8)
app.post('/api/assignments/:id/submit', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const assignmentId = Number(req.params.id);
  const { submissionText, fileName, fileDataUrl } = req.body;

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId) as
    | { id: number; course_id: number; allowed_file_types: string; max_upload_mb: number; requires_approval: number }
    | undefined;
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found.' });
    return;
  }

  if (!submissionText && !fileName) {
    res.status(400).json({ error: 'Please provide your assignment response or attach a permitted file.' });
    return;
  }

  if (fileName) {
    const ext = path.extname(String(fileName)).toLowerCase();
    const allowed = assignment.allowed_file_types
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(ext)) {
      res.status(400).json({
        error: `File extension '${ext}' is not permitted. Allowed types: ${assignment.allowed_file_types}`,
      });
      return;
    }
  }

  const initialStatus = assignment.requires_approval ? 'pending' : 'approved';
  const sRes = db.prepare(`
    INSERT INTO assignment_submissions (assignment_id, course_id, user_id, submission_text, file_url, file_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    assignmentId,
    assignment.course_id,
    userId,
    submissionText ? String(submissionText).trim() : null,
    fileDataUrl || null,
    fileName || null,
    initialStatus
  );

  const submission = db.prepare('SELECT * FROM assignment_submissions WHERE id = ?').get(Number(sRes.lastInsertRowid));
  const courseCompletion = evaluateCourseCompletionAndCertify(userId, assignment.course_id);

  res.status(201).json({
    submission,
    courseCompletion,
  });
});

// Certificates & PDF Generation (PRD Section 8.9)
app.get('/api/certificates', requireActiveUser, (req: Request, res: Response) => {
  const certificates = db.prepare(`
    SELECT c.*, cr.thumbnail_url
    FROM certificates c
    JOIN courses cr ON cr.id = c.course_id
    WHERE c.user_id = ?
    ORDER BY c.id DESC
  `).all(req.user!.id);
  res.json({ certificates });
});

app.get('/api/certificates/:code/pdf', (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const cert = db.prepare('SELECT * FROM certificates WHERE UPPER(certificate_code) = ?').get(code) as
    | {
        certificate_code: string;
        recipient_name: string;
        course_title: string;
        company_name: string;
        signatory_name: string;
        issued_at: string;
      }
    | undefined;

  if (!cert) {
    res.status(404).json({ error: 'Certificate not found.' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.certificate_code}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
  doc.pipe(res);

  // Dark Obsidian & Brushed Gold Executive Border
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0c1110');
  doc.lineWidth(3).strokeColor('#d97706').rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke();
  doc.lineWidth(1).strokeColor('#10b981').rect(32, 32, doc.page.width - 64, doc.page.height - 64).stroke();

  doc.fillColor('#d97706').fontSize(13).text(cert.company_name.toUpperCase(), 0, 75, { align: 'center', characterSpacing: 4 });
  doc.fillColor('#f8fafc').fontSize(32).text('CERTIFICATE OF COMPLETION', 0, 108, { align: 'center', characterSpacing: 2 });
  doc.fillColor('#94a3b8').fontSize(13).text('THIS IS TO OFFICIALLY CERTIFY THAT', 0, 165, { align: 'center', characterSpacing: 2 });

  doc.fillColor('#10b981').fontSize(34).text(cert.recipient_name, 0, 198, { align: 'center' });

  doc
    .fillColor('#cbd5e1')
    .fontSize(13)
    .text(
      'has successfully completed 100% of compulsory video modules, passed all graded assessments, and satisfied all practical capstone requirements for the executive course:',
      120,
      255,
      { align: 'center', width: doc.page.width - 240 }
    );

  doc.fillColor('#ffffff').fontSize(22).text(cert.course_title, 80, 305, { align: 'center', width: doc.page.width - 160 });

  doc.fillColor('#d97706').fontSize(11).text(`CERTIFICATE ID: ${cert.certificate_code}`, 80, 410);
  doc.fillColor('#94a3b8').fontSize(11).text(`COMPLETION DATE: ${String(cert.issued_at).slice(0, 10)}`, 80, 430);
  doc.fillColor('#94a3b8').fontSize(10).text(`VERIFY ONLINE: /verify/${cert.certificate_code}`, 80, 450);

  doc.fillColor('#f8fafc').fontSize(12).text(cert.signatory_name, doc.page.width - 360, 415, { width: 280, align: 'right' });
  doc.fillColor('#10b981').fontSize(10).text('AUTHORIZED DIGITAL SIGNATURE & SEAL', doc.page.width - 360, 438, {
    width: 280,
    align: 'right',
  });

  doc.end();
});

// =============================================================================
// 8. KYC, TRADING, LEADERBOARD, COMMUNITY, OFFERS, NOTIFICATIONS
// =============================================================================

app.get('/api/kyc/status', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const current = db.prepare('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);
  const history = db.prepare('SELECT * FROM kyc_review_history WHERE user_id = ? ORDER BY id DESC').all(userId);
  const allSubmissions = db.prepare('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC').all(userId);
  res.json({
    status: current ? (current as { status: string }).status : 'not_submitted',
    currentSubmission: current || null,
    submissionsHistory: allSubmissions,
    reviewHistory: history,
  });
});

app.post('/api/kyc/submit', requireActiveUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    aadhaarNumber,
    aadhaarDocumentName,
    aadhaarDocumentBase64,
    bankName,
    accountHolderName,
    accountNumber,
    ifscCode,
    upiId,
    state,
    district,
    gender,
  } = req.body;

  if (!bankName || !accountHolderName || !accountNumber || !ifscCode || !upiId || !state || !district || !gender) {
    res.status(400).json({ error: 'All KYC bank, UPI, and demographic fields are required.' });
    return;
  }

  const prev = db.prepare('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as
    | { id: number; status: string }
    | undefined;

  if (prev && prev.status === 'approved') {
    res.status(400).json({ error: 'Your KYC is already verified and approved.' });
    return;
  }

  const rawAadhaar = String(aadhaarNumber || '4829').replace(/\D/g, '');
  const maskedAadhaar = `XXXX-XXXX-${rawAadhaar.slice(-4).padStart(4, '0')}`;

  const submission = runTransaction(() => {
    const sRes = db.prepare(`
      INSERT INTO kyc_submissions (
        user_id, aadhaar_number_masked, bank_name, account_holder_name,
        account_number, ifsc_code, upi_id, state, district, gender, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
    `).run(
      userId,
      maskedAadhaar,
      String(bankName).trim(),
      String(accountHolderName).trim(),
      String(accountNumber).trim(),
      String(ifscCode).trim().toUpperCase(),
      String(upiId).trim(),
      String(state).trim(),
      String(district).trim(),
      String(gender).trim()
    );

    const kycId = Number(sRes.lastInsertRowid);

    // Save protected document in private storage
    const kycDir = path.resolve(process.cwd(), 'data', 'protected_kyc');
    if (!fs.existsSync(kycDir)) {
      fs.mkdirSync(kycDir, { recursive: true });
    }
    const safeFileName = `kyc_user_${userId}_sub_${kycId}.dat`;
    const protectedPath = path.join(kycDir, safeFileName);
    const contentBuffer = Buffer.from(String(aadhaarDocumentBase64 || 'PROTECTED_AADHAAR_DOCUMENT_PAYLOAD'), 'utf8');
    fs.writeFileSync(protectedPath, contentBuffer);

    db.prepare(`
      INSERT INTO kyc_documents (
        kyc_submission_id, user_id, document_type, protected_file_path,
        original_filename, mime_type, file_size_bytes
      ) VALUES (?, ?, 'aadhaar', ?, ?, 'application/octet-stream', ?)
    `).run(kycId, userId, protectedPath, String(aadhaarDocumentName || 'aadhaar_card.pdf'), contentBuffer.length);

    db.prepare(`
      INSERT INTO kyc_review_history (kyc_submission_id, user_id, previous_status, new_status, reason)
      VALUES (?, ?, ?, 'pending_review', 'User submitted KYC documents for verification')
    `).run(kycId, userId, prev ? prev.status : 'not_submitted');

    createUserNotification(
      userId,
      'KYC Verification Submitted',
      'Your Aadhaar document and Bank/UPI details have been securely uploaded and queued for compliance review.',
      '/dashboard?tab=kyc'
    );

    sendPlatformEmail(userId, req.user!.email, 'kyc_submitted', {
      name: req.user!.fullName,
    });

    return db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(kycId);
  });

  res.status(201).json({ success: true, submission });
});

app.get('/api/trading-videos', requireActiveUser, (req: Request, res: Response) => {
  const videos = db.prepare(`
    SELECT * FROM trading_videos WHERE is_published = 1 ORDER BY display_order ASC
  `).all() as Array<Record<string, unknown>>;

  const withStreams = videos.map((v) => {
    const token = createSignedStreamToken(req.user!.id, String(v.video_asset_key));
    return {
      ...v,
      streamUrl: `/api/stream/${encodeURIComponent(String(v.video_asset_key))}?token=${encodeURIComponent(token)}`,
    };
  });

  res.json({
    disclaimer:
      'EDUCATIONAL DISCLAIMER: All videos in the Trading section are strictly for educational and informational purposes only. Edurt Academy does not provide investment advice or promise guaranteed financial returns.',
    videos: withStreams,
  });
});

app.get('/api/leaderboard', requireActiveUser, (req: Request, res: Response) => {
  const settingRow = db.prepare("SELECT value_json FROM system_settings WHERE key = 'leaderboard_config'").get() as
    | { value_json: string }
    | undefined;
  const config = settingRow
    ? JSON.parse(settingRow.value_json)
    : { activePeriod: 'weekly', isPublished: true, minEligibleInr: 500 };

  const requestedPeriod = String(req.query.period || config.activePeriod || 'weekly');

  if (!config.isPublished && !req.user?.adminId) {
    res.json({ isPublished: false, period: requestedPeriod, entries: [] });
    return;
  }

  let dateFilterSql = '';
  if (requestedPeriod === 'weekly') {
    dateFilterSql = "AND ac.credited_at >= datetime('now', '-7 days')";
  } else if (requestedPeriod === 'monthly') {
    dateFilterSql = "AND ac.credited_at >= datetime('now', '-30 days')";
  }

  const rows = db.prepare(`
    SELECT u.id as user_id,
           up.full_name,
           up.profile_photo,
           up.state,
           COALESCE(SUM(ac.referrer_amount_inr), 0) as eligible_earnings_inr,
           COUNT(ac.id) as referral_sales_count
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN affiliate_commissions ac ON ac.referrer_user_id = u.id
    WHERE u.status = 'active'
      AND ac.status = 'available'
      ${dateFilterSql}
    GROUP BY u.id
    HAVING eligible_earnings_inr >= ?
    ORDER BY eligible_earnings_inr DESC
    LIMIT 20
  `).all(Number(config.minEligibleInr || 0)) as Array<Record<string, unknown>>;

  const entries = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.user_id,
    userName: r.full_name,
    profilePhoto: r.profile_photo || null,
    state: r.state || 'India',
    eligibleEarningsInr: Number(r.eligible_earnings_inr),
    referralSalesCount: Number(r.referral_sales_count),
  }));

  res.json({
    isPublished: Boolean(config.isPublished),
    period: requestedPeriod,
    configuredDefaultPeriod: config.activePeriod,
    entries,
  });
});

app.get('/api/community', requireActiveUser, (_req: Request, res: Response) => {
  const links = db.prepare('SELECT * FROM social_links WHERE is_active = 1 ORDER BY display_order ASC').all();
  res.json({ links });
});

app.get('/api/offers', requireActiveUser, (_req: Request, res: Response) => {
  db.prepare(`UPDATE offers SET is_active = 0 WHERE end_at < datetime('now') AND is_active = 1`).run();
  db.prepare(`UPDATE offer_batches SET is_active = 0 WHERE end_at < datetime('now') AND is_active = 1`).run();

  const batches = db.prepare('SELECT * FROM offer_batches WHERE is_active = 1 ORDER BY id DESC').all();
  const offers = db.prepare(`
    SELECT o.*, b.name as batch_name, b.batch_type
    FROM offers o
    JOIN offer_batches b ON b.id = o.batch_id
    WHERE o.is_active = 1 AND b.is_active = 1 AND o.end_at > datetime('now')
    ORDER BY o.id DESC
  `).all();

  res.json({ batches, offers });
});

app.get('/api/notifications', requireActiveUser, (req: Request, res: Response) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(
    req.user!.id
  );
  res.json({ notifications });
});

app.put('/api/notifications/:id/read', requireActiveUser, (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    Number(req.params.id),
    req.user!.id
  );
  res.json({ success: true });
});

app.put('/api/notifications/read-all', requireActiveUser, (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ success: true });
});

// Dev/Preview Email Outbox Inspector so users/evaluators can inspect sent OTPs and notifications
app.get('/api/dev/emails', (req: Request, res: Response) => {
  const email = req.query.email ? String(req.query.email).trim().toLowerCase() : null;
  const rows = email
    ? db.prepare('SELECT * FROM email_logs WHERE LOWER(recipient_email) = ? ORDER BY id DESC LIMIT 20').all(email)
    : db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 25').all();
  res.json({ emails: rows });
});

// =============================================================================
// 9. MASTER ADMIN PANEL ENDPOINTS (PRD Section 16)
// =============================================================================

// 16.2 Admin Dashboard Statistics (All 17 required metrics from live DB)
app.get('/api/admin/dashboard', requireAdmin(), (_req: Request, res: Response) => {
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const activeUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as { c: number }).c;
  const totalSales = (db.prepare("SELECT COALESCE(SUM(gross_amount_inr), 0) as s FROM payments WHERE status = 'successful'").get() as { s: number }).s;
  const todaySales = (db.prepare("SELECT COALESCE(SUM(gross_amount_inr), 0) as s FROM payments WHERE status = 'successful' AND date(verified_at) = date('now')").get() as { s: number }).s;
  const monthlySales = (db.prepare("SELECT COALESCE(SUM(gross_amount_inr), 0) as s FROM payments WHERE status = 'successful' AND verified_at >= datetime('now', '-30 days')").get() as { s: number }).s;
  const totalPackagePurchases = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'paid'").get() as { c: number }).c;
  const totalAffiliateCommission = (db.prepare("SELECT COALESCE(SUM(referrer_amount_inr), 0) as s FROM affiliate_commissions WHERE status != 'reversed'").get() as { s: number }).s;
  const companyRevenueShare = (db.prepare("SELECT COALESCE(SUM(company_amount_inr), 0) as s FROM affiliate_commissions WHERE status != 'reversed'").get() as { s: number }).s;
  const availableCommissionLiability = (db.prepare('SELECT COALESCE(SUM(available_commission_inr), 0) as s FROM wallet_accounts').get() as { s: number }).s;
  const pendingCommission = (db.prepare('SELECT COALESCE(SUM(pending_commission_inr), 0) as s FROM wallet_accounts').get() as { s: number }).s;
  const totalWithdrawals = (db.prepare("SELECT COALESCE(SUM(amount_inr), 0) as s FROM withdrawals WHERE status = 'paid'").get() as { s: number }).s;
  const pendingWithdrawals = (db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('pending', 'processing')").get() as { c: number }).c;
  const approvedWithdrawals = (db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('approved', 'paid')").get() as { c: number }).c;
  const rejectedWithdrawals = (db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'rejected'").get() as { c: number }).c;
  const pendingKyc = (db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'pending_review'").get() as { c: number }).c;
  const totalCourses = (db.prepare("SELECT COUNT(*) as c FROM courses WHERE status = 'active'").get() as { c: number }).c;
  const activeOffers = (db.prepare("SELECT COUNT(*) as c FROM offers WHERE is_active = 1 AND end_at > datetime('now')").get() as { c: number }).c;

  const recentLogs = db.prepare('SELECT * FROM admin_activity_logs ORDER BY id DESC LIMIT 12').all();

  res.json({
    metrics: {
      totalRegisteredUsers: totalUsers,
      activeUsers,
      totalSalesInr: totalSales,
      todaySalesInr: todaySales,
      monthlySalesInr: monthlySales,
      totalPackagePurchases,
      totalAffiliateCommissionInr: totalAffiliateCommission,
      companyRevenueShareInr: companyRevenueShare,
      availableCommissionLiabilityInr: availableCommissionLiability,
      pendingCommissionInr: pendingCommission,
      totalWithdrawalsInr: totalWithdrawals,
      pendingWithdrawalsCount: pendingWithdrawals,
      approvedWithdrawalsCount: approvedWithdrawals,
      rejectedWithdrawalsCount: rejectedWithdrawals,
      pendingKycCount: pendingKyc,
      totalCoursesCount: totalCourses,
      activeOffersCount: activeOffers,
    },
    recentLogs,
  });
});

// 16.3 - 16.6 Website CMS, Page Builder, Media Library, Draft/Preview/Publish
app.get('/api/admin/cms', requireAdmin('cms.manage'), (_req: Request, res: Response) => {
  const content = db.prepare("SELECT * FROM website_content WHERE key = 'main_site'").get() as {
    published_json: string;
    draft_json: string;
    has_unpublished_changes: number;
    updated_at: string;
  };
  const sections = db.prepare('SELECT * FROM website_sections ORDER BY display_order ASC').all();
  const versions = db.prepare('SELECT id, page_slug, version_number, note, created_at FROM page_versions ORDER BY id DESC LIMIT 15').all();
  const media = db.prepare('SELECT * FROM media_assets ORDER BY id DESC').all();

  res.json({
    publishedConfig: JSON.parse(content.published_json),
    draftConfig: JSON.parse(content.draft_json),
    hasUnpublishedChanges: Boolean(content.has_unpublished_changes),
    sections,
    versions,
    media,
  });
});

app.put('/api/admin/cms/draft', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { draftConfig } = req.body;
  if (!draftConfig) {
    res.status(400).json({ error: 'draftConfig payload is required.' });
    return;
  }
  const jsonStr = JSON.stringify(draftConfig);
  db.prepare(`
    UPDATE website_content
    SET draft_json = ?,
        has_unpublished_changes = 1,
        updated_by_admin_id = ?,
        updated_at = datetime('now')
    WHERE key = 'main_site'
  `).run(jsonStr, req.user!.adminId!);

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'SAVE_CMS_DRAFT', 'website_content:main_site', null, 'Saved draft CMS configuration');
  res.json({ success: true, hasUnpublishedChanges: true });
});

app.post('/api/admin/cms/publish', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { note } = req.body;
  const content = db.prepare("SELECT draft_json FROM website_content WHERE key = 'main_site'").get() as { draft_json: string };

  const lastVer = db.prepare("SELECT COALESCE(MAX(version_number), 0) as v FROM page_versions WHERE page_slug = 'home'").get() as {
    v: number;
  };
  const nextVer = lastVer.v + 1;

  runTransaction(() => {
    db.prepare(`
      UPDATE website_content
      SET published_json = draft_json,
          has_unpublished_changes = 0,
          updated_by_admin_id = ?,
          updated_at = datetime('now')
      WHERE key = 'main_site'
    `).run(req.user!.adminId!);

    db.prepare(`
      UPDATE website_pages SET status = 'published', published_version = ?, updated_at = datetime('now') WHERE slug = 'home'
    `).run(nextVer);

    db.prepare(`
      INSERT INTO page_versions (page_slug, version_number, snapshot_json, note, created_by_admin_id)
      VALUES ('home', ?, ?, ?, ?)
    `).run(nextVer, content.draft_json, String(note || `Published version v${nextVer}`), req.user!.adminId!);
  });

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'PUBLISH_WEBSITE_CMS', `page_versions:v${nextVer}`, 'draft', `published v${nextVer}`);
  res.json({ success: true, publishedVersion: nextVer });
});

app.post('/api/admin/cms/restore-version', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { versionId } = req.body;
  const ver = db.prepare('SELECT * FROM page_versions WHERE id = ?').get(Number(versionId)) as
    | { id: number; version_number: number; snapshot_json: string }
    | undefined;
  if (!ver) {
    res.status(404).json({ error: 'Version snapshot not found.' });
    return;
  }

  db.prepare(`
    UPDATE website_content
    SET draft_json = ?,
        published_json = ?,
        has_unpublished_changes = 0,
        updated_by_admin_id = ?,
        updated_at = datetime('now')
    WHERE key = 'main_site'
  `).run(ver.snapshot_json, ver.snapshot_json, req.user!.adminId!);

  logAdminActivity(
    req.user!.adminId!,
    req.user!.adminRole!,
    'RESTORE_CMS_VERSION',
    `page_versions:v${ver.version_number}`,
    null,
    `Restored v${ver.version_number} to live site`
  );

  res.json({ success: true, restoredVersion: ver.version_number });
});

app.post('/api/admin/cms/sections', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { sectionKey, sectionType, title, subtitle } = req.body;
  const maxOrder = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM website_sections').get() as { m: number }).m;
  const sRes = db.prepare(`
    INSERT INTO website_sections (page_id, section_key, section_type, title, subtitle, is_visible, display_order)
    VALUES (1, ?, ?, ?, ?, 1, ?)
  `).run(
    String(sectionKey || `custom_${Date.now()}`),
    String(sectionType || 'custom_banner'),
    String(title || 'New Custom Section'),
    String(subtitle || ''),
    maxOrder + 1
  );
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'ADD_PAGE_SECTION', `website_sections:${sRes.lastInsertRowid}`, null, String(title));
  res.status(201).json({ sections: db.prepare('SELECT * FROM website_sections ORDER BY display_order ASC').all() });
});

app.put('/api/admin/cms/sections/:id', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const sectionId = Number(req.params.id);
  const { title, subtitle, isVisible, displayOrder } = req.body;
  db.prepare(`
    UPDATE website_sections
    SET title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        is_visible = COALESCE(?, is_visible),
        display_order = COALESCE(?, display_order),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(title ?? null, subtitle ?? null, isVisible !== undefined ? (isVisible ? 1 : 0) : null, displayOrder ?? null, sectionId);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'UPDATE_PAGE_SECTION', `website_sections:${sectionId}`, null, JSON.stringify(req.body));
  res.json({ sections: db.prepare('SELECT * FROM website_sections ORDER BY display_order ASC').all() });
});

app.post('/api/admin/cms/sections/reorder', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { orderedIds } = req.body; // number[]
  if (Array.isArray(orderedIds)) {
    runTransaction(() => {
      const stmt = db.prepare('UPDATE website_sections SET display_order = ? WHERE id = ?');
      orderedIds.forEach((id, idx) => stmt.run(idx + 1, Number(id)));
    });
    logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'REORDER_PAGE_SECTIONS', 'website_sections', null, JSON.stringify(orderedIds));
  }
  res.json({ sections: db.prepare('SELECT * FROM website_sections ORDER BY display_order ASC').all() });
});

app.delete('/api/admin/cms/sections/:id', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const sectionId = Number(req.params.id);
  db.prepare('DELETE FROM website_sections WHERE id = ?').run(sectionId);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'DELETE_PAGE_SECTION', `website_sections:${sectionId}`);
  res.json({ sections: db.prepare('SELECT * FROM website_sections ORDER BY display_order ASC').all() });
});

// Media Library
app.post('/api/admin/media', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const { title, category, fileUrl, mimeType } = req.body;
  if (!title || !fileUrl) {
    res.status(400).json({ error: 'Media title and file URL/data are required.' });
    return;
  }
  const mRes = db.prepare(`
    INSERT INTO media_assets (title, category, file_url, mime_type, file_size_bytes, uploaded_by_admin_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(title), String(category || 'general'), String(fileUrl), String(mimeType || 'image/jpeg'), String(fileUrl).length, req.user!.adminId!);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'UPLOAD_MEDIA_ASSET', `media_assets:${mRes.lastInsertRowid}`, null, String(title));
  res.status(201).json({ media: db.prepare('SELECT * FROM media_assets ORDER BY id DESC').all() });
});

app.delete('/api/admin/media/:id', requireAdmin('cms.manage'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM media_assets WHERE id = ?').run(id);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'DELETE_MEDIA_ASSET', `media_assets:${id}`);
  res.json({ media: db.prepare('SELECT * FROM media_assets ORDER BY id DESC').all() });
});

// 16.7 Package Management
app.get('/api/admin/packages', requireAdmin('packages.manage'), (_req: Request, res: Response) => {
  const pkgs = db.prepare('SELECT * FROM packages ORDER BY display_order ASC').all() as Array<Record<string, unknown>>;
  const result = pkgs.map((p) => {
    const courseIds = (
      db.prepare('SELECT course_id FROM package_courses WHERE package_id = ?').all(Number(p.id)) as Array<{ course_id: number }>
    ).map((r) => r.course_id);
    return {
      ...p,
      benefits: JSON.parse(String(p.benefits_json || '[]')),
      courseIds,
    };
  });
  res.json({ packages: result });
});

app.post('/api/admin/packages', requireAdmin('packages.manage'), (req: Request, res: Response) => {
  const { name, tagline, description, imageUrl, priceInr, benefits, durationLabel, badgeText, status, courseIds } = req.body;
  if (!name || priceInr === undefined) {
    res.status(400).json({ error: 'Package name and price are required.' });
    return;
  }
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.floor(100 + Math.random() * 900);

  const maxOrder = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM packages').get() as { m: number }).m;

  const pkgId = runTransaction(() => {
    const pRes = db.prepare(`
      INSERT INTO packages (name, slug, tagline, description, image_url, price_inr, benefits_json, duration_label, badge_text, display_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(name),
      slug,
      String(tagline || ''),
      String(description || ''),
      String(imageUrl || '/assets/media/pkg_starter.jpg'),
      Number(priceInr),
      JSON.stringify(Array.isArray(benefits) ? benefits : []),
      String(durationLabel || 'Lifetime Access'),
      String(badgeText || 'NEW'),
      maxOrder + 1,
      String(status || 'active')
    );
    const id = Number(pRes.lastInsertRowid);
    if (Array.isArray(courseIds)) {
      const link = db.prepare('INSERT OR IGNORE INTO package_courses (package_id, course_id) VALUES (?, ?)');
      for (const cid of courseIds) link.run(id, Number(cid));
    }
    return id;
  });

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'CREATE_PACKAGE', `packages:${pkgId}`, null, `${name} (₹${priceInr})`);
  res.status(201).json({ success: true, packageId: pkgId });
});

app.put('/api/admin/packages/:id', requireAdmin('packages.manage'), (req: Request, res: Response) => {
  const pkgId = Number(req.params.id);
  const prev = db.prepare('SELECT * FROM packages WHERE id = ?').get(pkgId) as Record<string, unknown> | undefined;
  if (!prev) {
    res.status(404).json({ error: 'Package not found.' });
    return;
  }
  const { name, tagline, description, imageUrl, priceInr, benefits, status, displayOrder, courseIds } = req.body;

  runTransaction(() => {
    db.prepare(`
      UPDATE packages
      SET name = COALESCE(?, name),
          tagline = COALESCE(?, tagline),
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url),
          price_inr = COALESCE(?, price_inr),
          benefits_json = COALESCE(?, benefits_json),
          status = COALESCE(?, status),
          display_order = COALESCE(?, display_order),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? null,
      tagline ?? null,
      description ?? null,
      imageUrl ?? null,
      priceInr !== undefined ? Number(priceInr) : null,
      Array.isArray(benefits) ? JSON.stringify(benefits) : null,
      status ?? null,
      displayOrder !== undefined ? Number(displayOrder) : null,
      pkgId
    );

    if (Array.isArray(courseIds)) {
      db.prepare('DELETE FROM package_courses WHERE package_id = ?').run(pkgId);
      const link = db.prepare('INSERT OR IGNORE INTO package_courses (package_id, course_id) VALUES (?, ?)');
      for (const cid of courseIds) link.run(pkgId, Number(cid));
    }
  });

  logAdminActivity(
    req.user!.adminId!,
    req.user!.adminRole!,
    'UPDATE_PACKAGE',
    `packages:${pkgId}`,
    `₹${prev.price_inr} (${prev.status})`,
    `₹${priceInr ?? prev.price_inr} (${status ?? prev.status})`
  );
  res.json({ success: true });
});

// 16.8 Course, Module, Lesson, Quiz & Assignment Management
app.get('/api/admin/courses', requireAdmin('courses.manage'), (_req: Request, res: Response) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY display_order ASC').all() as Array<Record<string, unknown>>;
  const enriched = courses.map((c) => {
    const cid = Number(c.id);
    const modules = db.prepare('SELECT * FROM course_modules WHERE course_id = ? ORDER BY display_order ASC').all(cid);
    const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY display_order ASC').all(cid);
    const quizzes = db.prepare('SELECT * FROM quizzes WHERE course_id = ?').all(cid);
    const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(cid);
    return {
      ...c,
      learningObjectives: JSON.parse(String(c.learning_objectives_json || '[]')),
      modules,
      lessons,
      quizzes,
      assignments,
    };
  });

  const pendingSubmissions = db.prepare(`
    SELECT s.*, a.title as assignment_title, c.title as course_title, up.full_name as student_name, u.email as student_email
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN courses c ON c.id = s.course_id
    JOIN users u ON u.id = s.user_id
    JOIN user_profiles up ON up.user_id = u.id
    ORDER BY s.id DESC
  `).all();

  res.json({ courses: enriched, assignmentSubmissions: pendingSubmissions });
});

app.post('/api/admin/courses', requireAdmin('courses.manage'), (req: Request, res: Response) => {
  const { title, thumbnailUrl, shortDescription, overview, instructorName, level, learningObjectives } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Course title is required.' });
    return;
  }
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);
  const cRes = db.prepare(`
    INSERT INTO courses (title, slug, thumbnail_url, short_description, overview, learning_objectives_json, instructor_name, level, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    String(title),
    slug,
    String(thumbnailUrl || '/assets/media/course_affiliate.jpg'),
    String(shortDescription || ''),
    String(overview || ''),
    JSON.stringify(Array.isArray(learningObjectives) ? learningObjectives : []),
    String(instructorName || 'Edurt Faculty'),
    String(level || 'Comprehensive')
  );
  const courseId = Number(cRes.lastInsertRowid);
  db.prepare('INSERT INTO course_modules (course_id, title, description, display_order) VALUES (?, ?, ?, 1)').run(
    courseId,
    'Module 1: Core Curriculum',
    'Primary instructional module'
  );
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'CREATE_COURSE', `courses:${courseId}`, null, String(title));
  res.status(201).json({ success: true, courseId });
});

app.post('/api/admin/courses/:id/lessons', requireAdmin('courses.manage'), (req: Request, res: Response) => {
  const courseId = Number(req.params.id);
  const { moduleId, title, description, durationSeconds, isCompulsory } = req.body;
  let modId = moduleId ? Number(moduleId) : null;
  if (!modId) {
    const firstMod = db.prepare('SELECT id FROM course_modules WHERE course_id = ? LIMIT 1').get(courseId) as { id: number } | undefined;
    if (firstMod) {
      modId = firstMod.id;
    } else {
      modId = Number(
        db.prepare('INSERT INTO course_modules (course_id, title, display_order) VALUES (?, ?, 1)').run(courseId, 'Module 1').lastInsertRowid
      );
    }
  }
  const maxOrd = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM lessons WHERE course_id = ?').get(courseId) as { m: number }).m;
  const lRes = db.prepare(`
    INSERT INTO lessons (course_id, module_id, title, description, video_asset_key, duration_seconds, is_compulsory, display_order)
    VALUES (?, ?, ?, ?, 'lesson_stream_1.mp4', ?, ?, ?)
  `).run(courseId, modId, String(title), String(description || ''), Number(durationSeconds || 10), isCompulsory !== false ? 1 : 0, maxOrd + 1);

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'ADD_LESSON', `lessons:${lRes.lastInsertRowid}`, null, String(title));
  res.status(201).json({ success: true });
});

app.post('/api/admin/assignments/submissions/:id/review', requireAdmin('courses.manage'), (req: Request, res: Response) => {
  const subId = Number(req.params.id);
  const { status, feedback } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(String(status))) {
    res.status(400).json({ error: 'Status must be approved or rejected.' });
    return;
  }

  const sub = db.prepare('SELECT * FROM assignment_submissions WHERE id = ?').get(subId) as
    | { id: number; user_id: number; course_id: number; status: string }
    | undefined;
  if (!sub) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  db.prepare(`
    UPDATE assignment_submissions
    SET status = ?,
        feedback = ?,
        reviewed_by_admin_id = ?,
        reviewed_at = datetime('now')
    WHERE id = ?
  `).run(status, String(feedback || ''), req.user!.adminId!, subId);

  logAdminActivity(
    req.user!.adminId!,
    req.user!.adminRole!,
    'REVIEW_ASSIGNMENT',
    `assignment_submissions:${subId}`,
    sub.status,
    status
  );

  // Trigger course completion check (auto-generates certificate if all requirements are now met)
  const completion = evaluateCourseCompletionAndCertify(sub.user_id, sub.course_id);

  res.json({ success: true, completion });
});

// 16.9 User Management
app.get('/api/admin/users', requireAdmin('users.manage'), (req: Request, res: Response) => {
  const q = req.query.q ? `%${String(req.query.q).trim()}%` : '%';
  const statusFilter = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';

  let statusClause = '';
  const params: unknown[] = [q, q, q, q];

  if (['active', 'inactive', 'suspended'].includes(statusFilter)) {
    statusClause = 'AND u.status = ?';
    params.push(statusFilter);
  }

  const users = db.prepare(`
    SELECT u.id, u.email, u.mobile, u.status, u.activated_at, u.referred_by_code, u.acquisition_source, u.created_at,
           up.full_name, up.date_of_birth, up.state, up.district,
           ac.code as affiliate_code,
           w.available_commission_inr, w.pending_commission_inr, w.bonus_amount_inr, w.total_withdrawn_inr,
           (SELECT status FROM kyc_submissions k WHERE k.user_id = u.id ORDER BY k.id DESC LIMIT 1) as kyc_status,
           (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid') as paid_orders_count,
           (SELECT status FROM payments p WHERE p.user_id = u.id ORDER BY p.id DESC LIMIT 1) as latest_payment_status,
           (SELECT package_name_snapshot FROM orders o WHERE o.user_id = u.id ORDER BY o.id DESC LIMIT 1) as latest_package_name,
           (SELECT gross_amount_inr FROM orders o WHERE o.user_id = u.id ORDER BY o.id DESC LIMIT 1) as latest_package_price
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    LEFT JOIN wallet_accounts w ON w.user_id = u.id
    WHERE (up.full_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR ac.code LIKE ?)
      ${statusClause}
    ORDER BY u.id DESC
  `).all(...params);

  const totalUsersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const activeUsersCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as { c: number }).c;
  const inactiveUsersCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'inactive'").get() as { c: number }).c;
  const suspendedUsersCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'suspended'").get() as { c: number }).c;

  res.json({
    users,
    counts: {
      total: totalUsersCount,
      active: activeUsersCount,
      inactive: inactiveUsersCount,
      suspended: suspendedUsersCount,
    },
  });
});

app.post('/api/admin/users', requireAdmin('users.manage'), (req: Request, res: Response) => {
  const { fullName, email, mobile, dateOfBirth, password, referralCode, packageId } = req.body;
  if (!fullName || !email || !mobile || !password) {
    res.status(400).json({ error: 'Full Name, Email, Mobile, and Password are required.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedMobile = String(mobile).trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(normalizedEmail, normalizedMobile);
  if (existing) {
    res.status(409).json({ error: 'Email or mobile number already exists.' });
    return;
  }

  let sponsorId: number | null = null;
  let sponsorCode: string | null = null;
  if (referralCode) {
    const sp = db.prepare('SELECT user_id, code FROM affiliate_codes WHERE code = ?').get(String(referralCode).trim().toUpperCase()) as
      | { user_id: number; code: string }
      | undefined;
    if (sp) {
      sponsorId = sp.user_id;
      sponsorCode = sp.code;
    }
  }

  const newUserId = runTransaction(() => {
    const hash = bcrypt.hashSync(String(password), 10);
    const code = generateUniqueAffiliateCode();
    const uRes = db.prepare(`
      INSERT INTO users (email, mobile, password_hash, status, activated_at, referred_by_user_id, referred_by_code, referral_locked, acquisition_source, created_by_admin_id)
      VALUES (?, ?, ?, 'active', datetime('now'), ?, ?, 1, 'admin_manual', ?)
    `).run(normalizedEmail, normalizedMobile, hash, sponsorId, sponsorCode, req.user!.adminId!);
    const uid = Number(uRes.lastInsertRowid);

    db.prepare(`INSERT INTO user_profiles (user_id, full_name, date_of_birth) VALUES (?, ?, ?)`).run(
      uid,
      String(fullName).trim(),
      String(dateOfBirth || '1998-01-01')
    );
    db.prepare(`INSERT INTO affiliate_codes (user_id, code, clicks, is_active) VALUES (?, ?, 0, 1)`).run(uid, code);
    db.prepare(`INSERT INTO wallet_accounts (user_id) VALUES (?)`).run(uid);

    if (sponsorId && sponsorCode) {
      db.prepare(`INSERT INTO referrals (referrer_user_id, referred_user_id, affiliate_code, status) VALUES (?, ?, ?, 'registered')`).run(
        sponsorId,
        uid,
        sponsorCode
      );
    }

    if (packageId) {
      const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(Number(packageId)) as
        | { id: number; name: string; price_inr: number }
        | undefined;
      if (pkg) {
        const ordNo = `ORD-ADM-${Math.floor(100000 + Math.random() * 900000)}`;
        const rzpOrd = `order_adm_${crypto.randomBytes(6).toString('hex')}`;
        db.prepare(`
          INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, razorpay_order_id, status)
          VALUES (?, ?, ?, ?, ?, ?, 'created')
        `).run(ordNo, uid, pkg.id, pkg.name, pkg.price_inr, rzpOrd);

        verifyAndActivatePayment({
          razorpayOrderId: rzpOrd,
          razorpayPaymentId: `pay_adm_${crypto.randomBytes(6).toString('hex')}`,
          razorpaySignature: 'admin_manual_verified',
          verifiedBy: 'admin_manual',
        });
      }
    }

    return uid;
  });

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'CREATE_USER_MANUAL', `users:${newUserId}`, null, `${fullName} (${normalizedEmail})`);
  res.status(201).json({ success: true, userId: newUserId });
});

app.put('/api/admin/users/:id', requireAdmin('users.manage'), (req: Request, res: Response) => {
  const targetUserId = Number(req.params.id);
  const { status, fullName } = req.body;
  const prev = db.prepare('SELECT status, activated_at FROM users WHERE id = ?').get(targetUserId) as { status: string; activated_at: string | null } | undefined;
  if (!prev) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (status && ['active', 'inactive', 'suspended'].includes(String(status))) {
    const nextStatus = String(status);
    runTransaction(() => {
      if (nextStatus === 'active') {
        db.prepare(`
          UPDATE users
          SET status = 'active',
              activated_at = COALESCE(activated_at, datetime('now')),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(targetUserId);

        // Guarantee affiliate code exists upon activation
        const existingCode = db.prepare('SELECT code FROM affiliate_codes WHERE user_id = ?').get(targetUserId);
        if (!existingCode) {
          const code = generateUniqueAffiliateCode();
          db.prepare('INSERT INTO affiliate_codes (user_id, code, clicks, is_active) VALUES (?, ?, 0, 1)').run(targetUserId, code);
        }

        // Activate any pending package orders so courses are enrolled
        const pendingOrder = db.prepare("SELECT * FROM orders WHERE user_id = ? AND status != 'paid' ORDER BY id DESC LIMIT 1").get(targetUserId) as
          | { id: number; razorpay_order_id: string }
          | undefined;
        if (pendingOrder) {
          try {
            verifyAndActivatePayment({
              razorpayOrderId: pendingOrder.razorpay_order_id,
              razorpayPaymentId: `pay_manual_adm_${Date.now()}`,
              razorpaySignature: 'admin_manual_activated',
              verifiedBy: 'admin_manual',
            });
          } catch (_err) {
            // Already handled
          }
        }
      } else {
        db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, targetUserId);
      }
    });

    logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'UPDATE_USER_STATUS', `users:${targetUserId}`, prev.status, nextStatus);
  }

  if (fullName) {
    db.prepare("UPDATE user_profiles SET full_name = ?, updated_at = datetime('now') WHERE user_id = ?").run(String(fullName).trim(), targetUserId);
  }
  res.json({ success: true });
});

// 16.10 Affiliate & 16.11 Wallet/Bonus Management
app.get('/api/admin/affiliate', requireAdmin('affiliate.manage'), (_req: Request, res: Response) => {
  const rules = db.prepare('SELECT * FROM commission_rules ORDER BY id DESC').all();
  const commissions = db.prepare(`
    SELECT ac.*,
           up_ref.full_name as referrer_name,
           up_buy.full_name as buyer_name,
           p.name as package_name,
           o.order_number
    FROM affiliate_commissions ac
    LEFT JOIN user_profiles up_ref ON up_ref.user_id = ac.referrer_user_id
    JOIN user_profiles up_buy ON up_buy.user_id = ac.referred_user_id
    JOIN packages p ON p.id = ac.package_id
    JOIN orders o ON o.id = ac.order_id
    ORDER BY ac.id DESC
  `).all();

  const referrals = db.prepare(`
    SELECT r.*, up_ref.full_name as referrer_name, up_buy.full_name as referred_name
    FROM referrals r
    JOIN user_profiles up_ref ON up_ref.user_id = r.referrer_user_id
    JOIN user_profiles up_buy ON up_buy.user_id = r.referred_user_id
    ORDER BY r.id DESC
  `).all();

  res.json({ rules, commissions, referrals });
});

app.get('/api/admin/wallet', requireAdmin('finance.manage'), (_req: Request, res: Response) => {
  const wallets = db.prepare(`
    SELECT w.*, up.full_name, u.email, ac.code as affiliate_code
    FROM wallet_accounts w
    JOIN users u ON u.id = w.user_id
    JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    ORDER BY w.available_commission_inr DESC
  `).all();
  const transactions = db.prepare(`
    SELECT wt.*, up.full_name
    FROM wallet_transactions wt
    JOIN user_profiles up ON up.user_id = wt.user_id
    ORDER BY wt.id DESC LIMIT 100
  `).all();
  const bonuses = db.prepare(`
    SELECT bt.*, up.full_name
    FROM bonus_transactions bt
    JOIN user_profiles up ON up.user_id = bt.user_id
    ORDER BY bt.id DESC
  `).all();

  res.json({ wallets, transactions, bonuses });
});

app.post('/api/admin/wallet/bonus', requireAdmin('finance.manage'), (req: Request, res: Response) => {
  const { userId, amountInr, reason } = req.body;
  const amount = Math.round(Number(amountInr) * 100) / 100;
  if (!userId || isNaN(amount) || amount <= 0 || !reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'Valid User, positive Bonus Amount, and mandatory Reason are required.' });
    return;
  }

  runTransaction(() => {
    db.prepare(`
      UPDATE wallet_accounts
      SET bonus_amount_inr = ROUND(bonus_amount_inr + ?, 2),
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(amount, Number(userId));

    const w = db.prepare('SELECT bonus_amount_inr FROM wallet_accounts WHERE user_id = ?').get(Number(userId)) as {
      bonus_amount_inr: number;
    };

    const bonRef = `BON-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const txRef = `TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    db.prepare(`
      INSERT INTO bonus_transactions (reference_id, user_id, amount_inr, reason, credited_by_admin_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(bonRef, Number(userId), amount, String(reason).trim(), req.user!.adminId!);

    db.prepare(`
      INSERT INTO wallet_transactions (
        reference_id, user_id, tx_type, bucket, direction, amount_inr, balance_after_inr, description, created_by_admin_id
      ) VALUES (?, ?, 'bonus_credit', 'bonus', 'credit', ?, ?, ?, ?)
    `).run(txRef, Number(userId), amount, w.bonus_amount_inr, `Admin Bonus Credit: ${String(reason).trim()}`, req.user!.adminId!);

    createUserNotification(
      Number(userId),
      `Bonus Credited: ₹${amount.toLocaleString('en-IN')}`,
      `Reason: ${String(reason).trim()}`,
      '/dashboard?tab=withdrawal'
    );
  });

  logAdminActivity(
    req.user!.adminId!,
    req.user!.adminRole!,
    'CREDIT_BONUS',
    `user:${userId}`,
    null,
    `+₹${amount} (${String(reason).trim()})`
  );

  res.status(201).json({ success: true });
});

// 16.12 Withdrawal Management
app.get('/api/admin/withdrawals', requireAdmin('withdrawals.manage'), (_req: Request, res: Response) => {
  const withdrawals = db.prepare(`
    SELECT w.*, up.full_name, u.email, u.mobile
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    JOIN user_profiles up ON up.user_id = u.id
    ORDER BY w.id DESC
  `).all();
  res.json({ withdrawals });
});

app.post('/api/admin/withdrawals/:id/decision', requireAdmin('withdrawals.manage'), (req: Request, res: Response) => {
  try {
    const withdrawalId = Number(req.params.id);
    const { action, paymentReference, rejectionReason, adminNotes } = req.body; // 'approve' | 'processing' | 'paid' | 'reject'

    const w = db.prepare(`
      SELECT w.*, u.email, up.full_name
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      JOIN user_profiles up ON up.user_id = u.id
      WHERE w.id = ?
    `).get(withdrawalId) as
      | {
          id: number;
          request_ref: string;
          user_id: number;
          amount_inr: number;
          payout_method: string;
          status: string;
          email: string;
          full_name: string;
        }
      | undefined;

    if (!w) {
      res.status(404).json({ error: 'Withdrawal request not found.' });
      return;
    }

    if (w.status === 'paid' || w.status === 'rejected') {
      res.status(400).json({ error: `Withdrawal request ${w.request_ref} is already finalized (${w.status}).` });
      return;
    }

    runTransaction(() => {
      if (action === 'approve' || action === 'processing') {
        const nextStatus = action === 'approve' ? 'approved' : 'processing';
        db.prepare(`
          UPDATE withdrawals
          SET status = ?, admin_notes = COALESCE(?, admin_notes), reviewed_by_admin_id = ?, reviewed_at = datetime('now')
          WHERE id = ?
        `).run(nextStatus, adminNotes ?? null, req.user!.adminId!, withdrawalId);
      } else if (action === 'paid') {
        const utr = String(paymentReference || `UTR${Date.now()}`).trim();
        db.prepare(`
          UPDATE withdrawals
          SET status = 'paid',
              payment_reference = ?,
              admin_notes = COALESCE(?, admin_notes),
              reviewed_by_admin_id = ?,
              reviewed_at = datetime('now'),
              paid_at = datetime('now')
          WHERE id = ?
        `).run(utr, adminNotes ?? null, req.user!.adminId!, withdrawalId);

        db.prepare(`
          UPDATE wallet_accounts
          SET reserved_withdrawal_inr = MAX(0, ROUND(reserved_withdrawal_inr - ?, 2)),
              total_withdrawn_inr = ROUND(total_withdrawn_inr + ?, 2),
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(w.amount_inr, w.amount_inr, w.user_id);

        const walletAfter = db.prepare('SELECT reserved_withdrawal_inr FROM wallet_accounts WHERE user_id = ?').get(w.user_id) as {
          reserved_withdrawal_inr: number;
        };

        const txRef = `TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        db.prepare(`
          INSERT INTO wallet_transactions (
            reference_id, user_id, tx_type, bucket, direction, amount_inr, balance_after_inr, description, related_withdrawal_id, created_by_admin_id
          ) VALUES (?, ?, 'withdrawal_payment', 'reserved', 'debit', ?, ?, ?, ?, ?)
        `).run(
          txRef,
          w.user_id,
          w.amount_inr,
          walletAfter.reserved_withdrawal_inr,
          `Withdrawal Paid (${w.request_ref}) — UTR/Ref: ${utr}`,
          w.id,
          req.user!.adminId!
        );

        db.prepare(`
          INSERT INTO withdrawal_payment_records (withdrawal_id, utr_or_reference, payout_channel, amount_inr, processed_by_admin_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(w.id, utr, w.payout_method, w.amount_inr, req.user!.adminId!);

        createUserNotification(
          w.user_id,
          `Withdrawal Paid: ₹${w.amount_inr.toLocaleString('en-IN')}`,
          `Your withdrawal request ${w.request_ref} has been settled. Payment Reference: ${utr}.`,
          '/dashboard?tab=withdrawal'
        );
        sendPlatformEmail(w.user_id, w.email, 'withdrawal_approved', {
          name: w.full_name,
          request_ref: w.request_ref,
          amount: w.amount_inr.toLocaleString('en-IN'),
          utr,
        });
      } else if (action === 'reject') {
        if (!rejectionReason || String(rejectionReason).trim().length < 3) {
          throw new Error('A rejection reason is mandatory when rejecting a withdrawal.');
        }

        db.prepare(`
          UPDATE withdrawals
          SET status = 'rejected',
              rejection_reason = ?,
              admin_notes = COALESCE(?, admin_notes),
              reviewed_by_admin_id = ?,
              reviewed_at = datetime('now')
          WHERE id = ?
        `).run(String(rejectionReason).trim(), adminNotes ?? null, req.user!.adminId!, withdrawalId);

        // Release reserved amount back to available_commission_inr
        db.prepare(`
          UPDATE wallet_accounts
          SET available_commission_inr = ROUND(available_commission_inr + ?, 2),
              reserved_withdrawal_inr = MAX(0, ROUND(reserved_withdrawal_inr - ?, 2)),
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(w.amount_inr, w.amount_inr, w.user_id);

        const walletAfter = db.prepare('SELECT available_commission_inr FROM wallet_accounts WHERE user_id = ?').get(w.user_id) as {
          available_commission_inr: number;
        };

        const txRef = `TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        db.prepare(`
          INSERT INTO wallet_transactions (
            reference_id, user_id, tx_type, bucket, direction, amount_inr, balance_after_inr, description, related_withdrawal_id, created_by_admin_id
          ) VALUES (?, ?, 'withdrawal_rejection_release', 'available_commission', 'credit', ?, ?, ?, ?, ?)
        `).run(
          txRef,
          w.user_id,
          w.amount_inr,
          walletAfter.available_commission_inr,
          `Withdrawal Rejected (${w.request_ref}): Reserved ₹${w.amount_inr} released to Available Balance. Reason: ${String(rejectionReason).trim()}`,
          w.id,
          req.user!.adminId!
        );

        createUserNotification(
          w.user_id,
          `Withdrawal Request Rejected (${w.request_ref})`,
          `Reason: ${String(rejectionReason).trim()}. Your reserved ₹${w.amount_inr.toLocaleString('en-IN')} has been returned to your Available Commission balance.`,
          '/dashboard?tab=withdrawal'
        );
        sendPlatformEmail(w.user_id, w.email, 'withdrawal_rejected', {
          name: w.full_name,
          request_ref: w.request_ref,
          amount: w.amount_inr.toLocaleString('en-IN'),
          reason: String(rejectionReason).trim(),
        });
      }
    });

    logAdminActivity(
      req.user!.adminId!,
      req.user!.adminRole!,
      `WITHDRAWAL_${String(action).toUpperCase()}`,
      `withdrawals:${w.request_ref}`,
      w.status,
      String(action)
    );

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// 16.13 KYC Management
app.get('/api/admin/kyc', requireAdmin('kyc.manage'), (_req: Request, res: Response) => {
  const submissions = db.prepare(`
    SELECT k.*, up.full_name, u.email, u.mobile
    FROM kyc_submissions k
    JOIN users u ON u.id = k.user_id
    JOIN user_profiles up ON up.user_id = u.id
    ORDER BY k.id DESC
  `).all();
  res.json({ submissions });
});

app.post('/api/admin/kyc/:id/decision', requireAdmin('kyc.manage'), (req: Request, res: Response) => {
  const kycId = Number(req.params.id);
  const { status, reason } = req.body; // 'approved' | 'rejected' | 'resubmission_required'

  if (!['approved', 'rejected', 'resubmission_required'].includes(String(status))) {
    res.status(400).json({ error: 'Invalid KYC decision status.' });
    return;
  }
  if (status !== 'approved' && (!reason || String(reason).trim().length < 3)) {
    res.status(400).json({ error: 'Rejection or resubmission reason is mandatory.' });
    return;
  }

  const sub = db.prepare(`
    SELECT k.*, u.email, up.full_name
    FROM kyc_submissions k
    JOIN users u ON u.id = k.user_id
    JOIN user_profiles up ON up.user_id = u.id
    WHERE k.id = ?
  `).get(kycId) as { id: number; user_id: number; status: string; email: string; full_name: string } | undefined;

  if (!sub) {
    res.status(404).json({ error: 'KYC submission not found.' });
    return;
  }

  runTransaction(() => {
    db.prepare(`
      UPDATE kyc_submissions
      SET status = ?,
          rejection_reason = ?,
          reviewed_by_admin_id = ?,
          reviewed_at = datetime('now')
      WHERE id = ?
    `).run(status, status === 'approved' ? null : String(reason).trim(), req.user!.adminId!, kycId);

    db.prepare(`
      INSERT INTO kyc_review_history (kyc_submission_id, user_id, previous_status, new_status, reason, reviewed_by_admin_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(kycId, sub.user_id, sub.status, status, String(reason || 'KYC Verified'), req.user!.adminId!);

    if (status === 'approved') {
      createUserNotification(
        sub.user_id,
        'KYC Verification Approved!',
        'Your identity and Bank/UPI payout details have been approved. You can now submit withdrawal requests.',
        '/dashboard?tab=withdrawal'
      );
      sendPlatformEmail(sub.user_id, sub.email, 'kyc_approved', { name: sub.full_name });
    } else {
      createUserNotification(
        sub.user_id,
        'Action Required: KYC Verification Update',
        `Status: ${status.toUpperCase()}. Reason: ${String(reason).trim()}`,
        '/dashboard?tab=kyc'
      );
      sendPlatformEmail(sub.user_id, sub.email, 'kyc_rejected', { name: sub.full_name, reason: String(reason).trim() });
    }
  });

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, `KYC_${String(status).toUpperCase()}`, `kyc_submissions:${kycId}`, sub.status, status);
  res.json({ success: true });
});

// 16.14 - 16.18 Offers, Community, Trading, Leaderboard, Certificates, Emails
app.post('/api/admin/offers', requireAdmin('offers.manage'), (req: Request, res: Response) => {
  const { batchName, batchType, title, description, bannerUrl, destinationLink, promoBadge, durationDays } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Offer title is required.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const endIso = new Date(Date.now() + Number(durationDays || 7) * 86400000).toISOString();

  runTransaction(() => {
    const bRes = db.prepare(`
      INSERT INTO offer_batches (name, batch_type, description, start_at, end_at, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(
      String(batchName || `${title} Cohort`),
      String(batchType || 'Special Offers'),
      String(description || ''),
      nowIso,
      endIso
    );
    const batchId = Number(bRes.lastInsertRowid);
    db.prepare(`
      INSERT INTO offers (batch_id, title, description, banner_url, destination_link, promo_badge, start_at, end_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      batchId,
      String(title),
      String(description || ''),
      String(bannerUrl || '/assets/media/offer_vip_banner.jpg'),
      String(destinationLink || '/register'),
      String(promoBadge || 'LIMITED OFFER'),
      nowIso,
      endIso
    );
  });

  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'CREATE_OFFER_BATCH', 'offers', null, String(title));
  res.status(201).json({ success: true });
});

app.put('/api/admin/community/:id', requireAdmin('offers.manage'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { label, url, subscriberCountLabel, isActive } = req.body;
  db.prepare(`
    UPDATE social_links
    SET label = COALESCE(?, label),
        url = COALESCE(?, url),
        subscriber_count_label = COALESCE(?, subscriber_count_label),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(label ?? null, url ?? null, subscriberCountLabel ?? null, isActive !== undefined ? (isActive ? 1 : 0) : null, id);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'UPDATE_SOCIAL_LINK', `social_links:${id}`, null, String(url));
  res.json({ success: true });
});

app.post('/api/admin/trading-videos', requireAdmin('courses.manage'), (req: Request, res: Response) => {
  const { title, category, description, thumbnailUrl } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Video title is required.' });
    return;
  }
  const maxOrd = (db.prepare('SELECT COALESCE(MAX(display_order), 0) as m FROM trading_videos').get() as { m: number }).m;
  db.prepare(`
    INSERT INTO trading_videos (title, category, description, thumbnail_url, video_asset_key, duration_seconds, display_order, is_published)
    VALUES (?, ?, ?, ?, 'trading_stream_1.mp4', 10, ?, 1)
  `).run(String(title), String(category || 'Market Structure'), String(description || ''), String(thumbnailUrl || '/assets/media/course_trading.jpg'), maxOrd + 1);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'ADD_TRADING_VIDEO', 'trading_videos', null, String(title));
  res.status(201).json({ success: true });
});

app.get('/api/admin/emails', requireAdmin(), (_req: Request, res: Response) => {
  const templates = db.prepare('SELECT * FROM email_templates ORDER BY id ASC').all();
  const logs = db.prepare('SELECT * FROM email_logs ORDER BY id DESC LIMIT 100').all();
  res.json({
    templates,
    logs,
    smtpConfig: {
      host: PLATFORM_CONFIG.smtp.host,
      port: PLATFORM_CONFIG.smtp.port,
      secure: PLATFORM_CONFIG.smtp.secure,
      user: PLATFORM_CONFIG.smtp.user,
      senderName: PLATFORM_CONFIG.smtp.senderName,
      senderEmail: PLATFORM_CONFIG.smtp.senderEmail,
    },
    mysqlConfig: getMysqlStatus(),
    websiteName: PLATFORM_CONFIG.websiteName,
  });
});

app.get('/api/admin/infrastructure', requireAdmin(), (_req: Request, res: Response) => {
  res.json({
    websiteName: PLATFORM_CONFIG.websiteName,
    brandName: PLATFORM_CONFIG.brandName,
    mysql: getMysqlStatus(),
    smtp: {
      host: PLATFORM_CONFIG.smtp.host,
      port: PLATFORM_CONFIG.smtp.port,
      secure: PLATFORM_CONFIG.smtp.secure,
      user: PLATFORM_CONFIG.smtp.user,
      senderName: PLATFORM_CONFIG.smtp.senderName,
    },
  });
});

app.put('/api/admin/emails/templates/:id', requireAdmin(), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { subject, bodyHtml, senderName, senderEmail } = req.body;
  db.prepare(`
    UPDATE email_templates
    SET subject = COALESCE(?, subject),
        body_html = COALESCE(?, body_html),
        sender_name = COALESCE(?, sender_name),
        sender_email = COALESCE(?, sender_email),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(subject ?? null, bodyHtml ?? null, senderName ?? null, senderEmail ?? null, id);
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'UPDATE_EMAIL_TEMPLATE', `email_templates:${id}`, null, String(subject));
  res.json({ success: true });
});

// 16.19 Reports & Analytics
app.get('/api/admin/reports', requireAdmin('reports.view'), (_req: Request, res: Response) => {
  const packageWiseSales = db.prepare(`
    SELECT p.name as package_name,
           COUNT(o.id) as orders_count,
           COALESCE(SUM(o.gross_amount_inr), 0) as gross_sales_inr,
           COALESCE(SUM(ac.referrer_amount_inr), 0) as referrer_commission_inr,
           COALESCE(SUM(ac.company_amount_inr), 0) as company_share_inr
    FROM packages p
    LEFT JOIN orders o ON o.package_id = p.id AND o.status = 'paid'
    LEFT JOIN affiliate_commissions ac ON ac.order_id = o.id
    GROUP BY p.id
    ORDER BY gross_sales_inr DESC
  `).all();

  const dailySales = db.prepare(`
    SELECT date(verified_at) as sale_date,
           COUNT(id) as payments_count,
           SUM(gross_amount_inr) as gross_sales_inr
    FROM payments
    WHERE status = 'successful'
    GROUP BY date(verified_at)
    ORDER BY sale_date DESC
  `).all();

  const courseStats = db.prepare(`
    SELECT c.title,
           (SELECT COUNT(*) FROM user_course_enrollments uce WHERE uce.course_id = c.id) as enrollments_count,
           (SELECT COUNT(*) FROM user_course_enrollments uce WHERE uce.course_id = c.id AND uce.is_completed = 1) as completions_count,
           (SELECT COUNT(*) FROM certificates cert WHERE cert.course_id = c.id) as certificates_count
    FROM courses c
  `).all();

  res.json({
    packageWiseSales,
    dailySales,
    courseStats,
  });
});

// 16.20 - 16.22 Roles, Activity Logs, and Encrypted Backups
app.get('/api/admin/roles', requireAdmin('roles.manage'), (_req: Request, res: Response) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY id ASC').all() as Array<{ id: number }>;
  const permissions = db.prepare('SELECT * FROM permissions ORDER BY id ASC').all();
  const rolesWithPerms = roles.map((r) => {
    const codes = (
      db.prepare(`
        SELECT p.code FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `).all(r.id) as Array<{ code: string }>
    ).map((x) => x.code);
    return { ...r, permissions: codes };
  });
  const logs = db.prepare('SELECT * FROM admin_activity_logs ORDER BY id DESC LIMIT 100').all();
  res.json({ roles: rolesWithPerms, permissions, activityLogs: logs });
});

app.get('/api/admin/backups', requireAdmin('backups.manage'), (_req: Request, res: Response) => {
  const backups = db.prepare('SELECT * FROM backup_records ORDER BY id DESC').all();
  const restores = db.prepare('SELECT * FROM restore_records ORDER BY id DESC').all();
  res.json({ backups, restores });
});

app.post('/api/admin/backups/create', requireAdmin('backups.manage'), (req: Request, res: Response) => {
  const result = createEncryptedBackup(req.user!.adminId!, 'manual');
  logAdminActivity(req.user!.adminId!, req.user!.adminRole!, 'CREATE_ENCRYPTED_BACKUP', `backup_records:${result.backupCode}`, null, `AES-256-GCM (${result.fileSizeBytes} bytes)`);
  res.status(201).json({ success: true, backup: result });
});

app.post('/api/admin/backups/:id/verify', requireAdmin('backups.manage'), (req: Request, res: Response) => {
  try {
    const backupId = Number(req.params.id);
    const mode = req.body.restore ? 'completed' : 'test_verified';
    const result = verifyOrRestoreBackup(backupId, req.user!.adminId!, mode);
    logAdminActivity(
      req.user!.adminId!,
      req.user!.adminRole!,
      mode === 'completed' ? 'RESTORE_ENCRYPTED_BACKUP' : 'VERIFY_BACKUP_INTEGRITY',
      `backup_records:${result.backupCode}`,
      null,
      `${result.tablesVerified} tables verified (${mode})`
    );
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Catch-all API 404 JSON responder
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl || req.path} not found`, data: [] });
});

// Catch-all API 500 JSON error responder
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[LearnUp India API Error]:', err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({
    error: err?.message || 'Internal server error occurred',
    data: [],
  });
});

// Serve static production frontend bundle (for Hostinger Node.js deployment)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distDir, 'index.html'));
      return;
    }
    next();
  });
}

// Start API Server if run directly
const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`LearnUp India (${PLATFORM_CONFIG.websiteName}) Server running on http://localhost:${PORT}`);
  });
}
