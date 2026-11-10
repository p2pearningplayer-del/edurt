-- =============================================================================
-- LEARNUP INDIA (learnupindia.com)
-- E-Learning & Affiliate Marketing Platform
-- Hostinger MySQL / MariaDB Production Schema (All 43 Tables)
-- Database: u591469534_educ
-- Username: u591469534_educt
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USER AND AUTHENTICATION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL UNIQUE,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `description` TEXT,
  `is_system` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `module` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `mobile` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` TEXT NOT NULL,
  `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  `referred_by_user_id` INT NULL,
  `referred_by_code` VARCHAR(16) NULL,
  `referral_locked` TINYINT(1) NOT NULL DEFAULT 1,
  `acquisition_source` ENUM('referral', 'company', 'admin_manual') NOT NULL DEFAULT 'company',
  `created_by_admin_id` INT NULL,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_referrer` FOREIGN KEY (`referred_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id` INT PRIMARY KEY,
  `full_name` VARCHAR(150) NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `profile_photo` TEXT NULL,
  `gender` VARCHAR(24) NULL,
  `state` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `terms_accepted` TINYINT(1) NOT NULL DEFAULT 1,
  `terms_accepted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `role_id` INT NOT NULL,
  `department` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_au_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_au_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL UNIQUE,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp_hash` TEXT NOT NULL,
  `otp_plain_dev` VARCHAR(16) NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `used_at` DATETIME NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. AFFILIATE SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `affiliate_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `code` CHAR(6) NOT NULL UNIQUE,
  `clicks` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ac_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commission_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `referrer_percentage` DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  `company_percentage` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_user_id` INT NOT NULL,
  `referred_user_id` INT NOT NULL UNIQUE,
  `affiliate_code` CHAR(6) NOT NULL,
  `locked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('registered', 'purchased') NOT NULL DEFAULT 'registered',
  CONSTRAINT `fk_ref_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ref_referred` FOREIGN KEY (`referred_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PACKAGES AND PAYMENTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `tagline` VARCHAR(255) NULL,
  `description` TEXT NOT NULL,
  `image_url` TEXT NOT NULL,
  `price_inr` DECIMAL(12,2) NOT NULL,
  `benefits_json` JSON NOT NULL,
  `duration_label` VARCHAR(100) NOT NULL DEFAULT 'Lifetime Access',
  `badge_text` VARCHAR(64) NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `status` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `package_name_snapshot` VARCHAR(150) NOT NULL,
  `gross_amount_inr` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `razorpay_order_id` VARCHAR(128) NOT NULL UNIQUE,
  `status` ENUM('created', 'pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'created',
  `no_refund_accepted` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ord_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ord_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `razorpay_order_id` VARCHAR(128) NOT NULL,
  `razorpay_payment_id` VARCHAR(128) NULL UNIQUE,
  `razorpay_signature` TEXT NULL,
  `payment_method` VARCHAR(64) NOT NULL DEFAULT 'razorpay',
  `gross_amount_inr` DECIMAL(12,2) NOT NULL,
  `status` ENUM('created', 'pending', 'successful', 'failed', 'cancelled') NOT NULL DEFAULT 'created',
  `verified_by` VARCHAR(32) NULL,
  `verified_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pay_ord` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pay_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_webhook_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` VARCHAR(128) NOT NULL UNIQUE,
  `event_type` VARCHAR(100) NOT NULL,
  `razorpay_order_id` VARCHAR(128) NULL,
  `razorpay_payment_id` VARCHAR(128) NULL,
  `signature` TEXT NOT NULL,
  `payload_json` JSON NOT NULL,
  `processed` TINYINT(1) NOT NULL DEFAULT 0,
  `processed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `affiliate_commissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commission_ref` VARCHAR(64) NOT NULL UNIQUE,
  `payment_id` INT NOT NULL UNIQUE,
  `order_id` INT NOT NULL UNIQUE,
  `referrer_user_id` INT NULL,
  `referred_user_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `gross_package_price_inr` DECIMAL(12,2) NOT NULL,
  `referrer_percentage` DECIMAL(5,2) NOT NULL,
  `referrer_amount_inr` DECIMAL(12,2) NOT NULL,
  `company_percentage` DECIMAL(5,2) NOT NULL,
  `company_amount_inr` DECIMAL(12,2) NOT NULL,
  `status` ENUM('pending', 'available', 'reversed') NOT NULL DEFAULT 'available',
  `credited_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ac_pay` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ac_ord` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. COURSES & LEARNING MANAGEMENT SYSTEM (LMS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  `thumbnail_url` TEXT NOT NULL,
  `short_description` TEXT NOT NULL,
  `overview` TEXT NOT NULL,
  `learning_objectives_json` JSON NOT NULL,
  `instructor_name` VARCHAR(120) NOT NULL DEFAULT 'LearnUp India Faculty',
  `level` VARCHAR(64) NOT NULL DEFAULT 'Comprehensive',
  `status` ENUM('active', 'draft', 'archived') NOT NULL DEFAULT 'active',
  `display_order` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `package_courses` (
  `package_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  PRIMARY KEY (`package_id`, `course_id`),
  CONSTRAINT `fk_pc_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_crs` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cm_crs` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `video_asset_key` VARCHAR(255) NOT NULL,
  `duration_seconds` INT NOT NULL DEFAULT 10,
  `is_compulsory` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_les_crs` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_les_mod` FOREIGN KEY (`module_id`) REFERENCES `course_modules`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_course_enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `order_id` INT NULL,
  `access_type` VARCHAR(32) NOT NULL DEFAULT 'lifetime',
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_course` (`user_id`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `lesson_id` INT NOT NULL,
  `last_position_seconds` INT NOT NULL DEFAULT 0,
  `watched_seconds_json` JSON NOT NULL,
  `verified_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_lesson` (`user_id`, `lesson_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `lesson_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `passing_percentage` DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  `max_attempts` INT NOT NULL DEFAULT 5,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `question_type` ENUM('single_choice', 'multiple_choice', 'true_false') NOT NULL DEFAULT 'single_choice',
  `question_text` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `points` INT NOT NULL DEFAULT 10,
  `display_order` INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question_id` INT NOT NULL,
  `option_text` TEXT NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `score_percentage` DECIMAL(5,2) NOT NULL,
  `earned_points` INT NOT NULL,
  `total_points` INT NOT NULL,
  `passed` TINYINT(1) NOT NULL,
  `answers_json` JSON NOT NULL,
  `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `instructions` TEXT NOT NULL,
  `due_days` INT NULL,
  `allowed_file_types` VARCHAR(255) NOT NULL DEFAULT '.pdf,.doc,.docx,.txt,.png,.jpg,.zip',
  `max_upload_mb` INT NOT NULL DEFAULT 10,
  `requires_approval` TINYINT(1) NOT NULL DEFAULT 1,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignment_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `submission_text` TEXT NULL,
  `file_url` LONGTEXT NULL,
  `file_name` VARCHAR(255) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `feedback` TEXT NULL,
  `reviewed_by_admin_id` INT NULL,
  `reviewed_at` DATETIME NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificate_code` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `course_title` VARCHAR(200) NOT NULL,
  `company_name` VARCHAR(150) NOT NULL DEFAULT 'LearnUp India (learnupindia.com)',
  `signatory_name` VARCHAR(150) NOT NULL DEFAULT 'Dr. Vikramaditya Sen, Dean of Academic Standards',
  `issued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_cert_user_course` (`user_id`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. WALLET AND WITHDRAWALS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `wallet_accounts` (
  `user_id` INT PRIMARY KEY,
  `available_commission_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pending_commission_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `bonus_amount_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reserved_withdrawal_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_withdrawn_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference_id` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `tx_type` VARCHAR(48) NOT NULL,
  `bucket` VARCHAR(32) NOT NULL,
  `direction` ENUM('credit', 'debit') NOT NULL,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `balance_after_inr` DECIMAL(12,2) NOT NULL,
  `description` TEXT NOT NULL,
  `related_payment_id` INT NULL,
  `related_withdrawal_id` INT NULL,
  `created_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bonus_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference_id` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `credited_by_admin_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_ref` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `payout_method` ENUM('bank_transfer', 'upi') NOT NULL,
  `account_holder_name` VARCHAR(150) NOT NULL,
  `bank_name` VARCHAR(150) NULL,
  `account_number` VARCHAR(64) NULL,
  `ifsc_code` VARCHAR(32) NULL,
  `upi_id` VARCHAR(120) NULL,
  `status` ENUM('pending', 'approved', 'processing', 'paid', 'rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT NULL,
  `admin_notes` TEXT NULL,
  `payment_reference` VARCHAR(128) NULL,
  `business_date_ist` DATE NOT NULL,
  `reviewed_by_admin_id` INT NULL,
  `reviewed_at` DATETIME NULL,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawal_payment_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `withdrawal_id` INT NOT NULL UNIQUE,
  `utr_or_reference` VARCHAR(128) NOT NULL UNIQUE,
  `payout_channel` VARCHAR(64) NOT NULL,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `processed_by_admin_id` INT NOT NULL,
  `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. KYC SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kyc_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `aadhaar_number_masked` VARCHAR(32) NOT NULL,
  `bank_name` VARCHAR(150) NOT NULL,
  `account_holder_name` VARCHAR(150) NOT NULL,
  `account_number` VARCHAR(64) NOT NULL,
  `ifsc_code` VARCHAR(32) NOT NULL,
  `upi_id` VARCHAR(120) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `gender` VARCHAR(32) NOT NULL,
  `status` ENUM('not_submitted', 'pending_review', 'approved', 'rejected', 'resubmission_required') NOT NULL DEFAULT 'pending_review',
  `rejection_reason` TEXT NULL,
  `reviewed_by_admin_id` INT NULL,
  `reviewed_at` DATETIME NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kyc_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kyc_submission_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `document_type` VARCHAR(64) NOT NULL DEFAULT 'aadhaar',
  `protected_file_path` TEXT NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size_bytes` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kyc_review_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kyc_submission_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `previous_status` VARCHAR(32) NOT NULL,
  `new_status` VARCHAR(32) NOT NULL,
  `reason` TEXT NULL,
  `reviewed_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. WEBSITE CMS & PAGE BUILDER
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `website_pages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `meta_description` TEXT NULL,
  `status` ENUM('draft', 'published', 'unpublished') NOT NULL DEFAULT 'published',
  `published_version` INT NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `page_id` INT NOT NULL,
  `section_key` VARCHAR(100) NOT NULL,
  `section_type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` TEXT NULL,
  `content_json` JSON NOT NULL,
  `draft_content_json` JSON NOT NULL,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_content` (
  `key` VARCHAR(100) PRIMARY KEY,
  `published_json` LONGTEXT NOT NULL,
  `draft_json` LONGTEXT NOT NULL,
  `has_unpublished_changes` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_by_admin_id` INT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'general',
  `file_url` TEXT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  `file_size_bytes` INT NOT NULL DEFAULT 0,
  `uploaded_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `page_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `page_slug` VARCHAR(100) NOT NULL,
  `version_number` INT NOT NULL,
  `snapshot_json` LONGTEXT NOT NULL,
  `note` TEXT NULL,
  `created_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. OTHER MODULES (TRADING, LEADERBOARD, COMMUNITY, OFFERS, NOTIFICATIONS, EMAIL)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `trading_videos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `thumbnail_url` TEXT NOT NULL,
  `video_asset_key` VARCHAR(255) NOT NULL,
  `duration_seconds` INT NOT NULL DEFAULT 10,
  `display_order` INT NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leaderboard_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `period_type` ENUM('weekly', 'monthly', 'all_time') NOT NULL,
  `user_id` INT NOT NULL,
  `rank` INT NOT NULL,
  `eligible_earnings_inr` DECIMAL(12,2) NOT NULL,
  `is_excluded` TINYINT(1) NOT NULL DEFAULT 0,
  `computed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `social_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` VARCHAR(64) NOT NULL UNIQUE,
  `label` VARCHAR(100) NOT NULL,
  `url` TEXT NOT NULL,
  `icon_name` VARCHAR(64) NOT NULL,
  `subscriber_count_label` VARCHAR(64) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `offer_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `batch_type` ENUM('VIP Batch', 'Premium Batch', 'Special Offers', 'Limited-Time Offers') NOT NULL,
  `description` TEXT NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `offers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `banner_url` TEXT NOT NULL,
  `destination_link` VARCHAR(255) NULL,
  `promo_badge` VARCHAR(64) NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `action_link` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_key` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_html` LONGTEXT NOT NULL,
  `sender_name` VARCHAR(120) NOT NULL DEFAULT 'LearnUp India Team',
  `sender_email` VARCHAR(150) NOT NULL DEFAULT 'team@learnupindia.com',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `template_key` VARCHAR(100) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_preview` TEXT NOT NULL,
  `status` ENUM('delivered', 'failed', 'queued') NOT NULL DEFAULT 'delivered',
  `error_message` TEXT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. ADMIN AND SECURITY
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admin_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NULL,
  `admin_role` VARCHAR(64) NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `affected_record` VARCHAR(200) NOT NULL,
  `previous_value` TEXT NULL,
  `new_value` TEXT NULL,
  `ip_address` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_category` VARCHAR(64) NOT NULL,
  `actor_type` VARCHAR(32) NOT NULL,
  `actor_id` INT NULL,
  `summary` TEXT NOT NULL,
  `metadata_json` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value_json` JSON NOT NULL,
  `updated_by_admin_id` INT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `backup_code` VARCHAR(64) NOT NULL UNIQUE,
  `backup_type` ENUM('manual', 'scheduled') NOT NULL,
  `includes_db` TINYINT(1) NOT NULL DEFAULT 1,
  `includes_media` TINYINT(1) NOT NULL DEFAULT 1,
  `encryption_algorithm` VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM',
  `file_path` TEXT NOT NULL,
  `file_size_bytes` INT NOT NULL,
  `checksum_sha256` VARCHAR(128) NOT NULL,
  `status` ENUM('completed', 'failed', 'verified') NOT NULL DEFAULT 'completed',
  `verified_at` DATETIME NULL,
  `created_by_admin_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restore_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `backup_id` INT NOT NULL,
  `status` ENUM('completed', 'test_verified', 'failed') NOT NULL,
  `notes` TEXT NULL,
  `restored_by_admin_id` INT NOT NULL,
  `restored_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
