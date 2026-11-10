import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { PLATFORM_CONFIG } from './config.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'edurt.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function runTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

export function generateUniqueAffiliateCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const checkStmt = db.prepare('SELECT id FROM affiliate_codes WHERE code = ?');
  for (let attempt = 0; attempt < 500; attempt++) {
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const d1 = digits[Math.floor(Math.random() * digits.length)];
    const d2 = digits[Math.floor(Math.random() * digits.length)];
    const d3 = digits[Math.floor(Math.random() * digits.length)];
    const d4 = digits[Math.floor(Math.random() * digits.length)];
    const candidate = `${l1}${l2}${d1}${d2}${d3}${d4}`;
    const existing = checkStmt.get(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error('Unable to generate unique affiliate code');
}

export function getBusinessDateIST(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function initializeDatabase(): void {
  db.exec(`
    -- 1. USER AND AUTHENTICATION
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      referred_by_user_id INTEGER REFERENCES users(id),
      referred_by_code TEXT,
      referral_locked INTEGER NOT NULL DEFAULT 1,
      acquisition_source TEXT NOT NULL DEFAULT 'company',
      created_by_admin_id INTEGER,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      profile_photo TEXT,
      gender TEXT,
      state TEXT,
      district TEXT,
      terms_accepted INTEGER NOT NULL DEFAULT 1,
      terms_accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      department TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_plain_dev TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. AFFILIATE
    CREATE TABLE IF NOT EXISTS affiliate_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      code TEXT NOT NULL UNIQUE,
      clicks INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commission_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      referrer_percentage REAL NOT NULL DEFAULT 70.0,
      company_percentage REAL NOT NULL DEFAULT 30.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_user_id INTEGER NOT NULL REFERENCES users(id),
      referred_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      affiliate_code TEXT NOT NULL,
      locked_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'registered'
    );

    -- 3. PACKAGES AND PAYMENTS
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tagline TEXT,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      price_inr REAL NOT NULL,
      benefits_json TEXT NOT NULL DEFAULT '[]',
      duration_label TEXT NOT NULL DEFAULT 'Lifetime Access',
      badge_text TEXT,
      display_order INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      package_id INTEGER NOT NULL REFERENCES packages(id),
      package_name_snapshot TEXT NOT NULL,
      gross_amount_inr REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_order_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'created',
      no_refund_accepted INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT UNIQUE,
      razorpay_signature TEXT,
      payment_method TEXT NOT NULL DEFAULT 'razorpay',
      gross_amount_inr REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      signature TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commission_ref TEXT NOT NULL UNIQUE,
      payment_id INTEGER NOT NULL UNIQUE REFERENCES payments(id),
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
      referrer_user_id INTEGER REFERENCES users(id),
      referred_user_id INTEGER NOT NULL REFERENCES users(id),
      package_id INTEGER NOT NULL REFERENCES packages(id),
      gross_package_price_inr REAL NOT NULL,
      referrer_percentage REAL NOT NULL,
      referrer_amount_inr REAL NOT NULL,
      company_percentage REAL NOT NULL,
      company_amount_inr REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      credited_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 4. COURSES & LMS
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      thumbnail_url TEXT NOT NULL,
      short_description TEXT NOT NULL,
      overview TEXT NOT NULL,
      learning_objectives_json TEXT NOT NULL DEFAULT '[]',
      instructor_name TEXT NOT NULL DEFAULT 'LearnUp India Faculty',
      level TEXT NOT NULL DEFAULT 'Comprehensive',
      status TEXT NOT NULL DEFAULT 'active',
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS package_courses (
      package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      PRIMARY KEY (package_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS course_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      video_asset_key TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 10,
      is_compulsory INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      package_id INTEGER NOT NULL REFERENCES packages(id),
      order_id INTEGER REFERENCES orders(id),
      access_type TEXT NOT NULL DEFAULT 'lifetime',
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      last_position_seconds INTEGER NOT NULL DEFAULT 0,
      watched_seconds_json TEXT NOT NULL DEFAULT '[]',
      verified_percent REAL NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      passing_percentage REAL NOT NULL DEFAULT 70.0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      is_required INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_type TEXT NOT NULL DEFAULT 'single_choice',
      question_text TEXT NOT NULL,
      explanation TEXT,
      points INTEGER NOT NULL DEFAULT 10,
      display_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quiz_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score_percentage REAL NOT NULL,
      earned_points INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      answers_json TEXT NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      due_days INTEGER,
      allowed_file_types TEXT NOT NULL DEFAULT '.pdf,.doc,.docx,.txt,.png,.jpg,.zip',
      max_upload_mb INTEGER NOT NULL DEFAULT 10,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      is_required INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      submission_text TEXT,
      file_url TEXT,
      file_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      feedback TEXT,
      reviewed_by_admin_id INTEGER,
      reviewed_at TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      recipient_name TEXT NOT NULL,
      course_title TEXT NOT NULL,
      company_name TEXT NOT NULL DEFAULT 'LearnUp India (learnupindia.com)',
      signatory_name TEXT NOT NULL DEFAULT 'Dr. Vikramaditya Sen, Dean of Academic Standards',
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id)
    );

    -- 5. WALLET AND WITHDRAWALS
    CREATE TABLE IF NOT EXISTS wallet_accounts (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      available_commission_inr REAL NOT NULL DEFAULT 0.0,
      pending_commission_inr REAL NOT NULL DEFAULT 0.0,
      bonus_amount_inr REAL NOT NULL DEFAULT 0.0,
      reserved_withdrawal_inr REAL NOT NULL DEFAULT 0.0,
      total_withdrawn_inr REAL NOT NULL DEFAULT 0.0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      tx_type TEXT NOT NULL,
      bucket TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount_inr REAL NOT NULL,
      balance_after_inr REAL NOT NULL,
      description TEXT NOT NULL,
      related_payment_id INTEGER,
      related_withdrawal_id INTEGER,
      created_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bonus_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount_inr REAL NOT NULL,
      reason TEXT NOT NULL,
      credited_by_admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount_inr REAL NOT NULL,
      payout_method TEXT NOT NULL,
      account_holder_name TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      upi_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      rejection_reason TEXT,
      admin_notes TEXT,
      payment_reference TEXT,
      business_date_ist TEXT NOT NULL,
      reviewed_by_admin_id INTEGER,
      reviewed_at TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS withdrawal_payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdrawal_id INTEGER NOT NULL UNIQUE REFERENCES withdrawals(id),
      utr_or_reference TEXT NOT NULL UNIQUE,
      payout_channel TEXT NOT NULL,
      amount_inr REAL NOT NULL,
      processed_by_admin_id INTEGER NOT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 6. KYC SYSTEM
    CREATE TABLE IF NOT EXISTS kyc_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      aadhaar_number_masked TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_holder_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      upi_id TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      gender TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      rejection_reason TEXT,
      reviewed_by_admin_id INTEGER,
      reviewed_at TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kyc_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kyc_submission_id INTEGER NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL DEFAULT 'aadhaar',
      protected_file_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kyc_review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kyc_submission_id INTEGER NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      reason TEXT,
      reviewed_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 7. WEBSITE CMS & PAGE BUILDER
    CREATE TABLE IF NOT EXISTS website_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_description TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      published_version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      section_type TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      content_json TEXT NOT NULL DEFAULT '{}',
      draft_content_json TEXT NOT NULL DEFAULT '{}',
      is_visible INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_content (
      key TEXT PRIMARY KEY,
      published_json TEXT NOT NULL,
      draft_json TEXT NOT NULL,
      has_unpublished_changes INTEGER NOT NULL DEFAULT 0,
      updated_by_admin_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      uploaded_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS page_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      note TEXT,
      created_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 8. OTHER MODULES
    CREATE TABLE IF NOT EXISTS trading_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      video_asset_key TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 10,
      display_order INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rank INTEGER NOT NULL,
      eligible_earnings_inr REAL NOT NULL,
      is_excluded INTEGER NOT NULL DEFAULT 0,
      computed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      subscriber_count_label TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS offer_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      batch_type TEXT NOT NULL,
      description TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES offer_batches(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      banner_url TEXT NOT NULL,
      destination_link TEXT,
      promo_badge TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      action_link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT 'LearnUp India Team',
      sender_email TEXT NOT NULL DEFAULT 'team@learnupindia.com',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      recipient_email TEXT NOT NULL,
      template_key TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_preview TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'delivered',
      error_message TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 9. ADMIN AND SECURITY
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_role TEXT NOT NULL,
      action TEXT NOT NULL,
      affected_record TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_category TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id INTEGER,
      summary TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_by_admin_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_code TEXT NOT NULL UNIQUE,
      backup_type TEXT NOT NULL,
      includes_db INTEGER NOT NULL DEFAULT 1,
      includes_media INTEGER NOT NULL DEFAULT 1,
      encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      verified_at TEXT,
      created_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restore_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id INTEGER NOT NULL REFERENCES backup_records(id),
      status TEXT NOT NULL,
      notes TEXT,
      restored_by_admin_id INTEGER NOT NULL,
      restored_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const existingRoles = db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number };
  if (existingRoles.cnt > 0) {
    return;
  }

  seedInitialData();
}

function seedInitialData(): void {
  runTransaction(() => {
    const rolesData = [
      ['Super Admin', 'super_admin', 'Full unrestricted access to all platform modules, security, and backups'],
      ['Master Admin', 'master_admin', 'Broad platform management across CMS, users, packages, courses, and operations'],
      ['Finance Admin', 'finance_admin', 'Manages payments, affiliate commissions, wallets, bonuses, withdrawals, and financial reports'],
      ['Course Manager', 'course_manager', 'Manages courses, modules, video lessons, quizzes, assignments, and certificates'],
      ['KYC Admin', 'kyc_admin', 'Reviews and verifies user KYC documents and identity submissions'],
      ['Support Admin', 'support_admin', 'Handles user support inquiries and permitted account status management'],
    ];

    const insertRole = db.prepare('INSERT INTO roles (name, slug, description) VALUES (?, ?, ?)');
    for (const [name, slug, desc] of rolesData) {
      insertRole.run(name, slug, desc);
    }

    const permsData = [
      ['cms.manage', 'CMS', 'Edit website CMS, sections, media, and publish versions'],
      ['packages.manage', 'Packages', 'Create and edit learning packages and pricing'],
      ['courses.manage', 'Courses', 'Manage courses, lessons, quizzes, assignments, and certificates'],
      ['users.manage', 'Users', 'Create, view, edit, and suspend user accounts'],
      ['affiliate.manage', 'Affiliate', 'View affiliate hierarchy, commissions, and configure rules'],
      ['finance.manage', 'Finance', 'Manage wallet ledgers, bonus credits, and financial reports'],
      ['withdrawals.manage', 'Withdrawals', 'Approve, process, pay, or reject withdrawal requests'],
      ['kyc.manage', 'KYC', 'Inspect protected KYC documents and approve/reject KYC'],
      ['offers.manage', 'Offers', 'Manage promotional banners, batches, community, and leaderboard'],
      ['reports.view', 'Reports', 'View and export platform analytics and ledger reports'],
      ['roles.manage', 'Security', 'Configure admin roles, permissions, and view activity logs'],
      ['backups.manage', 'Backups', 'Create, verify, and restore encrypted platform backups'],
    ];

    const insertPerm = db.prepare('INSERT INTO permissions (code, module, description) VALUES (?, ?, ?)');
    for (const [code, mod, desc] of permsData) {
      insertPerm.run(code, mod, desc);
    }

    const rolePermMap: Record<string, string[]> = {
      super_admin: permsData.map((p) => p[0]),
      master_admin: ['cms.manage', 'packages.manage', 'courses.manage', 'users.manage', 'affiliate.manage', 'finance.manage', 'withdrawals.manage', 'kyc.manage', 'offers.manage', 'reports.view'],
      finance_admin: ['affiliate.manage', 'finance.manage', 'withdrawals.manage', 'reports.view'],
      course_manager: ['courses.manage', 'reports.view'],
      kyc_admin: ['kyc.manage', 'users.manage'],
      support_admin: ['users.manage', 'offers.manage'],
    };

    const insertRolePerm = db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.slug = ? AND p.code = ?
    `);
    for (const [roleSlug, codes] of Object.entries(rolePermMap)) {
      for (const code of codes) {
        insertRolePerm.run(roleSlug, code);
      }
    }

    // Commission Rule (Fixed 70% Referrer / 30% Company on Gross Selling Price)
    db.prepare(`
      INSERT INTO commission_rules (name, referrer_percentage, company_percentage, is_active)
      VALUES ('Standard Direct Referral Policy (70/30 Gross)', 70.0, 30.0, 1)
    `).run();

    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const ownerHash = bcrypt.hashSync(PLATFORM_CONFIG.smtp.pass, 10);
    const studentHash = bcrypt.hashSync('Student@123', 10);

    const createUserWithProfile = (
      email: string,
      mobile: string,
      hash: string,
      fullName: string,
      dob: string,
      affCode: string,
      referredById: number | null,
      referredByCode: string | null,
      source: string,
      state = 'Maharashtra',
      district = 'Mumbai'
    ): number => {
      const res = db.prepare(`
        INSERT INTO users (email, mobile, password_hash, status, referred_by_user_id, referred_by_code, referral_locked, acquisition_source)
        VALUES (?, ?, ?, 'active', ?, ?, 1, ?)
      `).run(email, mobile, hash, referredById, referredByCode, source);
      const userId = Number(res.lastInsertRowid);

      db.prepare(`
        INSERT INTO user_profiles (user_id, full_name, date_of_birth, gender, state, district)
        VALUES (?, ?, ?, 'Prefer not to say', ?, ?)
      `).run(userId, fullName, dob, state, district);

      db.prepare(`
        INSERT INTO affiliate_codes (user_id, code, clicks, is_active)
        VALUES (?, ?, ?, 1)
      `).run(userId, affCode, affCode === 'AB1234' ? 148 : 12);

      db.prepare(`
        INSERT INTO wallet_accounts (user_id, available_commission_inr, pending_commission_inr, bonus_amount_inr, reserved_withdrawal_inr, total_withdrawn_inr)
        VALUES (?, 0, 0, 0, 0, 0)
      `).run(userId);

      if (referredById && referredByCode) {
        db.prepare(`
          INSERT INTO referrals (referrer_user_id, referred_user_id, affiliate_code, status)
          VALUES (?, ?, ?, 'purchased')
        `).run(referredById, userId, referredByCode);
      }

      return userId;
    };

    const superAdminUserId = createUserWithProfile('admin@edurt.in', '9810000001', adminHash, 'Vikramaditya Sen (Super Admin)', '1986-04-12', 'AD1001', null, null, 'company');
    const financeAdminUserId = createUserWithProfile('finance@edurt.in', '9810000002', adminHash, 'Meera Krishnan (Finance Admin)', '1990-08-22', 'FN1002', null, null, 'company');
    const kycAdminUserId = createUserWithProfile('kyc@edurt.in', '9810000003', adminHash, 'Siddharth Verma (KYC Officer)', '1992-01-19', 'KY1003', null, null, 'company');
    const courseAdminUserId = createUserWithProfile('faculty@edurt.in', '9810000004', adminHash, 'Ananya Deshmukh (Course Dean)', '1989-11-05', 'CM1004', null, null, 'company');

    // Flagship Student & Affiliate User (#5: Aarav Mehta, Code: AB1234)
    const aaravId = createUserWithProfile('aarav.mehta@gmail.com', '9820456712', studentHash, 'Aarav Mehta', '1997-06-15', 'AB1234', null, null, 'company', 'Karnataka', 'Bengaluru Urban');
    // Referred Students by Aarav (AB1234)
    const priyaId = createUserWithProfile('priya.nair@gmail.com', '9845112233', studentHash, 'Priya Nair', '1999-03-21', 'PN2048', aaravId, 'AB1234', 'referral', 'Kerala', 'Ernakulam');
    const rohanId = createUserWithProfile('rohan.kapoor@gmail.com', '9871223344', studentHash, 'Rohan Kapoor', '1996-09-10', 'RK3091', aaravId, 'AB1234', 'referral', 'Delhi', 'New Delhi');
    const kavyaId = createUserWithProfile('kavya.sharma@gmail.com', '9899334455', studentHash, 'Kavya Sharma', '1998-12-03', 'KS4102', aaravId, 'AB1234', 'referral', 'Telangana', 'Hyderabad');

    // Official LearnUp India Owner / Super Admin Account (team@learnupindia.com)
    const learnupOwnerId = createUserWithProfile('team@learnupindia.com', '9810000009', ownerHash, 'LearnUp India Executive Team', '1988-01-01', 'LU1009', null, null, 'company');

    // Register Admin Roles
    db.prepare(`INSERT INTO admin_users (user_id, role_id, department) VALUES (?, (SELECT id FROM roles WHERE slug='super_admin'), 'Executive Governance')`).run(superAdminUserId);
    db.prepare(`INSERT INTO admin_users (user_id, role_id, department) VALUES (?, (SELECT id FROM roles WHERE slug='finance_admin'), 'Treasury & Ledger')`).run(financeAdminUserId);
    db.prepare(`INSERT INTO admin_users (user_id, role_id, department) VALUES (?, (SELECT id FROM roles WHERE slug='kyc_admin'), 'Compliance & KYC')`).run(kycAdminUserId);
    db.prepare(`INSERT INTO admin_users (user_id, role_id, department) VALUES (?, (SELECT id FROM roles WHERE slug='course_manager'), 'Curriculum & LMS')`).run(courseAdminUserId);
    db.prepare(`INSERT INTO admin_users (user_id, role_id, department) VALUES (?, (SELECT id FROM roles WHERE slug='super_admin'), 'LearnUp India Founder Desk')`).run(learnupOwnerId);

    // Seed Courses
    const insertCourse = db.prepare(`
      INSERT INTO courses (title, slug, thumbnail_url, short_description, overview, learning_objectives_json, instructor_name, level, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    const c1 = Number(
      insertCourse.run(
        'High-Conversion Affiliate Systems & Funnel Architecture',
        'affiliate-systems-funnel-architecture',
        '/assets/media/course_affiliate.jpg',
        'Master ethical direct-response acquisition, attribution mechanics, and high-trust partner conversion workflows.',
        'An intensive, hands-on curriculum designed for modern digital entrepreneurs on LearnUp India. Learn how to construct high-converting educational funnels, build organic authority across content channels, and optimize direct referral economics with precision analytics.',
        JSON.stringify([
          'Design high-converting landing ecosystems and ethical referral workflows',
          'Master attribution tracking, audience segmentation, and organic distribution',
          'Build sustainable recurring partner pipelines without paid ad waste',
          'Analyze unit economics, gross margin splits, and conversion velocity',
        ]),
        'Prof. Devansh Kulkarni',
        'Foundation to Advanced',
        1
      ).lastInsertRowid
    );

    const c2 = Number(
      insertCourse.run(
        'Quantitative Price Action & Risk Management Foundations',
        'quantitative-price-action-risk-management',
        '/assets/media/course_trading.jpg',
        'Institutional market structure, position sizing mathematics, and disciplined drawdown control.',
        'Explore the mechanics of financial market liquidity, multi-timeframe structure, and quantitative risk management. Built strictly for educational mastery of capital preservation and probability-driven execution.',
        JSON.stringify([
          'Calculate exact position sizing using R-multiple risk frameworks',
          'Identify institutional liquidity zones and structural market shifts',
          'Implement strict daily and weekly drawdown circuit breakers',
          'Maintain an auditable quantitative execution journal',
        ]),
        'Siddharth Malhotra, CMT',
        'Intermediate',
        2
      ).lastInsertRowid
    );

    const c3 = Number(
      insertCourse.run(
        'AI-Driven Content Automation & Digital Product Scaling',
        'ai-content-automation-digital-scaling',
        '/assets/media/course_growth.jpg',
        'Scale executive media production, automated CRM pipelines, and enterprise community operations.',
        'Harness modern AI workflows to research, script, produce, and distribute authority content at 10x speed while maintaining bespoke editorial quality and high audience retention.',
        JSON.stringify([
          'Architect automated multi-channel content distribution pipelines',
          'Build high-retention video scripts and interactive learning assets',
          'Integrate conversational CRM workflows for inbound lead qualification',
          'Scale digital operations with zero headcount bloat',
        ]),
        'Dr. Ira Chatterjee',
        'Executive Advanced',
        3
      ).lastInsertRowid
    );

    const c4 = Number(
      insertCourse.run(
        'Full-Stack Web Mastery (React 19, Node.js & Cloud)',
        'full-stack-web-mastery',
        '/assets/media/course_growth.jpg',
        'Build robust enterprise web applications with React 19, TypeScript, RESTful Node APIs, and cloud deployments.',
        'Comprehensive hands-on curriculum taking you from modern JavaScript frameworks through enterprise backend architecture, database indexing, and automated cloud deployments.',
        JSON.stringify([
          'Master React 19 hooks, state management, and modern component lifecycle',
          'Engineer scalable Node.js and Express RESTful API backends with authentication',
          'Implement relational database schemas, migrations, and query indexing',
          'Deploy resilient full-stack systems to cloud infrastructure with zero downtime',
        ]),
        'Prof. Arjun Sengupta',
        'Beginner to Advanced',
        4
      ).lastInsertRowid
    );

    const c5 = Number(
      insertCourse.run(
        'Cybersecurity & Enterprise Cloud DevSecOps',
        'cybersecurity-enterprise-devsecops',
        '/assets/media/course_trading.jpg',
        'Zero-trust network architecture, vulnerability management, cloud IAM, and automated CI/CD pipeline defense.',
        'Hands-on security engineering covering modern threat defense, cloud infrastructure hardening, secret management, and compliance standards.',
        JSON.stringify([
          'Architect zero-trust security postures across public cloud environments',
          'Implement automated static and dynamic security analysis in CI/CD pipelines',
          'Master cryptographic access control, tokens, and OAuth2 security patterns',
          'Conduct vulnerability assessments and security audit logging',
        ]),
        'Kabir Saxena, CISSP',
        'Intermediate to Advanced',
        5
      ).lastInsertRowid
    );

    const c6 = Number(
      insertCourse.run(
        'Financial Modeling & Venture Capital Valuation',
        'financial-modeling-venture-capital',
        '/assets/media/course_affiliate.jpg',
        'Three-statement financial modeling, DCF valuations, startup cap tables, and institutional investor pitch decks.',
        'Learn the rigorous financial modeling techniques used by venture capitalists and investment bankers to value growth companies and negotiate funding rounds.',
        JSON.stringify([
          'Build dynamic 3-statement integrated financial forecast models',
          'Execute DCF, comparable company, and precedent transaction valuations',
          'Structure startup capitalization tables, dilution, and SAFEs',
          'Design institutional-grade investment memorandums and unit economics models',
        ]),
        'Meera Krishnan, CFA',
        'Executive',
        6
      ).lastInsertRowid
    );

    const seedCourseContent = (courseId: number, prefix: string) => {
      const m1 = Number(
        db.prepare('INSERT INTO course_modules (course_id, title, description, display_order) VALUES (?, ?, ?, 1)').run(
          courseId,
          `Module 1: Core Architecture & Principles (${prefix})`,
          'Foundational frameworks, mental models, and operational setup.'
        ).lastInsertRowid
      );
      const m2 = Number(
        db.prepare('INSERT INTO course_modules (course_id, title, description, display_order) VALUES (?, ?, ?, 2)').run(
          courseId,
          `Module 2: Execution Playbooks & Case Studies (${prefix})`,
          'Step-by-step implementation walkthroughs and real-world optimization.'
        ).lastInsertRowid
      );

      const l1 = Number(
        db.prepare(`
          INSERT INTO lessons (course_id, module_id, title, description, video_asset_key, duration_seconds, is_compulsory, display_order)
          VALUES (?, ?, ?, ?, 'lesson_stream_1.mp4', 10, 1, 1)
        `).run(
          courseId,
          m1,
          `${prefix} — Lesson 1.1: Strategic Framework & Unit Economics`,
          'Watch the complete 10-second verified stream without skipping to unlock verified completion.'
        ).lastInsertRowid
      );

      const l2 = Number(
        db.prepare(`
          INSERT INTO lessons (course_id, module_id, title, description, video_asset_key, duration_seconds, is_compulsory, display_order)
          VALUES (?, ?, ?, ?, 'lesson_stream_2.mp4', 10, 1, 2)
        `).run(
          courseId,
          m2,
          `${prefix} — Lesson 2.1: Live Systems Implementation & Audit`,
          'Complete 100% verified playback of this compulsory lesson to qualify for certification.'
        ).lastInsertRowid
      );

      const quizId = Number(
        db.prepare(`
          INSERT INTO quizzes (course_id, title, description, passing_percentage, max_attempts, is_required)
          VALUES (?, ?, 'Complete this certification assessment with at least 70% score.', 70.0, 5, 1)
        `).run(courseId, `${prefix} Certification Assessment`).lastInsertRowid
      );

      const q1 = Number(
        db.prepare(`
          INSERT INTO quiz_questions (quiz_id, question_type, question_text, explanation, points, display_order)
          VALUES (?, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1)
        `).run(quizId).lastInsertRowid
      );
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct, display_order) VALUES (?, ?, ?, ?)').run(q1, '70% of Gross Package Selling Price', 1, 1);
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct, display_order) VALUES (?, ?, ?, ?)').run(q1, '50% after gateway fee deductions', 0, 2);
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct, display_order) VALUES (?, ?, ?, ?)').run(q1, '25% multi-level override', 0, 3);

      const q2 = Number(
        db.prepare(`
          INSERT INTO quiz_questions (quiz_id, question_type, question_text, explanation, points, display_order)
          VALUES (?, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2)
        `).run(quizId).lastInsertRowid
      );
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct, display_order) VALUES (?, ?, ?, ?)').run(q2, 'False — 100% verified watch progress is required', 1, 1);
      db.prepare('INSERT INTO quiz_options (question_id, option_text, is_correct, display_order) VALUES (?, ?, ?, ?)').run(q2, 'True — scrubbing to the end is sufficient', 0, 2);

      const assignId = Number(
        db.prepare(`
          INSERT INTO assignments (course_id, title, instructions, due_days, allowed_file_types, max_upload_mb, requires_approval, is_required)
          VALUES (?, ?, ?, 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1)
        `).run(
          courseId,
          `${prefix} Capstone Implementation Blueprint`,
          'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.'
        ).lastInsertRowid
      );

      return { l1, l2, quizId, assignId };
    };

    const c1Content = seedCourseContent(c1, 'Affiliate Systems');
    seedCourseContent(c2, 'Quantitative Risk');
    seedCourseContent(c3, 'AI Scaling');
    seedCourseContent(c4, 'Full-Stack Engineering');
    seedCourseContent(c5, 'Enterprise DevSecOps');
    seedCourseContent(c6, 'Venture Finance');

    // Seed Learning Packages
    const insertPkg = db.prepare(`
      INSERT INTO packages (name, slug, tagline, description, image_url, price_inr, benefits_json, duration_label, badge_text, display_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Lifetime Access', ?, ?, 'active')
    `);

    const pkgStarterId = Number(
      insertPkg.run(
        'Foundation Mastery Package',
        'foundation-mastery',
        'Essential digital acquisition & affiliate systems for emerging builders',
        'Gain lifetime access to our core High-Conversion Affiliate Systems curriculum, private learner notes, interactive assessments, and verified course certification on LearnUp India.',
        '/assets/media/pkg_starter.jpg',
        2999,
        JSON.stringify([
          'Lifetime Access to Core Affiliate Curriculum',
          '100% Verified Course Completion Certificate',
          'Direct Referral Affiliate Eligibility (70% Gross Commission)',
          'Private Lesson Notes & Interactive Quizzes',
          'Access to Free Educational Trading Library',
        ]),
        'ESSENTIAL',
        1
      ).lastInsertRowid
    );

    const pkgProId = Number(
      insertPkg.run(
        'Pro Accelerator Package',
        'pro-accelerator',
        'Dual-track mastery combining Affiliate Architecture & Quantitative Market Foundations',
        'Engineered for serious practitioners seeking both digital funnel mastery and quantitative risk management foundations, with priority assignment review.',
        '/assets/media/pkg_pro.jpg',
        5999,
        JSON.stringify([
          'Includes Everything in Foundation Mastery',
          'Quantitative Price Action & Risk Management Course',
          'Capstone Assignment Review & Faculty Feedback',
          '70% Direct Commission on Referred Package Sales',
          'Weekly Affiliate Leaderboard Eligibility',
        ]),
        'MOST POPULAR',
        2
      ).lastInsertRowid
    );

    const pkgEliteId = Number(
      insertPkg.run(
        'Elite Executive Summit Package',
        'elite-executive-summit',
        'Complete all-access institutional curriculum including AI Automation & Digital Scaling',
        'Our flagship all-inclusive package unlocking every course on LearnUp India, VIP Batch promotional cohorts, executive certification, and full affiliate partner privileges.',
        '/assets/media/pkg_elite.jpg',
        10000,
        JSON.stringify([
          'All 6 Flagship Courses Included (Lifetime Access)',
          'Full-Stack + Quantitative Trading + AI Automation + DevSecOps + Venture Finance',
          'Executive Separate Certificates for Every Completed Course',
          'VIP Batch & Promotional Cohort Access',
          '70% Gross Commission (₹7,000 per Elite Referral)',
        ]),
        'FLAGSHIP',
        3
      ).lastInsertRowid
    );

    const linkPkgCourse = db.prepare('INSERT INTO package_courses (package_id, course_id) VALUES (?, ?)');
    linkPkgCourse.run(pkgStarterId, c1);
    linkPkgCourse.run(pkgStarterId, c4);
    linkPkgCourse.run(pkgProId, c1);
    linkPkgCourse.run(pkgProId, c2);
    linkPkgCourse.run(pkgProId, c3);
    linkPkgCourse.run(pkgProId, c4);
    linkPkgCourse.run(pkgEliteId, c1);
    linkPkgCourse.run(pkgEliteId, c2);
    linkPkgCourse.run(pkgEliteId, c3);
    linkPkgCourse.run(pkgEliteId, c4);
    linkPkgCourse.run(pkgEliteId, c5);
    linkPkgCourse.run(pkgEliteId, c6);

    const now = new Date();
    const isoDaysAgo = (days: number) => {
      const d = new Date(now.getTime() - days * 86400000);
      return d.toISOString().replace('T', ' ').slice(0, 19);
    };

    const ord1Id = Number(
      db.prepare(`
        INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, razorpay_order_id, status, created_at)
        VALUES ('ORD-2026-10001', ?, ?, 'Elite Executive Summit Package', 10000, 'order_rzp_seed_10001', 'paid', ?)
      `).run(aaravId, pkgEliteId, isoDaysAgo(18)).lastInsertRowid
    );
    const pay1Id = Number(
      db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gross_amount_inr, status, verified_by, verified_at, created_at)
        VALUES (?, ?, 'order_rzp_seed_10001', 'pay_rzp_seed_10001', 'verified_hmac_seed_1', 10000, 'successful', 'server_signature', ?, ?)
      `).run(ord1Id, aaravId, isoDaysAgo(18), isoDaysAgo(18)).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO affiliate_commissions (commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id, gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status, credited_at)
      VALUES ('COM-2026-10001', ?, ?, NULL, ?, ?, 10000, 0, 0, 100, 10000, 'available', ?)
    `).run(pay1Id, ord1Id, aaravId, pkgEliteId, isoDaysAgo(18));

    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, completed_at, enrolled_at) VALUES (?, ?, ?, ?, 1, ?, ?)').run(aaravId, c1, pkgEliteId, ord1Id, isoDaysAgo(10), isoDaysAgo(18));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, enrolled_at) VALUES (?, ?, ?, ?, 0, ?)').run(aaravId, c2, pkgEliteId, ord1Id, isoDaysAgo(18));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, enrolled_at) VALUES (?, ?, ?, ?, 0, ?)').run(aaravId, c3, pkgEliteId, ord1Id, isoDaysAgo(18));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, enrolled_at) VALUES (?, ?, ?, ?, 0, ?)').run(aaravId, c4, pkgEliteId, ord1Id, isoDaysAgo(18));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, enrolled_at) VALUES (?, ?, ?, ?, 0, ?)').run(aaravId, c5, pkgEliteId, ord1Id, isoDaysAgo(18));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, is_completed, enrolled_at) VALUES (?, ?, ?, ?, 0, ?)').run(aaravId, c6, pkgEliteId, ord1Id, isoDaysAgo(18));

    const fullSegments = JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    db.prepare(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id, last_position_seconds, watched_seconds_json, verified_percent, is_completed, completed_at)
      VALUES (?, ?, ?, 10, ?, 100.0, 1, ?)
    `).run(aaravId, c1, c1Content.l1, fullSegments, isoDaysAgo(12));
    db.prepare(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id, last_position_seconds, watched_seconds_json, verified_percent, is_completed, completed_at)
      VALUES (?, ?, ?, 10, ?, 100.0, 1, ?)
    `).run(aaravId, c1, c1Content.l2, fullSegments, isoDaysAgo(11));

    db.prepare(`
      INSERT INTO quiz_attempts (quiz_id, user_id, score_percentage, earned_points, total_points, passed, answers_json, attempted_at)
      VALUES (?, ?, 100.0, 100, 100, 1, '{}', ?)
    `).run(c1Content.quizId, aaravId, isoDaysAgo(10));

    db.prepare(`
      INSERT INTO assignment_submissions (assignment_id, course_id, user_id, submission_text, status, feedback, reviewed_by_admin_id, reviewed_at, submitted_at)
      VALUES (?, ?, ?, 'Implemented a 3-stage organic educational funnel with attribution locking and content cohort onboarding.', 'approved', 'Exemplary architecture and unit economics breakdown. Approved for certification.', 1, ?, ?)
    `).run(c1Content.assignId, c1, aaravId, isoDaysAgo(10), isoDaysAgo(11));

    db.prepare(`
      INSERT INTO certificates (certificate_code, user_id, course_id, recipient_name, course_title, company_name, issued_at)
      VALUES ('CERT-2026-884920', ?, ?, 'Aarav Mehta', 'High-Conversion Affiliate Systems & Funnel Architecture', 'LearnUp India (learnupindia.com)', ?)
    `).run(aaravId, c1, isoDaysAgo(10));

    db.prepare(`
      INSERT INTO user_notes (user_id, course_id, lesson_id, title, content)
      VALUES (?, ?, ?, 'Direct Attribution Key Takeaway', 'Referral codes lock permanently at registration. Always share the direct https://learnupindia.com/?ref=AB1234 registration link so attribution is captured before checkout.')
    `).run(aaravId, c1, c1Content.l1);

    const ord2Id = Number(
      db.prepare(`
        INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, razorpay_order_id, status, created_at)
        VALUES ('ORD-2026-10002', ?, ?, 'Elite Executive Summit Package', 10000, 'order_rzp_seed_10002', 'paid', ?)
      `).run(priyaId, pkgEliteId, isoDaysAgo(12)).lastInsertRowid
    );
    const pay2Id = Number(
      db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gross_amount_inr, status, verified_by, verified_at, created_at)
        VALUES (?, ?, 'order_rzp_seed_10002', 'pay_rzp_seed_10002', 'verified_hmac_seed_2', 10000, 'successful', 'server_signature', ?, ?)
      `).run(ord2Id, priyaId, isoDaysAgo(12), isoDaysAgo(12)).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO affiliate_commissions (commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id, gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status, credited_at)
      VALUES ('COM-2026-10002', ?, ?, ?, ?, ?, 10000, 70, 7000, 30, 3000, 'available', ?)
    `).run(pay2Id, ord2Id, aaravId, priyaId, pkgEliteId, isoDaysAgo(12));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(priyaId, c1, pkgEliteId, ord2Id, isoDaysAgo(12));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(priyaId, c2, pkgEliteId, ord2Id, isoDaysAgo(12));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(priyaId, c3, pkgEliteId, ord2Id, isoDaysAgo(12));

    const ord3Id = Number(
      db.prepare(`
        INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, razorpay_order_id, status, created_at)
        VALUES ('ORD-2026-10003', ?, ?, 'Pro Accelerator Package', 5999, 'order_rzp_seed_10003', 'paid', ?)
      `).run(rohanId, pkgProId, isoDaysAgo(4)).lastInsertRowid
    );
    const pay3Id = Number(
      db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gross_amount_inr, status, verified_by, verified_at, created_at)
        VALUES (?, ?, 'order_rzp_seed_10003', 'pay_rzp_seed_10003', 'verified_hmac_seed_3', 5999, 'successful', 'webhook', ?, ?)
      `).run(ord3Id, rohanId, isoDaysAgo(4), isoDaysAgo(4)).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO affiliate_commissions (commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id, gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status, credited_at)
      VALUES ('COM-2026-10003', ?, ?, ?, ?, ?, 5999, 70, 4199.3, 30, 1799.7, 'available', ?)
    `).run(pay3Id, ord3Id, aaravId, rohanId, pkgProId, isoDaysAgo(4));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(rohanId, c1, pkgProId, ord3Id, isoDaysAgo(4));
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(rohanId, c2, pkgProId, ord3Id, isoDaysAgo(4));

    const todayIso = isoDaysAgo(0);
    const ord4Id = Number(
      db.prepare(`
        INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, razorpay_order_id, status, created_at)
        VALUES ('ORD-2026-10004', ?, ?, 'Elite Executive Summit Package', 10000, 'order_rzp_seed_10004', 'paid', ?)
      `).run(kavyaId, pkgEliteId, todayIso).lastInsertRowid
    );
    const pay4Id = Number(
      db.prepare(`
        INSERT INTO payments (order_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, gross_amount_inr, status, verified_by, verified_at, created_at)
        VALUES (?, ?, 'order_rzp_seed_10004', 'pay_rzp_seed_10004', 'verified_hmac_seed_4', 10000, 'successful', 'server_signature', ?, ?)
      `).run(ord4Id, kavyaId, todayIso, todayIso).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO affiliate_commissions (commission_ref, payment_id, order_id, referrer_user_id, referred_user_id, package_id, gross_package_price_inr, referrer_percentage, referrer_amount_inr, company_percentage, company_amount_inr, status, credited_at)
      VALUES ('COM-2026-10004', ?, ?, ?, ?, ?, 10000, 70, 7000, 30, 3000, 'available', ?)
    `).run(pay4Id, ord4Id, aaravId, kavyaId, pkgEliteId, todayIso);
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(kavyaId, c1, pkgEliteId, ord4Id, todayIso);
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(kavyaId, c2, pkgEliteId, ord4Id, todayIso);
    db.prepare('INSERT INTO user_course_enrollments (user_id, course_id, package_id, order_id, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(kavyaId, c3, pkgEliteId, ord4Id, todayIso);

    db.prepare(`
      INSERT INTO wallet_transactions (reference_id, user_id, tx_type, bucket, direction, amount_inr, balance_after_inr, description, related_payment_id, created_at)
      VALUES
        ('TXN-2026-90001', ?, 'commission_credit', 'available_commission', 'credit', 7000.0, 7000.0, '70% Direct Referral Commission — Priya Nair (Elite Executive Summit)', ?, ?),
        ('TXN-2026-90002', ?, 'withdrawal_reservation', 'available_commission', 'debit', 3000.0, 4000.0, 'Withdrawal Request Reserved (WDR-2026-50001)', NULL, ?),
        ('TXN-2026-90003', ?, 'withdrawal_payment', 'reserved', 'debit', 3000.0, 0.0, 'Withdrawal Paid via Bank Transfer UTR HDFC20268839201 (WDR-2026-50001)', NULL, ?),
        ('TXN-2026-90004', ?, 'commission_credit', 'available_commission', 'credit', 4199.3, 8199.3, '70% Direct Referral Commission — Rohan Kapoor (Pro Accelerator)', ?, ?),
        ('TXN-2026-90005', ?, 'bonus_credit', 'bonus', 'credit', 1250.0, 1250.0, 'Top Performer Weekly Consistency Bonus', NULL, ?),
        ('TXN-2026-90006', ?, 'withdrawal_reservation', 'available_commission', 'debit', 1500.0, 6699.3, 'Withdrawal Request Reserved (WDR-2026-50002)', NULL, ?),
        ('TXN-2026-90007', ?, 'commission_credit', 'available_commission', 'credit', 7000.0, 13699.3, '70% Direct Referral Commission — Kavya Sharma (Elite Executive Summit)', ?, ?)
    `).run(
      aaravId, pay2Id, isoDaysAgo(12),
      aaravId, isoDaysAgo(8),
      aaravId, isoDaysAgo(7),
      aaravId, pay3Id, isoDaysAgo(4),
      aaravId, isoDaysAgo(3),
      aaravId, isoDaysAgo(1),
      aaravId, pay4Id, todayIso
    );

    db.prepare(`
      INSERT INTO bonus_transactions (reference_id, user_id, amount_inr, reason, credited_by_admin_id, created_at)
      VALUES ('BON-2026-30001', ?, 1250.0, 'Top Performer Weekly Consistency Bonus', 2, ?)
    `).run(aaravId, isoDaysAgo(3));

    db.prepare(`
      UPDATE wallet_accounts
      SET available_commission_inr = 13699.3,
          pending_commission_inr = 0.0,
          bonus_amount_inr = 1250.0,
          reserved_withdrawal_inr = 1500.0,
          total_withdrawn_inr = 3000.0
      WHERE user_id = ?
    `).run(aaravId);

    const w1Id = Number(
      db.prepare(`
        INSERT INTO withdrawals (request_ref, user_id, amount_inr, payout_method, account_holder_name, bank_name, account_number, ifsc_code, status, payment_reference, business_date_ist, reviewed_by_admin_id, reviewed_at, paid_at, created_at)
        VALUES ('WDR-2026-50001', ?, 3000.0, 'bank_transfer', 'Aarav Mehta', 'HDFC Bank', '50100482910422', 'HDFC0001204', 'paid', 'HDFC20268839201', '2026-11-02', 2, ?, ?, ?)
      `).run(aaravId, isoDaysAgo(7), isoDaysAgo(7), isoDaysAgo(8)).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO withdrawal_payment_records (withdrawal_id, utr_or_reference, payout_channel, amount_inr, processed_by_admin_id, processed_at)
      VALUES (?, 'HDFC20268839201', 'IMPS Bank Settlement', 3000.0, 2, ?)
    `).run(w1Id, isoDaysAgo(7));

    db.prepare(`
      INSERT INTO withdrawals (request_ref, user_id, amount_inr, payout_method, account_holder_name, upi_id, status, rejection_reason, admin_notes, business_date_ist, reviewed_by_admin_id, reviewed_at, created_at)
      VALUES ('WDR-2026-50000', ?, 800.0, 'upi', 'Aarav Mehta', 'aarav.old@okaxis', 'rejected', 'UPI handle returned inactive VPA during penny-drop check. Reserved funds released to Available Balance.', 'Released ₹800 reservation back to available_commission', '2026-10-30', 2, ?, ?)
    `).run(aaravId, isoDaysAgo(10), isoDaysAgo(10));

    db.prepare(`
      INSERT INTO withdrawals (request_ref, user_id, amount_inr, payout_method, account_holder_name, upi_id, status, business_date_ist, created_at)
      VALUES ('WDR-2026-50002', ?, 1500.0, 'upi', 'Aarav Mehta', 'aarav.mehta@okhdfcbank', 'pending', '2026-11-09', ?)
    `).run(aaravId, isoDaysAgo(1));

    const kyc1Id = Number(
      db.prepare(`
        INSERT INTO kyc_submissions (user_id, aadhaar_number_masked, bank_name, account_holder_name, account_number, ifsc_code, upi_id, state, district, gender, status, reviewed_by_admin_id, reviewed_at, submitted_at)
        VALUES (?, 'XXXX-XXXX-4829', 'HDFC Bank', 'Aarav Mehta', '50100482910422', 'HDFC0001204', 'aarav.mehta@okhdfcbank', 'Karnataka', 'Bengaluru Urban', 'Male', 'approved', 3, ?, ?)
      `).run(aaravId, isoDaysAgo(15), isoDaysAgo(16)).lastInsertRowid
    );
    db.prepare(`
      INSERT INTO kyc_review_history (kyc_submission_id, user_id, previous_status, new_status, reason, reviewed_by_admin_id, created_at)
      VALUES (?, ?, 'pending_review', 'approved', 'Aadhaar document and IFSC details verified against bank mandate.', 3, ?)
    `).run(kyc1Id, aaravId, isoDaysAgo(15));

    db.prepare(`
      INSERT INTO kyc_submissions (user_id, aadhaar_number_masked, bank_name, account_holder_name, account_number, ifsc_code, upi_id, state, district, gender, status, submitted_at)
      VALUES (?, 'XXXX-XXXX-9104', 'ICICI Bank', 'Rohan Kapoor', '004101582910', 'ICIC0000041', 'rohan.kapoor@okicici', 'Delhi', 'New Delhi', 'Male', 'pending_review', ?)
    `).run(rohanId, isoDaysAgo(2));

    const insertTrading = db.prepare(`
      INSERT INTO trading_videos (title, category, description, thumbnail_url, video_asset_key, duration_seconds, display_order, is_published)
      VALUES (?, ?, ?, ?, 'trading_stream_1.mp4', 10, ?, 1)
    `);
    insertTrading.run(
      'Understanding Orderbook Liquidity & Bid-Ask Spreads',
      'Market Microstructure',
      'Educational breakdown of how limit orders and market orders interact across institutional liquidity pools.',
      '/assets/media/course_trading.jpg',
      1
    );
    insertTrading.run(
      'Position Sizing & The 1% Capital Preservation Rule',
      'Risk Management',
      'Mathematical proof of why strict risk-per-trade boundaries prevent catastrophic portfolio drawdowns.',
      '/assets/media/pkg_starter.jpg',
      2
    );
    insertTrading.run(
      'Multi-Timeframe Trend Alignment & Structural Breaks',
      'Price Action',
      'How to read higher-timeframe market structure objectively without relying on lagging indicators.',
      '/assets/media/pkg_pro.jpg',
      3
    );

    const insertSocial = db.prepare(`
      INSERT INTO social_links (platform, label, url, icon_name, subscriber_count_label, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);
    insertSocial.run('YouTube', 'LearnUp India Official Channel', 'https://youtube.com/@learnupindia', 'Youtube', '142K Subscribers', 1);
    insertSocial.run('Telegram', 'LearnUp India Verified Broadcast Desk', 'https://t.me/learnupindia', 'Send', '84K Members', 2);
    insertSocial.run('Instagram', 'LearnUp India Insights (@learnupindia)', 'https://instagram.com/learnupindia', 'Instagram', '96K Followers', 3);
    insertSocial.run('X (Twitter)', 'LearnUp India Updates (@learnupindia)', 'https://x.com/learnupindia', 'Twitter', '51K Followers', 4);
    insertSocial.run('WhatsApp Channel', 'LearnUp India Direct Learner Alerts', 'https://whatsapp.com/channel/learnupindia', 'MessageCircle', '68K Subscribers', 5);

    const future7d = new Date(now.getTime() + 7 * 86400000).toISOString();
    const future14d = new Date(now.getTime() + 14 * 86400000).toISOString();
    const past10d = new Date(now.getTime() - 10 * 86400000).toISOString();

    const bVip = Number(
      db.prepare(`
        INSERT INTO offer_batches (name, batch_type, description, start_at, end_at, is_active)
        VALUES ('Executive Cohort — Q4 VIP Batch', 'VIP Batch', 'Priority mentorship sessions and live funnel teardown workshops for Elite Summit members.', ?, ?, 1)
      `).run(past10d, future7d).lastInsertRowid
    );
    const bPrem = Number(
      db.prepare(`
        INSERT INTO offer_batches (name, batch_type, description, start_at, end_at, is_active)
        VALUES ('Accelerator Fast-Track Batch', 'Premium Batch', 'Dedicated weekly implementation sprints for Pro Accelerator learners.', ?, ?, 1)
      `).run(past10d, future14d).lastInsertRowid
    );

    db.prepare(`
      INSERT INTO offers (batch_id, title, description, banner_url, destination_link, promo_badge, start_at, end_at, is_active)
      VALUES
        (?, 'Q4 Executive VIP Cohort Enrollment Window', 'Enroll in the Elite Executive Summit Package before the timer expires to unlock live weekly architecture reviews with our faculty.', '/assets/media/offer_vip_banner.jpg', '/register', 'VIP BATCH LIVE', ?, ?, 1),
        (?, 'Pro Accelerator Implementation Sprint', 'Join the upcoming 14-day guided funnel implementation workshop included with all Pro Accelerator enrollments.', '/assets/media/course_affiliate.jpg', '/register', 'LIMITED SEATS', ?, ?, 1)
    `).run(bVip, past10d, future7d, bPrem, past10d, future14d);

    const templates = [
      ['welcome_email', 'Welcome Email', 'Welcome to LearnUp India (learnupindia.com) — Your Portal is Live', '<p>Welcome {{name}}, your LearnUp India account and unique affiliate code <strong>{{affiliate_code}}</strong> are active.</p>'],
      ['registration_confirmation', 'Registration Confirmation', 'Account Registration Confirmed — LearnUp India', '<p>Hi {{name}}, your registration on learnupindia.com is confirmed. Your locked sponsor code: {{referred_by}}.</p>'],
      ['payment_confirmation', 'Payment Confirmation', 'Receipt & Package Activation: {{package_name}} ({{order_number}})', '<p>Thank you {{name}}. Your payment of ₹{{amount}} is verified and lifetime course access is unlocked on learnupindia.com.</p>'],
      ['commission_credit', 'Commission Credit Notification', '70% Direct Referral Commission Credited: ₹{{amount}}', '<p>Congratulations {{name}}! ₹{{amount}} (70% gross package price) has been credited to your Available Commission balance on LearnUp India.</p>'],
      ['withdrawal_request', 'Withdrawal Request Confirmation', 'Withdrawal Request Received ({{request_ref}})', '<p>Hi {{name}}, your withdrawal request for ₹{{amount}} via {{method}} has been reserved and queued for review.</p>'],
      ['withdrawal_approved', 'Withdrawal Approval Notification', 'Withdrawal Processed & Settled ({{request_ref}})', '<p>Hi {{name}}, your withdrawal of ₹{{amount}} has been processed. Reference: {{utr}}.</p>'],
      ['withdrawal_rejected', 'Withdrawal Rejection Notification', 'Update on Withdrawal Request ({{request_ref}})', '<p>Hi {{name}}, your withdrawal request of ₹{{amount}} could not be processed ({{reason}}). The full reserved amount has been released back to your Available Balance.</p>'],
      ['kyc_submitted', 'KYC Submission Confirmation', 'KYC Verification Documents Received — LearnUp India', '<p>Hi {{name}}, your KYC submission is queued for compliance review.</p>'],
      ['kyc_approved', 'KYC Approval Notification', 'KYC Approved — Withdrawals Unlocked on LearnUp India', '<p>Hi {{name}}, your KYC identity and payout details have been verified and approved.</p>'],
      ['kyc_rejected', 'KYC Rejection Notification', 'Action Required: KYC Verification Update', '<p>Hi {{name}}, your KYC submission requires attention: {{reason}}. Please log in to resubmit.</p>'],
      ['password_reset_otp', 'Password Reset OTP', 'Your LearnUp India Password Reset Verification Code: {{otp}}', '<p>Your single-use password reset OTP for learnupindia.com is <strong>{{otp}}</strong>. Valid for 10 minutes.</p>'],
      ['course_completed', 'Course Completion Notification', 'Congratulations on Completing {{course_title}}!', '<p>Well done {{name}}! You have satisfied all compulsory video, quiz, and assignment requirements for {{course_title}}.</p>'],
      ['certificate_generated', 'Certificate Generated Notification', 'Official Certificate Issued: {{certificate_code}}', '<p>Hi {{name}}, your verifiable PDF certificate ({{certificate_code}}) for {{course_title}} is ready for download on learnupindia.com.</p>'],
    ];
    const insertTpl = db.prepare(`
      INSERT INTO email_templates (template_key, name, subject, body_html, sender_name, sender_email)
      VALUES (?, ?, ?, ?, 'LearnUp India Team', 'team@learnupindia.com')
    `);
    for (const [key, name, subj, body] of templates) {
      insertTpl.run(key, name, subj, body);
    }

    db.prepare(`
      INSERT INTO email_logs (user_id, recipient_email, template_key, subject, body_preview, status, sent_at)
      VALUES
        (?, 'aarav.mehta@gmail.com', 'welcome_email', 'Welcome to LearnUp India (learnupindia.com) — Your Portal is Live', 'Welcome Aarav Mehta, your LearnUp India account and unique affiliate code AB1234 are active.', 'delivered', ?),
        (?, 'aarav.mehta@gmail.com', 'commission_credit', '70% Direct Referral Commission Credited: ₹7,000', 'Congratulations Aarav Mehta! ₹7,000 (70% gross package price) has been credited to your Available Commission balance on LearnUp India.', 'delivered', ?)
    `).run(aaravId, isoDaysAgo(18), aaravId, todayIso);

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, action_link, is_read, created_at)
      VALUES
        (?, '₹7,000.00 Affiliate Commission Credited', 'Kavya Sharma completed enrollment in Elite Executive Summit Package. 70% gross commission credited to Available Balance.', '/dashboard?tab=affiliate', 0, ?),
        (?, 'Course Certificate Issued (CERT-2026-884920)', 'Your official certificate for High-Conversion Affiliate Systems & Funnel Architecture is ready for PDF download.', '/dashboard?tab=courses', 0, ?),
        (?, 'Bonus Credited: ₹1,250.00', 'Finance Admin credited ₹1,250.00 Top Performer Weekly Consistency Bonus to your Bonus Wallet.', '/dashboard?tab=withdrawal', 1, ?)
    `).run(aaravId, todayIso, aaravId, isoDaysAgo(10), aaravId, isoDaysAgo(3));

    const siteConfig = {
      companyName: 'LEARNUP INDIA (learnupindia.com)',
      logoText: 'LEARNUP INDIA',
      logoSubtext: 'LEARNUPINDIA.COM · EXECUTIVE E-LEARNING & AFFILIATE PLATFORM',
      faviconUrl: '/vite.svg',
      theme: {
        primaryColor: '#10b981',
        accentColor: '#d97706',
        surfaceColor: '#0c1110',
        fontHeading: 'Fraunces',
        fontBody: 'Plus Jakarta Sans',
      },
      headerNav: [
        { label: 'Home', href: '#hero' },
        { label: 'About Us', href: '#about' },
        { label: 'Plans / Packages', href: '#packages' },
        { label: 'Courses', href: '#courses' },
        { label: 'Offers', href: '#offers' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Contact Us', href: '#contact' },
      ],
      hero: {
        eyebrow: 'LEARNUPINDIA.COM · DIGITAL EDUCATION & PARTNER ECOSYSTEM',
        headline: 'Master High-Value Digital Systems. Earn 70% Direct Partner Commissions.',
        description: 'LearnUp India (learnupindia.com) combines rigorous, certificate-backed executive courses in affiliate architecture, quantitative risk management, and AI automation with an auditable, instant-credit 70% direct referral commission ledger.',
        primaryCtaText: 'Begin Registration & Select Package',
        primaryCtaLink: '/register',
        secondaryCtaText: 'Explore Curriculum',
        secondaryCtaLink: '#packages',
        visual3dPreset: 'emerald_monolith',
        heroImageUrl: '/assets/media/pkg_elite.jpg',
        stats: [
          { label: 'Direct Referrer Share', value: '70% Gross' },
          { label: 'Commission Settlement', value: 'Instant Ledger Credit' },
          { label: 'Curriculum Access', value: 'Lifetime Streaming' },
        ],
      },
      about: {
        title: 'Engineered for Verifiable Skill Mastery & Transparent Partner Economics',
        description: 'Unlike passive video libraries, LearnUp India enforces 100% verified watch completion, graded assessments, and faculty-reviewed assignments before issuing verifiable credentials—while rewarding our student partners with 70% of gross package revenue on every direct referral.',
        mission: 'To democratize executive-grade digital business, quantitative market literacy, and AI systems education across India through learnupindia.com with uncompromising transparency.',
        vision: 'Building India’s most trusted skill-to-income learning infrastructure with bank-grade ledger integrity.',
        imageUrl: '/assets/media/pkg_pro.jpg',
      },
      benefits: [
        { title: '70% Gross Selling Price Commission', description: 'Calculated on 100% of the package gross price with zero gateway fee deductions from your partner share.' },
        { title: 'Permanent Attribution Locking', description: 'Your unique 6-character referral code (e.g. AB1234) never expires and locks permanently when a learner registers.' },
        { title: '100% Verified Video LMS & Certificates', description: 'Server-verified watch segments, graded quizzes, and capstone assignments unlock downloadable, verifiable PDF certificates.' },
        { title: 'Fast Bank & UPI Withdrawals', description: 'Withdraw starting from ₹500 via IMPS/NEFT Bank Transfer or UPI with up to 2 requests per day after KYC approval.' },
      ],
      howItWorks: [
        { step: '01', title: 'Register & Lock Sponsor', description: 'Complete registration with your chosen learning package and optional referral code.' },
        { step: '02', title: 'Verify Payment via Razorpay', description: 'Complete checkout securely. Our backend verifies cryptographic signatures before activating access.' },
        { step: '03', title: 'Complete Courses & Certify', description: 'Watch HD streaming lessons to 100%, pass quizzes, and receive course certificates.' },
        { step: '04', title: 'Refer & Withdraw Earnings', description: 'Share your permanent referral link to earn 70% commissions and withdraw to Bank or UPI.' },
      ],
      testimonials: [
        { name: 'Aarav Mehta', role: 'Elite Summit Member · Bengaluru', quote: 'The 70% gross commission is credited to the ledger the exact second Razorpay verifies a referral purchase. LearnUp India’s curriculum quality is unmatched.', earnings: '₹18,199 Earned' },
        { name: 'Priya Nair', role: 'Executive Member · Kochi', quote: 'I love that certificates require 100% verified watching and real assignment review. It makes a LearnUp India certificate genuinely respected.', earnings: 'Verified Graduate' },
        { name: 'Rohan Kapoor', role: 'Pro Accelerator Member · New Delhi', quote: 'The quantitative risk management module completely transformed how I calculate position sizing and drawdown limits.', earnings: '₹8,398 Earned' },
      ],
      faq: [
        { q: 'Why is there no direct "Buy Now" button on public package cards?', a: 'To protect referral attribution integrity and ensure every learner has a verified account and locked sponsor record before payment, all package purchases happen seamlessly through the Registration & Checkout flow on learnupindia.com.' },
        { q: 'How is the 70% affiliate commission calculated?', a: 'The referring user receives 70% of the gross package selling price, and the company retains 30%. Payment gateway fees are never deducted from the referrer calculation base.' },
        { q: 'What are the withdrawal rules and limits?', a: 'The minimum withdrawal is ₹500 with no fixed maximum limit (up to your Available Commission balance). Approved KYC is required, and users may submit up to 2 withdrawal requests per day (Asia/Kolkata timezone).' },
        { q: 'What is the platform refund policy?', a: 'All package payments are final and non-refundable as stated during checkout and in our Legal Terms. Duplicate charges or unauthorized transactions are handled in accordance with applicable law and Razorpay dispute procedures.' },
      ],
      contact: {
        email: 'team@learnupindia.com',
        phone: '+91 (022) 6890-4200',
        address: 'LearnUp India HQ — Level 14, One BKC Tower C, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
        supportHours: 'Monday – Saturday, 09:30 AM to 07:30 PM IST',
      },
      legal: {
        noRefundPolicy: 'All learning package purchases on LearnUp India (learnupindia.com) are strictly non-refundable once payment is verified and digital curriculum access is provisioned. By completing checkout, you acknowledge immediate digital delivery and waive discretionary refund requests. Statutory consumer remedies for duplicate debits or unauthorized transactions remain protected under applicable Indian law.',
        termsAndConditions: 'Users must provide accurate registration details, complete KYC verification prior to requesting withdrawals, and adhere to ethical marketing guidelines. Referral attribution is captured at registration and permanently locked. Multi-level commissions are not offered; only direct verified referrals earn the 70% gross commission.',
        privacyPolicy: 'Personal identity documents uploaded for KYC verification are stored in access-controlled private storage and are never publicly accessible. Referral reports mask sensitive personal contact details to protect learner privacy.',
      },
    };

    const siteJson = JSON.stringify(siteConfig);
    db.prepare(`
      INSERT INTO website_content (key, published_json, draft_json, has_unpublished_changes)
      VALUES ('main_site', ?, ?, 0)
    `).run(siteJson, siteJson);

    const homePageId = Number(
      db.prepare(`
        INSERT INTO website_pages (slug, title, meta_description, status, published_version)
        VALUES ('home', 'LearnUp India (learnupindia.com) — E-Learning & 70% Direct Partner Platform', 'Master digital systems, quantitative market literacy, and AI automation with verifiable certificates and 70% direct affiliate commissions on learnupindia.com.', 'published', 1)
      `).run().lastInsertRowid
    );

    const defaultSections = [
      ['hero', 'hero_3d', 'Hero Banner & Interactive 3D Monolith', 'Executive headline, 3D visual object, and primary conversion CTAs', 1],
      ['about', 'about_split', 'About LearnUp India — Mission, Vision & Architecture', 'Platform overview, institutional standards, and mission statement', 2],
      ['packages', 'packages_grid', 'Learning Packages & Curriculum Tiers', 'Dynamic packages grid (registration-first flow without direct Buy Now buttons)', 3],
      ['benefits', 'benefits_grid', 'Platform Benefits & Partner Economics', 'Highlights 70/30 gross commission split, permanent attribution, and verified LMS', 4],
      ['how_it_works', 'steps_flow', 'How It Works — Registration to Payout', '4-step walkthrough of registration, Razorpay verification, learning, and withdrawals', 5],
      ['courses', 'featured_courses', 'Featured Executive Courses', 'Preview of courses, modules, quizzes, and verifiable certificates', 6],
      ['offers', 'offers_countdown', 'Active Cohort Offers & Promotional Batches', 'Dynamic 16:9 promotional banners with live countdown timers', 7],
      ['testimonials', 'testimonials_grid', 'Graduate & Partner Testimonials', 'Verified student reviews and partner earnings stories', 8],
      ['faq', 'faq_accordion', 'Frequently Asked Questions', 'Clear answers on attribution, 70% gross commissions, KYC, and No-Refund policy', 9],
      ['contact', 'contact_section', 'Contact & Executive Concierge (team@learnupindia.com)', 'Corporate headquarters, support desk hours, and direct inquiry channel', 10],
    ];

    const insertSection = db.prepare(`
      INSERT INTO website_sections (page_id, section_key, section_type, title, subtitle, content_json, draft_content_json, is_visible, display_order)
      VALUES (?, ?, ?, ?, ?, '{}', '{}', 1, ?)
    `);
    for (const [key, type, title, sub, order] of defaultSections) {
      insertSection.run(homePageId, key, type, title, sub, order);
    }

    db.prepare(`
      INSERT INTO page_versions (page_slug, version_number, snapshot_json, note, created_by_admin_id)
      VALUES ('home', 1, ?, 'Initial LearnUp India (learnupindia.com) production launch configuration', 1)
    `).run(siteJson);

    const insertMedia = db.prepare(`
      INSERT INTO media_assets (title, category, file_url, mime_type, file_size_bytes, uploaded_by_admin_id)
      VALUES (?, ?, ?, 'image/jpeg', ?, 1)
    `);
    insertMedia.run('Foundation Mastery Package Cover', 'packages', '/assets/media/pkg_starter.jpg', 636928);
    insertMedia.run('Pro Accelerator Package Cover', 'packages', '/assets/media/pkg_pro.jpg', 670720);
    insertMedia.run('Elite Executive Summit Cover', 'packages', '/assets/media/pkg_elite.jpg', 674816);
    insertMedia.run('VIP Batch 16:9 Promotional Banner', 'banners', '/assets/media/offer_vip_banner.jpg', 583680);
    insertMedia.run('Affiliate Systems Course Thumbnail', 'courses', '/assets/media/course_affiliate.jpg', 593920);
    insertMedia.run('Quantitative Trading Course Thumbnail', 'courses', '/assets/media/course_trading.jpg', 656384);
    insertMedia.run('AI Growth & Scaling Course Thumbnail', 'courses', '/assets/media/course_growth.jpg', 750592);

    db.prepare(`
      INSERT INTO system_settings (key, value_json, updated_by_admin_id)
      VALUES
        ('business_timezone', '{"timezone":"Asia/Kolkata"}', 1),
        ('withdrawal_rules', '{"minAmountInr":500,"maxRequestsPerDay":2,"requireApprovedKyc":true,"expectedProcessingHours":24}', 1),
        ('leaderboard_config', '{"activePeriod":"weekly","isPublished":true,"minEligibleInr":500}', 1),
        ('certificate_template', '{"companyName":"LearnUp India (learnupindia.com)","signatoryName":"Dr. Vikramaditya Sen","signatoryTitle":"Dean of Academic Standards","accentColor":"#10b981","goldColor":"#d97706"}', 1),
        ('backup_retention', '{"autoSchedule":"daily","retentionDays":30,"encryption":"AES-256-GCM"}', 1),
        ('hostinger_database', '{"dbName":"u591469534_educ","dbUser":"u591469534_educt","website":"learnupindia.com","smtpEmail":"team@learnupindia.com"}', 1)
    `).run();

    db.prepare(`
      INSERT INTO admin_activity_logs (admin_id, admin_role, action, affected_record, previous_value, new_value, ip_address)
      VALUES
        (1, 'Super Admin', 'INITIALIZE_PLATFORM', 'system_settings', NULL, 'LearnUp India (learnupindia.com) configured with Hostinger MySQL (u591469534_educ) & SMTP (team@learnupindia.com)', '127.0.0.1'),
        (2, 'Finance Admin', 'CREDIT_BONUS', 'user:5 (Aarav Mehta)', '₹0.00', '₹1,250.00 (Top Performer Weekly Consistency Bonus)', '127.0.0.1'),
        (3, 'KYC Admin', 'APPROVE_KYC', 'kyc_submission:1 (Aarav Mehta)', 'pending_review', 'approved', '127.0.0.1')
    `).run();
  });
}
