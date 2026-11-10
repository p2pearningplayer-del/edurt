-- =============================================================================
-- EDURT E-LEARNING & AFFILIATE MARKETING PLATFORM
-- Production Relational Database Schema (PostgreSQL 15+)
-- Covers all 43 entities across Auth, RBAC, Affiliate, Packages, Payments,
-- Courses/LMS, Wallet Ledger, Withdrawals, KYC, CMS/Page Builder, and Security
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. USER AND AUTHENTICATION
-- -----------------------------------------------------------------------------

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(64) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    referred_by_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    referred_by_code VARCHAR(16),
    referral_locked BOOLEAN NOT NULL DEFAULT TRUE,
    acquisition_source VARCHAR(32) NOT NULL DEFAULT 'company' CHECK (acquisition_source IN ('referral', 'company', 'admin_manual')),
    created_by_admin_id INTEGER,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    profile_photo TEXT,
    gender VARCHAR(24),
    state VARCHAR(100),
    district VARCHAR(100),
    terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(64),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_otps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. AFFILIATE SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE affiliate_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    code CHAR(6) NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{2}[0-9]{4}$'),
    clicks INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commission_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    referrer_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    company_percentage NUMERIC(5,2) NOT NULL DEFAULT 30.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    referred_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    affiliate_code CHAR(6) NOT NULL REFERENCES affiliate_codes(code),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'purchased'))
);

-- -----------------------------------------------------------------------------
-- 3. PACKAGES AND PAYMENTS
-- -----------------------------------------------------------------------------

CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    tagline VARCHAR(255),
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price_inr NUMERIC(12,2) NOT NULL CHECK (price_inr >= 0),
    benefits_json JSONB NOT NULL DEFAULT '[]',
    duration_label VARCHAR(100) NOT NULL DEFAULT 'Lifetime Access',
    badge_text VARCHAR(64),
    display_order INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    package_name_snapshot VARCHAR(150) NOT NULL,
    gross_amount_inr NUMERIC(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    razorpay_order_id VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'paid', 'failed', 'cancelled')),
    no_refund_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    razorpay_order_id VARCHAR(128) NOT NULL,
    razorpay_payment_id VARCHAR(128) UNIQUE,
    razorpay_signature TEXT,
    payment_method VARCHAR(64) NOT NULL DEFAULT 'razorpay',
    gross_amount_inr NUMERIC(12,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'successful', 'failed', 'cancelled')),
    verified_by VARCHAR(32) CHECK (verified_by IN ('server_signature', 'webhook', 'admin_manual')),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_webhook_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    razorpay_order_id VARCHAR(128),
    razorpay_payment_id VARCHAR(128),
    signature TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_commissions (
    id SERIAL PRIMARY KEY,
    commission_ref VARCHAR(64) NOT NULL UNIQUE,
    payment_id INTEGER NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    referrer_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    gross_package_price_inr NUMERIC(12,2) NOT NULL,
    referrer_percentage NUMERIC(5,2) NOT NULL,
    referrer_amount_inr NUMERIC(12,2) NOT NULL,
    company_percentage NUMERIC(5,2) NOT NULL,
    company_amount_inr NUMERIC(12,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available' CHECK (status IN ('pending', 'available', 'reversed')),
    credited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. COURSES & LEARNING MANAGEMENT SYSTEM (LMS)
-- -----------------------------------------------------------------------------

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    thumbnail_url TEXT NOT NULL,
    short_description TEXT NOT NULL,
    overview TEXT NOT NULL,
    learning_objectives_json JSONB NOT NULL DEFAULT '[]',
    instructor_name VARCHAR(120) NOT NULL DEFAULT 'Edurt Faculty',
    level VARCHAR(64) NOT NULL DEFAULT 'Comprehensive',
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE package_courses (
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, course_id)
);

CREATE TABLE course_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_asset_key VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_course_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    order_id INTEGER REFERENCES orders(id) ON DELETE RESTRICT,
    access_type VARCHAR(32) NOT NULL DEFAULT 'lifetime',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    last_position_seconds INTEGER NOT NULL DEFAULT 0,
    watched_seconds_json JSONB NOT NULL DEFAULT '[]',
    verified_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE TABLE user_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    passing_percentage NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_type VARCHAR(32) NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
    question_text TEXT NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score_percentage NUMERIC(5,2) NOT NULL,
    earned_points INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    answers_json JSONB NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL,
    due_days INTEGER,
    allowed_file_types VARCHAR(255) NOT NULL DEFAULT '.pdf,.doc,.docx,.txt,.png,.jpg,.zip',
    max_upload_mb INTEGER NOT NULL DEFAULT 10,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    reviewed_by_admin_id INTEGER REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    certificate_code VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    recipient_name VARCHAR(150) NOT NULL,
    course_title VARCHAR(200) NOT NULL,
    company_name VARCHAR(150) NOT NULL DEFAULT 'Edurt Academy Pvt. Ltd.',
    signatory_name VARCHAR(150) NOT NULL DEFAULT 'Dr. Vikramaditya Sen, Dean of Academic Standards',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

-- -----------------------------------------------------------------------------
-- 5. WALLET AND WITHDRAWALS
-- -----------------------------------------------------------------------------

CREATE TABLE wallet_accounts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    available_commission_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (available_commission_inr >= 0),
    pending_commission_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (pending_commission_inr >= 0),
    bonus_amount_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (bonus_amount_inr >= 0),
    reserved_withdrawal_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (reserved_withdrawal_inr >= 0),
    total_withdrawn_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn_inr >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tx_type VARCHAR(48) NOT NULL CHECK (tx_type IN (
        'commission_credit',
        'pending_commission_credit',
        'pending_commission_release',
        'bonus_credit',
        'withdrawal_reservation',
        'withdrawal_rejection_release',
        'withdrawal_payment',
        'authorized_adjustment'
    )),
    bucket VARCHAR(32) NOT NULL CHECK (bucket IN ('available_commission', 'pending_commission', 'bonus', 'reserved')),
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0),
    balance_after_inr NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    related_payment_id INTEGER REFERENCES payments(id),
    related_withdrawal_id INTEGER,
    created_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bonus_transactions (
    id SERIAL PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0),
    reason TEXT NOT NULL,
    credited_by_admin_id INTEGER NOT NULL REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    request_ref VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr >= 500),
    payout_method VARCHAR(32) NOT NULL CHECK (payout_method IN ('bank_transfer', 'upi')),
    account_holder_name VARCHAR(150) NOT NULL,
    bank_name VARCHAR(150),
    account_number VARCHAR(64),
    ifsc_code VARCHAR(32),
    upi_id VARCHAR(120),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected')),
    rejection_reason TEXT,
    admin_notes TEXT,
    payment_reference VARCHAR(128),
    business_date_ist DATE NOT NULL,
    reviewed_by_admin_id INTEGER REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE withdrawal_payment_records (
    id SERIAL PRIMARY KEY,
    withdrawal_id INTEGER NOT NULL UNIQUE REFERENCES withdrawals(id) ON DELETE RESTRICT,
    utr_or_reference VARCHAR(128) NOT NULL UNIQUE,
    payout_channel VARCHAR(64) NOT NULL,
    amount_inr NUMERIC(12,2) NOT NULL,
    processed_by_admin_id INTEGER NOT NULL REFERENCES admin_users(id),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. KYC SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE kyc_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    aadhaar_number_masked VARCHAR(32) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(64) NOT NULL,
    ifsc_code VARCHAR(32) NOT NULL,
    upi_id VARCHAR(120) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    gender VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'not_submitted',
        'pending_review',
        'approved',
        'rejected',
        'resubmission_required'
    )),
    rejection_reason TEXT,
    reviewed_by_admin_id INTEGER REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc_documents (
    id SERIAL PRIMARY KEY,
    kyc_submission_id INTEGER NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL DEFAULT 'aadhaar',
    protected_file_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc_review_history (
    id SERIAL PRIMARY KEY,
    kyc_submission_id INTEGER NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    reason TEXT,
    reviewed_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. WEBSITE CMS & PAGE BUILDER
-- -----------------------------------------------------------------------------

CREATE TABLE website_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    meta_description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'unpublished')),
    published_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE website_sections (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
    section_key VARCHAR(100) NOT NULL,
    section_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    content_json JSONB NOT NULL DEFAULT '{}',
    draft_content_json JSONB NOT NULL DEFAULT '{}',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE website_content (
    key VARCHAR(100) PRIMARY KEY,
    published_json JSONB NOT NULL,
    draft_json JSONB NOT NULL,
    has_unpublished_changes BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_admin_id INTEGER REFERENCES admin_users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media_assets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'general',
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    uploaded_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE page_versions (
    id SERIAL PRIMARY KEY,
    page_slug VARCHAR(100) NOT NULL,
    version_number INTEGER NOT NULL,
    snapshot_json JSONB NOT NULL,
    note TEXT,
    created_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. OTHER PLATFORM MODULES (TRADING, LEADERBOARD, COMMUNITY, OFFERS, EMAIL)
-- -----------------------------------------------------------------------------

CREATE TABLE trading_videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    video_asset_key VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 18,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leaderboard_snapshots (
    id SERIAL PRIMARY KEY,
    period_type VARCHAR(32) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    eligible_earnings_inr NUMERIC(12,2) NOT NULL,
    is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE social_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    icon_name VARCHAR(64) NOT NULL,
    subscriber_count_label VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE offer_batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    batch_type VARCHAR(64) NOT NULL CHECK (batch_type IN ('VIP Batch', 'Premium Batch', 'Special Offers', 'Limited-Time Offers')),
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES offer_batches(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT NOT NULL,
    destination_link VARCHAR(255),
    promo_badge VARCHAR(64),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    sender_name VARCHAR(120) NOT NULL DEFAULT 'Edurt Concierge',
    sender_email VARCHAR(150) NOT NULL DEFAULT 'no-reply@edurt.in',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_preview TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'failed', 'queued')),
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. ADMIN AND SECURITY
-- -----------------------------------------------------------------------------

CREATE TABLE admin_activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    admin_role VARCHAR(64) NOT NULL,
    action VARCHAR(120) NOT NULL,
    affected_record VARCHAR(200) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    event_category VARCHAR(64) NOT NULL,
    actor_type VARCHAR(32) NOT NULL,
    actor_id INTEGER,
    summary TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_by_admin_id INTEGER REFERENCES admin_users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE backup_records (
    id SERIAL PRIMARY KEY,
    backup_code VARCHAR(64) NOT NULL UNIQUE,
    backup_type VARCHAR(32) NOT NULL CHECK (backup_type IN ('manual', 'scheduled')),
    includes_db BOOLEAN NOT NULL DEFAULT TRUE,
    includes_media BOOLEAN NOT NULL DEFAULT TRUE,
    encryption_algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM',
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    checksum_sha256 VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'verified')),
    verified_at TIMESTAMPTZ,
    created_by_admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE restore_records (
    id SERIAL PRIMARY KEY,
    backup_id INTEGER NOT NULL REFERENCES backup_records(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('completed', 'test_verified', 'failed')),
    notes TEXT,
    restored_by_admin_id INTEGER NOT NULL REFERENCES admin_users(id),
    restored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
