-- =============================================================================
-- LEARNUP INDIA (learnupindia.com)
-- E-Learning & Affiliate Marketing Platform
-- Hostinger MySQL / MariaDB Complete Schema + Seed Data
-- Database: u591469534_educ
-- Username: u591469534_educt
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `is_system` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` LONGTEXT NOT NULL,
  `module` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` BIGINT NOT NULL,
  `permission_id` BIGINT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(191) NOT NULL,
  `password_hash` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `referred_by_user_id` BIGINT NULL,
  `referred_by_code` VARCHAR(191) NULL,
  `referral_locked` BIGINT NOT NULL DEFAULT 1,
  `acquisition_source` LONGTEXT NOT NULL,
  `created_by_admin_id` BIGINT NULL,
  `last_login_at` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` LONGTEXT NOT NULL,
  `date_of_birth` LONGTEXT NOT NULL,
  `profile_photo` LONGTEXT NULL,
  `gender` LONGTEXT NULL,
  `state` LONGTEXT NULL,
  `district` LONGTEXT NULL,
  `terms_accepted` BIGINT NOT NULL DEFAULT 1,
  `terms_accepted_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `role_id` BIGINT NOT NULL,
  `department` LONGTEXT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `token_hash` LONGTEXT NOT NULL,
  `ip_address` LONGTEXT NULL,
  `user_agent` LONGTEXT NULL,
  `expires_at` LONGTEXT NOT NULL,
  `revoked_at` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `otp_hash` LONGTEXT NOT NULL,
  `otp_plain_dev` LONGTEXT NULL,
  `attempts` BIGINT NOT NULL DEFAULT 0,
  `used_at` LONGTEXT NULL,
  `expires_at` LONGTEXT NOT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `affiliate_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `code` LONGTEXT NOT NULL,
  `clicks` BIGINT NOT NULL DEFAULT 0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commission_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `referrer_percentage` DECIMAL(14,2) NOT NULL DEFAULT 70.0,
  `company_percentage` DECIMAL(14,2) NOT NULL DEFAULT 30.0,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `updated_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_user_id` BIGINT NOT NULL,
  `referred_user_id` BIGINT NOT NULL,
  `affiliate_code` VARCHAR(191) NOT NULL,
  `locked_at` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `tagline` LONGTEXT NULL,
  `description` LONGTEXT NOT NULL,
  `image_url` LONGTEXT NOT NULL,
  `price_inr` DECIMAL(14,2) NOT NULL,
  `benefits_json` LONGTEXT NOT NULL,
  `duration_label` LONGTEXT NOT NULL,
  `badge_text` LONGTEXT NULL,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `status` LONGTEXT NOT NULL,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(191) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `package_id` BIGINT NOT NULL,
  `package_name_snapshot` LONGTEXT NOT NULL,
  `gross_amount_inr` DECIMAL(14,2) NOT NULL,
  `currency` LONGTEXT NOT NULL,
  `razorpay_order_id` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `no_refund_accepted` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `razorpay_order_id` LONGTEXT NOT NULL,
  `razorpay_payment_id` LONGTEXT NULL,
  `razorpay_signature` LONGTEXT NULL,
  `payment_method` LONGTEXT NOT NULL,
  `gross_amount_inr` DECIMAL(14,2) NOT NULL,
  `status` LONGTEXT NOT NULL,
  `verified_by` LONGTEXT NULL,
  `verified_at` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_webhook_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` LONGTEXT NOT NULL,
  `event_type` LONGTEXT NOT NULL,
  `razorpay_order_id` LONGTEXT NULL,
  `razorpay_payment_id` LONGTEXT NULL,
  `signature` LONGTEXT NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `processed` BIGINT NOT NULL DEFAULT 0,
  `processed_at` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `affiliate_commissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commission_ref` LONGTEXT NOT NULL,
  `payment_id` BIGINT NOT NULL,
  `order_id` BIGINT NOT NULL,
  `referrer_user_id` BIGINT NULL,
  `referred_user_id` BIGINT NOT NULL,
  `package_id` BIGINT NOT NULL,
  `gross_package_price_inr` DECIMAL(14,2) NOT NULL,
  `referrer_percentage` DECIMAL(14,2) NOT NULL,
  `referrer_amount_inr` DECIMAL(14,2) NOT NULL,
  `company_percentage` DECIMAL(14,2) NOT NULL,
  `company_amount_inr` DECIMAL(14,2) NOT NULL,
  `status` LONGTEXT NOT NULL,
  `credited_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `thumbnail_url` LONGTEXT NOT NULL,
  `short_description` LONGTEXT NOT NULL,
  `overview` LONGTEXT NOT NULL,
  `learning_objectives_json` LONGTEXT NOT NULL,
  `instructor_name` LONGTEXT NOT NULL,
  `level` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `package_courses` (
  `package_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  PRIMARY KEY (`package_id`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `description` LONGTEXT NULL,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` BIGINT NOT NULL,
  `module_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `description` LONGTEXT NULL,
  `video_asset_key` VARCHAR(191) NOT NULL,
  `duration_seconds` BIGINT NOT NULL DEFAULT 10,
  `is_compulsory` BIGINT NOT NULL DEFAULT 1,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_course_enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `package_id` BIGINT NOT NULL,
  `order_id` BIGINT NULL,
  `access_type` LONGTEXT NOT NULL,
  `is_completed` BIGINT NOT NULL DEFAULT 0,
  `completed_at` LONGTEXT NULL,
  `enrolled_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `lesson_id` BIGINT NOT NULL,
  `last_position_seconds` BIGINT NOT NULL DEFAULT 0,
  `watched_seconds_json` LONGTEXT NOT NULL,
  `verified_percent` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `is_completed` BIGINT NOT NULL DEFAULT 0,
  `completed_at` LONGTEXT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `lesson_id` BIGINT NULL,
  `title` LONGTEXT NOT NULL,
  `content` LONGTEXT NOT NULL,
  `created_at` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `description` LONGTEXT NULL,
  `passing_percentage` DECIMAL(14,2) NOT NULL DEFAULT 70.0,
  `max_attempts` BIGINT NOT NULL DEFAULT 5,
  `is_required` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` BIGINT NOT NULL,
  `question_type` LONGTEXT NOT NULL,
  `question_text` LONGTEXT NOT NULL,
  `explanation` LONGTEXT NULL,
  `points` BIGINT NOT NULL DEFAULT 10,
  `display_order` BIGINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question_id` BIGINT NOT NULL,
  `option_text` LONGTEXT NOT NULL,
  `is_correct` BIGINT NOT NULL DEFAULT 0,
  `display_order` BIGINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quiz_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `score_percentage` DECIMAL(14,2) NOT NULL,
  `earned_points` BIGINT NOT NULL,
  `total_points` BIGINT NOT NULL,
  `passed` BIGINT NOT NULL,
  `answers_json` LONGTEXT NOT NULL,
  `attempted_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `instructions` LONGTEXT NOT NULL,
  `due_days` BIGINT NULL,
  `allowed_file_types` LONGTEXT NOT NULL,
  `max_upload_mb` BIGINT NOT NULL DEFAULT 10,
  `requires_approval` BIGINT NOT NULL DEFAULT 1,
  `is_required` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignment_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `submission_text` LONGTEXT NULL,
  `file_url` LONGTEXT NULL,
  `file_name` LONGTEXT NULL,
  `status` LONGTEXT NOT NULL,
  `feedback` LONGTEXT NULL,
  `reviewed_by_admin_id` BIGINT NULL,
  `reviewed_at` LONGTEXT NULL,
  `submitted_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificate_code` VARCHAR(191) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `recipient_name` LONGTEXT NOT NULL,
  `course_title` LONGTEXT NOT NULL,
  `company_name` LONGTEXT NOT NULL,
  `signatory_name` LONGTEXT NOT NULL,
  `issued_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_accounts` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `available_commission_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.0,
  `pending_commission_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.0,
  `bonus_amount_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.0,
  `reserved_withdrawal_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.0,
  `total_withdrawn_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.0,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference_id` LONGTEXT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `tx_type` LONGTEXT NOT NULL,
  `bucket` LONGTEXT NOT NULL,
  `direction` LONGTEXT NOT NULL,
  `amount_inr` DECIMAL(14,2) NOT NULL,
  `balance_after_inr` DECIMAL(14,2) NOT NULL,
  `description` LONGTEXT NOT NULL,
  `related_payment_id` BIGINT NULL,
  `related_withdrawal_id` BIGINT NULL,
  `created_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bonus_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference_id` LONGTEXT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `amount_inr` DECIMAL(14,2) NOT NULL,
  `reason` LONGTEXT NOT NULL,
  `credited_by_admin_id` BIGINT NOT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_ref` LONGTEXT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `amount_inr` DECIMAL(14,2) NOT NULL,
  `payout_method` LONGTEXT NOT NULL,
  `account_holder_name` LONGTEXT NOT NULL,
  `bank_name` LONGTEXT NULL,
  `account_number` VARCHAR(191) NULL,
  `ifsc_code` VARCHAR(191) NULL,
  `upi_id` LONGTEXT NULL,
  `status` LONGTEXT NOT NULL,
  `rejection_reason` LONGTEXT NULL,
  `admin_notes` LONGTEXT NULL,
  `payment_reference` LONGTEXT NULL,
  `business_date_ist` LONGTEXT NOT NULL,
  `reviewed_by_admin_id` BIGINT NULL,
  `reviewed_at` LONGTEXT NULL,
  `paid_at` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawal_payment_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `withdrawal_id` BIGINT NOT NULL,
  `utr_or_reference` LONGTEXT NOT NULL,
  `payout_channel` LONGTEXT NOT NULL,
  `amount_inr` DECIMAL(14,2) NOT NULL,
  `processed_by_admin_id` BIGINT NOT NULL,
  `processed_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kyc_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `aadhaar_number_masked` LONGTEXT NOT NULL,
  `bank_name` LONGTEXT NOT NULL,
  `account_holder_name` LONGTEXT NOT NULL,
  `account_number` VARCHAR(191) NOT NULL,
  `ifsc_code` VARCHAR(191) NOT NULL,
  `upi_id` LONGTEXT NOT NULL,
  `state` LONGTEXT NOT NULL,
  `district` LONGTEXT NOT NULL,
  `gender` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `rejection_reason` LONGTEXT NULL,
  `reviewed_by_admin_id` BIGINT NULL,
  `reviewed_at` LONGTEXT NULL,
  `submitted_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kyc_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kyc_submission_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `document_type` LONGTEXT NOT NULL,
  `protected_file_path` LONGTEXT NOT NULL,
  `original_filename` LONGTEXT NOT NULL,
  `mime_type` LONGTEXT NOT NULL,
  `file_size_bytes` BIGINT NOT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kyc_review_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kyc_submission_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `previous_status` LONGTEXT NOT NULL,
  `new_status` LONGTEXT NOT NULL,
  `reason` LONGTEXT NULL,
  `reviewed_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_pages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(191) NOT NULL,
  `title` LONGTEXT NOT NULL,
  `meta_description` LONGTEXT NULL,
  `status` LONGTEXT NOT NULL,
  `published_version` BIGINT NOT NULL DEFAULT 1,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `page_id` BIGINT NOT NULL,
  `section_key` VARCHAR(191) NOT NULL,
  `section_type` LONGTEXT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `subtitle` LONGTEXT NULL,
  `content_json` LONGTEXT NOT NULL,
  `draft_content_json` LONGTEXT NOT NULL,
  `is_visible` BIGINT NOT NULL DEFAULT 1,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `website_content` (
  `key` VARCHAR(191) NOT NULL,
  `published_json` LONGTEXT NOT NULL,
  `draft_json` LONGTEXT NOT NULL,
  `has_unpublished_changes` BIGINT NOT NULL DEFAULT 0,
  `updated_by_admin_id` BIGINT NULL,
  `updated_at` LONGTEXT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` LONGTEXT NOT NULL,
  `category` LONGTEXT NOT NULL,
  `file_url` LONGTEXT NOT NULL,
  `mime_type` LONGTEXT NOT NULL,
  `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
  `uploaded_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `page_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `page_slug` LONGTEXT NOT NULL,
  `version_number` BIGINT NOT NULL,
  `snapshot_json` LONGTEXT NOT NULL,
  `note` LONGTEXT NULL,
  `created_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trading_videos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` LONGTEXT NOT NULL,
  `category` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `thumbnail_url` LONGTEXT NOT NULL,
  `video_asset_key` VARCHAR(191) NOT NULL,
  `duration_seconds` BIGINT NOT NULL DEFAULT 10,
  `display_order` BIGINT NOT NULL DEFAULT 1,
  `is_published` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leaderboard_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `period_type` LONGTEXT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `rank` BIGINT NOT NULL,
  `eligible_earnings_inr` DECIMAL(14,2) NOT NULL,
  `is_excluded` BIGINT NOT NULL DEFAULT 0,
  `computed_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `social_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` LONGTEXT NOT NULL,
  `label` LONGTEXT NOT NULL,
  `url` LONGTEXT NOT NULL,
  `icon_name` LONGTEXT NOT NULL,
  `subscriber_count_label` LONGTEXT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `display_order` BIGINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `offer_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` LONGTEXT NOT NULL,
  `batch_type` LONGTEXT NOT NULL,
  `description` LONGTEXT NULL,
  `start_at` LONGTEXT NOT NULL,
  `end_at` LONGTEXT NOT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `offers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `banner_url` LONGTEXT NOT NULL,
  `destination_link` LONGTEXT NULL,
  `promo_badge` LONGTEXT NULL,
  `start_at` LONGTEXT NOT NULL,
  `end_at` LONGTEXT NOT NULL,
  `is_active` BIGINT NOT NULL DEFAULT 1,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `message` LONGTEXT NOT NULL,
  `action_link` LONGTEXT NULL,
  `is_read` BIGINT NOT NULL DEFAULT 0,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_key` VARCHAR(191) NOT NULL,
  `name` LONGTEXT NOT NULL,
  `subject` LONGTEXT NOT NULL,
  `body_html` LONGTEXT NOT NULL,
  `sender_name` LONGTEXT NOT NULL,
  `sender_email` LONGTEXT NOT NULL,
  `updated_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NULL,
  `recipient_email` LONGTEXT NOT NULL,
  `template_key` VARCHAR(191) NOT NULL,
  `subject` LONGTEXT NOT NULL,
  `body_preview` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `error_message` LONGTEXT NULL,
  `sent_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` BIGINT NULL,
  `admin_role` LONGTEXT NOT NULL,
  `action` LONGTEXT NOT NULL,
  `affected_record` LONGTEXT NOT NULL,
  `previous_value` LONGTEXT NULL,
  `new_value` LONGTEXT NULL,
  `ip_address` LONGTEXT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_category` LONGTEXT NOT NULL,
  `actor_type` LONGTEXT NOT NULL,
  `actor_id` BIGINT NULL,
  `summary` LONGTEXT NOT NULL,
  `metadata_json` LONGTEXT NOT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `key` VARCHAR(191) NOT NULL,
  `value_json` LONGTEXT NOT NULL,
  `updated_by_admin_id` BIGINT NULL,
  `updated_at` LONGTEXT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `backup_code` VARCHAR(191) NOT NULL,
  `backup_type` LONGTEXT NOT NULL,
  `includes_db` BIGINT NOT NULL DEFAULT 1,
  `includes_media` BIGINT NOT NULL DEFAULT 1,
  `encryption_algorithm` LONGTEXT NOT NULL,
  `file_path` LONGTEXT NOT NULL,
  `file_size_bytes` BIGINT NOT NULL,
  `checksum_sha256` LONGTEXT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `verified_at` LONGTEXT NULL,
  `created_by_admin_id` BIGINT NULL,
  `created_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restore_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `backup_id` BIGINT NOT NULL,
  `status` LONGTEXT NOT NULL,
  `notes` LONGTEXT NULL,
  `restored_by_admin_id` BIGINT NOT NULL,
  `restored_at` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- INITIAL SEED DATA FOR LEARNUP INDIA (learnupindia.com) — u591469534_educ
-- =============================================================================

-- Seed: roles (6 rows)
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (1, 'Super Admin', 'super_admin', 'Full unrestricted access to all platform modules, security, and backups', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (2, 'Master Admin', 'master_admin', 'Broad platform management across CMS, users, packages, courses, and operations', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (3, 'Finance Admin', 'finance_admin', 'Manages payments, affiliate commissions, wallets, bonuses, withdrawals, and financial reports', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (4, 'Course Manager', 'course_manager', 'Manages courses, modules, video lessons, quizzes, assignments, and certificates', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (5, 'KYC Admin', 'kyc_admin', 'Reviews and verifies user KYC documents and identity submissions', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `roles` (`id`, `name`, `slug`, `description`, `is_system`, `created_at`) VALUES (6, 'Support Admin', 'support_admin', 'Handles user support inquiries and permitted account status management', 1, '2026-11-10 11:03:47');

-- Seed: permissions (12 rows)
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (1, 'cms.manage', 'CMS', 'Edit website CMS, sections, media, and publish versions');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (2, 'packages.manage', 'Packages', 'Create and edit learning packages and pricing');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (3, 'courses.manage', 'Courses', 'Manage courses, lessons, quizzes, assignments, and certificates');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (4, 'users.manage', 'Users', 'Create, view, edit, and suspend user accounts');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (5, 'affiliate.manage', 'Affiliate', 'View affiliate hierarchy, commissions, and configure rules');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (6, 'finance.manage', 'Finance', 'Manage wallet ledgers, bonus credits, and financial reports');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (7, 'withdrawals.manage', 'Withdrawals', 'Approve, process, pay, or reject withdrawal requests');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (8, 'kyc.manage', 'KYC', 'Inspect protected KYC documents and approve/reject KYC');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (9, 'offers.manage', 'Offers', 'Manage promotional banners, batches, community, and leaderboard');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (10, 'reports.view', 'Reports', 'View and export platform analytics and ledger reports');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (11, 'roles.manage', 'Security', 'Configure admin roles, permissions, and view activity logs');
INSERT IGNORE INTO `permissions` (`id`, `code`, `module`, `description`) VALUES (12, 'backups.manage', 'Backups', 'Create, verify, and restore encrypted platform backups');

-- Seed: role_permissions (32 rows)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 1);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 2);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 3);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 4);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 5);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 6);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 7);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 8);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 9);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 10);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 11);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 12);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 1);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 2);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 3);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 4);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 5);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 6);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 7);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 8);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 9);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (2, 10);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 5);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 6);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 7);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 10);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (4, 3);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (4, 10);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (5, 8);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (5, 4);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (6, 4);
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (6, 9);

-- Seed: users (9 rows)
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (1, 'admin@edurt.in', '9810000001', '$2b$10$lM66dmvb4Han.y2yiQUEpuQNsojW1owzHFi2UIVdxaDezB6s4Whuy', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (2, 'finance@edurt.in', '9810000002', '$2b$10$lM66dmvb4Han.y2yiQUEpuQNsojW1owzHFi2UIVdxaDezB6s4Whuy', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (3, 'kyc@edurt.in', '9810000003', '$2b$10$lM66dmvb4Han.y2yiQUEpuQNsojW1owzHFi2UIVdxaDezB6s4Whuy', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (4, 'faculty@edurt.in', '9810000004', '$2b$10$lM66dmvb4Han.y2yiQUEpuQNsojW1owzHFi2UIVdxaDezB6s4Whuy', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (5, 'aarav.mehta@gmail.com', '9820456712', '$2b$10$H9jVAnevHjxvjtKBdf3KZu2zYjgVpe4mN7VOarNfF/dsfMoLBek9u', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (6, 'priya.nair@gmail.com', '9845112233', '$2b$10$H9jVAnevHjxvjtKBdf3KZu2zYjgVpe4mN7VOarNfF/dsfMoLBek9u', 'active', 5, 'AB1234', 1, 'referral', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (7, 'rohan.kapoor@gmail.com', '9871223344', '$2b$10$H9jVAnevHjxvjtKBdf3KZu2zYjgVpe4mN7VOarNfF/dsfMoLBek9u', 'active', 5, 'AB1234', 1, 'referral', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (8, 'kavya.sharma@gmail.com', '9899334455', '$2b$10$H9jVAnevHjxvjtKBdf3KZu2zYjgVpe4mN7VOarNfF/dsfMoLBek9u', 'active', 5, 'AB1234', 1, 'referral', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `password_hash`, `status`, `referred_by_user_id`, `referred_by_code`, `referral_locked`, `acquisition_source`, `created_by_admin_id`, `last_login_at`, `created_at`, `updated_at`) VALUES (9, 'team@learnupindia.com', '9810000009', '$2b$10$9mTky/uJ2XX4BdjixVJ96.8fD1RmN/HzgOyKQo0aZwLgav1OH03q.', 'active', NULL, NULL, 1, 'company', NULL, NULL, '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: user_profiles (9 rows)
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (1, 'Vikramaditya Sen (Super Admin)', '1986-04-12', NULL, 'Prefer not to say', 'Maharashtra', 'Mumbai', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (2, 'Meera Krishnan (Finance Admin)', '1990-08-22', NULL, 'Prefer not to say', 'Maharashtra', 'Mumbai', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (3, 'Siddharth Verma (KYC Officer)', '1992-01-19', NULL, 'Prefer not to say', 'Maharashtra', 'Mumbai', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (4, 'Ananya Deshmukh (Course Dean)', '1989-11-05', NULL, 'Prefer not to say', 'Maharashtra', 'Mumbai', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (5, 'Aarav Mehta', '1997-06-15', NULL, 'Prefer not to say', 'Karnataka', 'Bengaluru Urban', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (6, 'Priya Nair', '1999-03-21', NULL, 'Prefer not to say', 'Kerala', 'Ernakulam', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (7, 'Rohan Kapoor', '1996-09-10', NULL, 'Prefer not to say', 'Delhi', 'New Delhi', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (8, 'Kavya Sharma', '1998-12-03', NULL, 'Prefer not to say', 'Telangana', 'Hyderabad', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_profiles` (`user_id`, `full_name`, `date_of_birth`, `profile_photo`, `gender`, `state`, `district`, `terms_accepted`, `terms_accepted_at`, `updated_at`) VALUES (9, 'LearnUp India Executive Team', '1988-01-01', NULL, 'Prefer not to say', 'Maharashtra', 'Mumbai', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: admin_users (5 rows)
INSERT IGNORE INTO `admin_users` (`id`, `user_id`, `role_id`, `department`, `is_active`, `created_at`) VALUES (1, 1, 1, 'Executive Governance', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_users` (`id`, `user_id`, `role_id`, `department`, `is_active`, `created_at`) VALUES (2, 2, 3, 'Treasury & Ledger', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_users` (`id`, `user_id`, `role_id`, `department`, `is_active`, `created_at`) VALUES (3, 3, 5, 'Compliance & KYC', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_users` (`id`, `user_id`, `role_id`, `department`, `is_active`, `created_at`) VALUES (4, 4, 4, 'Curriculum & LMS', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_users` (`id`, `user_id`, `role_id`, `department`, `is_active`, `created_at`) VALUES (5, 9, 1, 'LearnUp India Founder Desk', 1, '2026-11-10 11:03:47');

-- Seed: affiliate_codes (9 rows)
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (1, 1, 'AD1001', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (2, 2, 'FN1002', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (3, 3, 'KY1003', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (4, 4, 'CM1004', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (5, 5, 'AB1234', 148, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (6, 6, 'PN2048', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (7, 7, 'RK3091', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (8, 8, 'KS4102', 12, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `affiliate_codes` (`id`, `user_id`, `code`, `clicks`, `is_active`, `created_at`) VALUES (9, 9, 'LU1009', 12, 1, '2026-11-10 11:03:47');

-- Seed: commission_rules (1 rows)
INSERT IGNORE INTO `commission_rules` (`id`, `name`, `referrer_percentage`, `company_percentage`, `is_active`, `updated_by_admin_id`, `created_at`) VALUES (1, 'Standard Direct Referral Policy (70/30 Gross)', 70, 30, 1, NULL, '2026-11-10 11:03:47');

-- Seed: referrals (3 rows)
INSERT IGNORE INTO `referrals` (`id`, `referrer_user_id`, `referred_user_id`, `affiliate_code`, `locked_at`, `status`) VALUES (1, 5, 6, 'AB1234', '2026-11-10 11:03:47', 'purchased');
INSERT IGNORE INTO `referrals` (`id`, `referrer_user_id`, `referred_user_id`, `affiliate_code`, `locked_at`, `status`) VALUES (2, 5, 7, 'AB1234', '2026-11-10 11:03:47', 'purchased');
INSERT IGNORE INTO `referrals` (`id`, `referrer_user_id`, `referred_user_id`, `affiliate_code`, `locked_at`, `status`) VALUES (3, 5, 8, 'AB1234', '2026-11-10 11:03:47', 'purchased');

-- Seed: packages (3 rows)
INSERT IGNORE INTO `packages` (`id`, `name`, `slug`, `tagline`, `description`, `image_url`, `price_inr`, `benefits_json`, `duration_label`, `badge_text`, `display_order`, `status`, `created_at`, `updated_at`) VALUES (1, 'Foundation Mastery Package', 'foundation-mastery', 'Essential digital acquisition & affiliate systems for emerging builders', 'Gain lifetime access to our core High-Conversion Affiliate Systems curriculum, private learner notes, interactive assessments, and verified course certification on LearnUp India.', '/assets/media/pkg_starter.jpg', 2999, '["Lifetime Access to Core Affiliate Curriculum","100% Verified Course Completion Certificate","Direct Referral Affiliate Eligibility (70% Gross Commission)","Private Lesson Notes & Interactive Quizzes","Access to Free Educational Trading Library"]', 'Lifetime Access', 'ESSENTIAL', 1, 'active', '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `packages` (`id`, `name`, `slug`, `tagline`, `description`, `image_url`, `price_inr`, `benefits_json`, `duration_label`, `badge_text`, `display_order`, `status`, `created_at`, `updated_at`) VALUES (2, 'Pro Accelerator Package', 'pro-accelerator', 'Dual-track mastery combining Affiliate Architecture & Quantitative Market Foundations', 'Engineered for serious practitioners seeking both digital funnel mastery and quantitative risk management foundations, with priority assignment review.', '/assets/media/pkg_pro.jpg', 5999, '["Includes Everything in Foundation Mastery","Quantitative Price Action & Risk Management Course","Capstone Assignment Review & Faculty Feedback","70% Direct Commission on Referred Package Sales","Weekly Affiliate Leaderboard Eligibility"]', 'Lifetime Access', 'MOST POPULAR', 2, 'active', '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `packages` (`id`, `name`, `slug`, `tagline`, `description`, `image_url`, `price_inr`, `benefits_json`, `duration_label`, `badge_text`, `display_order`, `status`, `created_at`, `updated_at`) VALUES (3, 'Elite Executive Summit Package', 'elite-executive-summit', 'Complete all-access institutional curriculum including AI Automation & Digital Scaling', 'Our flagship all-inclusive package unlocking every course on LearnUp India, VIP Batch promotional cohorts, executive certification, and full affiliate partner privileges.', '/assets/media/pkg_elite.jpg', 10000, '["All 3 Flagship Courses Included (Lifetime Access)","AI-Driven Content Automation & Digital Product Scaling","Executive Separate Certificates for Every Completed Course","VIP Batch & Promotional Cohort Access","70% Gross Commission (₹7,000 per Elite Referral)"]', 'Lifetime Access', 'FLAGSHIP', 3, 'active', '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: orders (4 rows)
INSERT IGNORE INTO `orders` (`id`, `order_number`, `user_id`, `package_id`, `package_name_snapshot`, `gross_amount_inr`, `currency`, `razorpay_order_id`, `status`, `no_refund_accepted`, `created_at`, `updated_at`) VALUES (1, 'ORD-2026-10001', 5, 3, 'Elite Executive Summit Package', 10000, 'INR', 'order_rzp_seed_10001', 'paid', 1, '2026-10-23 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `orders` (`id`, `order_number`, `user_id`, `package_id`, `package_name_snapshot`, `gross_amount_inr`, `currency`, `razorpay_order_id`, `status`, `no_refund_accepted`, `created_at`, `updated_at`) VALUES (2, 'ORD-2026-10002', 6, 3, 'Elite Executive Summit Package', 10000, 'INR', 'order_rzp_seed_10002', 'paid', 1, '2026-10-29 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `orders` (`id`, `order_number`, `user_id`, `package_id`, `package_name_snapshot`, `gross_amount_inr`, `currency`, `razorpay_order_id`, `status`, `no_refund_accepted`, `created_at`, `updated_at`) VALUES (3, 'ORD-2026-10003', 7, 2, 'Pro Accelerator Package', 5999, 'INR', 'order_rzp_seed_10003', 'paid', 1, '2026-11-06 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `orders` (`id`, `order_number`, `user_id`, `package_id`, `package_name_snapshot`, `gross_amount_inr`, `currency`, `razorpay_order_id`, `status`, `no_refund_accepted`, `created_at`, `updated_at`) VALUES (4, 'ORD-2026-10004', 8, 3, 'Elite Executive Summit Package', 10000, 'INR', 'order_rzp_seed_10004', 'paid', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: payments (4 rows)
INSERT IGNORE INTO `payments` (`id`, `order_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `payment_method`, `gross_amount_inr`, `status`, `verified_by`, `verified_at`, `created_at`, `updated_at`) VALUES (1, 1, 5, 'order_rzp_seed_10001', 'pay_rzp_seed_10001', 'verified_hmac_seed_1', 'razorpay', 10000, 'successful', 'server_signature', '2026-10-23 11:03:47', '2026-10-23 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `payments` (`id`, `order_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `payment_method`, `gross_amount_inr`, `status`, `verified_by`, `verified_at`, `created_at`, `updated_at`) VALUES (2, 2, 6, 'order_rzp_seed_10002', 'pay_rzp_seed_10002', 'verified_hmac_seed_2', 'razorpay', 10000, 'successful', 'server_signature', '2026-10-29 11:03:47', '2026-10-29 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `payments` (`id`, `order_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `payment_method`, `gross_amount_inr`, `status`, `verified_by`, `verified_at`, `created_at`, `updated_at`) VALUES (3, 3, 7, 'order_rzp_seed_10003', 'pay_rzp_seed_10003', 'verified_hmac_seed_3', 'razorpay', 5999, 'successful', 'webhook', '2026-11-06 11:03:47', '2026-11-06 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `payments` (`id`, `order_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `payment_method`, `gross_amount_inr`, `status`, `verified_by`, `verified_at`, `created_at`, `updated_at`) VALUES (4, 4, 8, 'order_rzp_seed_10004', 'pay_rzp_seed_10004', 'verified_hmac_seed_4', 'razorpay', 10000, 'successful', 'server_signature', '2026-11-10 11:03:47', '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: affiliate_commissions (4 rows)
INSERT IGNORE INTO `affiliate_commissions` (`id`, `commission_ref`, `payment_id`, `order_id`, `referrer_user_id`, `referred_user_id`, `package_id`, `gross_package_price_inr`, `referrer_percentage`, `referrer_amount_inr`, `company_percentage`, `company_amount_inr`, `status`, `credited_at`) VALUES (1, 'COM-2026-10001', 1, 1, NULL, 5, 3, 10000, 0, 0, 100, 10000, 'available', '2026-10-23 11:03:47');
INSERT IGNORE INTO `affiliate_commissions` (`id`, `commission_ref`, `payment_id`, `order_id`, `referrer_user_id`, `referred_user_id`, `package_id`, `gross_package_price_inr`, `referrer_percentage`, `referrer_amount_inr`, `company_percentage`, `company_amount_inr`, `status`, `credited_at`) VALUES (2, 'COM-2026-10002', 2, 2, 5, 6, 3, 10000, 70, 7000, 30, 3000, 'available', '2026-10-29 11:03:47');
INSERT IGNORE INTO `affiliate_commissions` (`id`, `commission_ref`, `payment_id`, `order_id`, `referrer_user_id`, `referred_user_id`, `package_id`, `gross_package_price_inr`, `referrer_percentage`, `referrer_amount_inr`, `company_percentage`, `company_amount_inr`, `status`, `credited_at`) VALUES (3, 'COM-2026-10003', 3, 3, 5, 7, 2, 5999, 70, 4199.3, 30, 1799.7, 'available', '2026-11-06 11:03:47');
INSERT IGNORE INTO `affiliate_commissions` (`id`, `commission_ref`, `payment_id`, `order_id`, `referrer_user_id`, `referred_user_id`, `package_id`, `gross_package_price_inr`, `referrer_percentage`, `referrer_amount_inr`, `company_percentage`, `company_amount_inr`, `status`, `credited_at`) VALUES (4, 'COM-2026-10004', 4, 4, 5, 8, 3, 10000, 70, 7000, 30, 3000, 'available', '2026-11-10 11:03:47');

-- Seed: courses (6 rows)
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (1, 'High-Conversion Affiliate Systems & Funnel Architecture', 'affiliate-systems-funnel-architecture', '/assets/media/course_affiliate.jpg', 'Master ethical direct-response acquisition, attribution mechanics, and high-trust partner conversion workflows.', 'An intensive, hands-on curriculum designed for modern digital entrepreneurs on LearnUp India. Learn how to construct high-converting educational funnels, build organic authority across content channels, and optimize direct referral economics with precision analytics.', '["Design high-converting landing ecosystems and ethical referral workflows","Master attribution tracking, audience segmentation, and organic distribution","Build sustainable recurring partner pipelines without paid ad waste","Analyze unit economics, gross margin splits, and conversion velocity"]', 'Prof. Devansh Kulkarni', 'Foundation to Advanced', 'active', 1, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (2, 'Quantitative Price Action & Risk Management Foundations', 'quantitative-price-action-risk-management', '/assets/media/course_trading.jpg', 'Institutional market structure, position sizing mathematics, and disciplined drawdown control.', 'Explore the mechanics of financial market liquidity, multi-timeframe structure, and quantitative risk management. Built strictly for educational mastery of capital preservation and probability-driven execution.', '["Calculate exact position sizing using R-multiple risk frameworks","Identify institutional liquidity zones and structural market shifts","Implement strict daily and weekly drawdown circuit breakers","Maintain an auditable quantitative execution journal"]', 'Siddharth Malhotra, CMT', 'Intermediate', 'active', 2, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (3, 'AI-Driven Content Automation & Digital Product Scaling', 'ai-content-automation-digital-scaling', '/assets/media/course_growth.jpg', 'Scale executive media production, automated CRM pipelines, and enterprise community operations.', 'Harness modern AI workflows to research, script, produce, and distribute authority content at 10x speed while maintaining bespoke editorial quality and high audience retention.', '["Architect automated multi-channel content distribution pipelines","Build high-retention video scripts and interactive learning assets","Integrate conversational CRM workflows for inbound lead qualification","Scale digital operations with zero headcount bloat"]', 'Dr. Ira Chatterjee', 'Executive Advanced', 'active', 3, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (4, 'Full-Stack Web Mastery (React 19, Node.js & Cloud)', 'full-stack-web-mastery', '/assets/media/course_growth.jpg', 'Build robust enterprise web applications with React 19, TypeScript, RESTful Node APIs, and cloud deployments.', 'Comprehensive hands-on curriculum taking you from modern JavaScript frameworks through enterprise backend architecture, database indexing, and automated cloud deployments.', '["Master React 19 hooks, state management, and modern component lifecycle","Engineer scalable Node.js and Express RESTful API backends with authentication","Implement relational database schemas, migrations, and query indexing","Deploy resilient full-stack systems to cloud infrastructure with zero downtime"]', 'Prof. Arjun Sengupta', 'Beginner to Advanced', 'active', 4, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (5, 'Cybersecurity & Enterprise Cloud DevSecOps', 'cybersecurity-enterprise-devsecops', '/assets/media/course_trading.jpg', 'Zero-trust network architecture, vulnerability management, cloud IAM, and automated CI/CD pipeline defense.', 'Hands-on security engineering covering modern threat defense, cloud infrastructure hardening, secret management, and compliance standards.', '["Architect zero-trust security postures across public cloud environments","Implement automated static and dynamic security analysis in CI/CD pipelines","Master cryptographic access control, tokens, and OAuth2 security patterns","Conduct vulnerability assessments and security audit logging"]', 'Kabir Saxena, CISSP', 'Intermediate to Advanced', 'active', 5, '2026-11-10 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `thumbnail_url`, `short_description`, `overview`, `learning_objectives_json`, `instructor_name`, `level`, `status`, `display_order`, `created_at`, `updated_at`) VALUES (6, 'Financial Modeling & Venture Capital Valuation', 'financial-modeling-venture-capital', '/assets/media/course_affiliate.jpg', 'Three-statement financial modeling, DCF valuations, startup cap tables, and institutional investor pitch decks.', 'Learn the rigorous financial modeling techniques used by venture capitalists and investment bankers to value growth companies and negotiate funding rounds.', '["Build dynamic 3-statement integrated financial forecast models","Execute DCF, comparable company, and precedent transaction valuations","Structure startup capitalization tables, dilution, and SAFEs","Design institutional-grade investment memorandums and unit economics models"]', 'Meera Krishnan, CFA', 'Executive', 'active', 6, '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: package_courses (12 rows)
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (1, 1);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (1, 4);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (2, 1);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (2, 2);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (2, 3);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (2, 4);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 1);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 2);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 3);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 4);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 5);
INSERT IGNORE INTO `package_courses` (`package_id`, `course_id`) VALUES (3, 6);

-- Seed: course_modules (12 rows)
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (1, 1, 'Module 1: Core Architecture & Principles (Affiliate Systems)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (2, 1, 'Module 2: Execution Playbooks & Case Studies (Affiliate Systems)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (3, 2, 'Module 1: Core Architecture & Principles (Quantitative Risk)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (4, 2, 'Module 2: Execution Playbooks & Case Studies (Quantitative Risk)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (5, 3, 'Module 1: Core Architecture & Principles (AI Scaling)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (6, 3, 'Module 2: Execution Playbooks & Case Studies (AI Scaling)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (7, 4, 'Module 1: Core Architecture & Principles (Full-Stack Engineering)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (8, 4, 'Module 2: Execution Playbooks & Case Studies (Full-Stack Engineering)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (9, 5, 'Module 1: Core Architecture & Principles (Enterprise DevSecOps)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (10, 5, 'Module 2: Execution Playbooks & Case Studies (Enterprise DevSecOps)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (11, 6, 'Module 1: Core Architecture & Principles (Venture Finance)', 'Foundational frameworks, mental models, and operational setup.', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `course_modules` (`id`, `course_id`, `title`, `description`, `display_order`, `created_at`) VALUES (12, 6, 'Module 2: Execution Playbooks & Case Studies (Venture Finance)', 'Step-by-step implementation walkthroughs and real-world optimization.', 2, '2026-11-10 11:03:47');

-- Seed: lessons (12 rows)
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (1, 1, 1, 'Affiliate Systems — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (2, 1, 2, 'Affiliate Systems — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (3, 2, 3, 'Quantitative Risk — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (4, 2, 4, 'Quantitative Risk — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (5, 3, 5, 'AI Scaling — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (6, 3, 6, 'AI Scaling — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (7, 4, 7, 'Full-Stack Engineering — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (8, 4, 8, 'Full-Stack Engineering — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (9, 5, 9, 'Enterprise DevSecOps — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (10, 5, 10, 'Enterprise DevSecOps — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (11, 6, 11, 'Venture Finance — Lesson 1.1: Strategic Framework & Unit Economics', 'Watch the complete 10-second verified stream without skipping to unlock verified completion.', 'lesson_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `lessons` (`id`, `course_id`, `module_id`, `title`, `description`, `video_asset_key`, `duration_seconds`, `is_compulsory`, `display_order`, `created_at`) VALUES (12, 6, 12, 'Venture Finance — Lesson 2.1: Live Systems Implementation & Audit', 'Complete 100% verified playback of this compulsory lesson to qualify for certification.', 'lesson_stream_2.mp4', 10, 1, 2, '2026-11-10 11:03:47');

-- Seed: user_course_enrollments (14 rows)
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (1, 5, 1, 3, 1, 'lifetime', 1, '2026-10-31 11:03:47', '2026-10-23 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (2, 5, 2, 3, 1, 'lifetime', 0, NULL, '2026-10-23 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (3, 5, 3, 3, 1, 'lifetime', 0, NULL, '2026-10-23 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (4, 6, 1, 3, 2, 'lifetime', 0, NULL, '2026-10-29 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (5, 6, 2, 3, 2, 'lifetime', 0, NULL, '2026-10-29 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (6, 6, 3, 3, 2, 'lifetime', 0, NULL, '2026-10-29 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (7, 7, 1, 2, 3, 'lifetime', 0, NULL, '2026-11-06 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (8, 7, 2, 2, 3, 'lifetime', 0, NULL, '2026-11-06 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (9, 8, 1, 3, 4, 'lifetime', 0, NULL, '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (10, 8, 2, 3, 4, 'lifetime', 0, NULL, '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (11, 8, 3, 3, 4, 'lifetime', 0, NULL, '2026-11-10 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (12, 5, 4, 3, 1, 'lifetime', 0, NULL, '2026-10-23 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (13, 5, 5, 3, 1, 'lifetime', 0, NULL, '2026-10-23 11:03:47');
INSERT IGNORE INTO `user_course_enrollments` (`id`, `user_id`, `course_id`, `package_id`, `order_id`, `access_type`, `is_completed`, `completed_at`, `enrolled_at`) VALUES (14, 5, 6, 3, 1, 'lifetime', 0, NULL, '2026-10-23 11:03:47');

-- Seed: lesson_progress (2 rows)
INSERT IGNORE INTO `lesson_progress` (`id`, `user_id`, `course_id`, `lesson_id`, `last_position_seconds`, `watched_seconds_json`, `verified_percent`, `is_completed`, `completed_at`, `updated_at`) VALUES (1, 5, 1, 1, 10, '[0,1,2,3,4,5,6,7,8,9]', 100, 1, '2026-10-29 11:03:47', '2026-11-10 11:03:47');
INSERT IGNORE INTO `lesson_progress` (`id`, `user_id`, `course_id`, `lesson_id`, `last_position_seconds`, `watched_seconds_json`, `verified_percent`, `is_completed`, `completed_at`, `updated_at`) VALUES (2, 5, 1, 2, 10, '[0,1,2,3,4,5,6,7,8,9]', 100, 1, '2026-10-30 11:03:47', '2026-11-10 11:03:47');

-- Seed: user_notes (1 rows)
INSERT IGNORE INTO `user_notes` (`id`, `user_id`, `course_id`, `lesson_id`, `title`, `content`, `created_at`, `updated_at`) VALUES (1, 5, 1, 1, 'Direct Attribution Key Takeaway', 'Referral codes lock permanently at registration. Always share the direct https://learnupindia.com/?ref=AB1234 registration link so attribution is captured before checkout.', '2026-11-10 11:03:47', '2026-11-10 11:03:47');

-- Seed: quizzes (6 rows)
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (1, 1, 'Affiliate Systems Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (2, 2, 'Quantitative Risk Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (3, 3, 'AI Scaling Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (4, 4, 'Full-Stack Engineering Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (5, 5, 'Enterprise DevSecOps Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `quizzes` (`id`, `course_id`, `title`, `description`, `passing_percentage`, `max_attempts`, `is_required`, `created_at`) VALUES (6, 6, 'Venture Finance Certification Assessment', 'Complete this certification assessment with at least 70% score.', 70, 5, 1, '2026-11-10 11:03:47');

-- Seed: quiz_questions (12 rows)
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (1, 1, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (2, 1, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (3, 2, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (4, 2, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (5, 3, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (6, 3, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (7, 4, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (8, 4, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (9, 5, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (10, 5, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (11, 6, 'single_choice', 'On LearnUp India (learnupindia.com), what percentage of the gross package price is credited to an eligible direct referrer?', 'LearnUp India credits 70% of the gross package price to the direct referrer and retains 30% for the company.', 50, 1);
INSERT IGNORE INTO `quiz_questions` (`id`, `quiz_id`, `question_type`, `question_text`, `explanation`, `points`, `display_order`) VALUES (12, 6, 'true_false', 'Skipping directly to the end of a compulsory video lesson marks the video as completed.', 'False. The server verifies 100% watched segments; skipping unwatched portions never marks a lesson complete.', 50, 2);

-- Seed: quiz_options (30 rows)
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (1, 1, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (2, 1, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (3, 1, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (4, 2, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (5, 2, 'True — scrubbing to the end is sufficient', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (6, 3, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (7, 3, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (8, 3, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (9, 4, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (10, 4, 'True — scrubbing to the end is sufficient', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (11, 5, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (12, 5, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (13, 5, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (14, 6, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (15, 6, 'True — scrubbing to the end is sufficient', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (16, 7, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (17, 7, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (18, 7, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (19, 8, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (20, 8, 'True — scrubbing to the end is sufficient', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (21, 9, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (22, 9, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (23, 9, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (24, 10, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (25, 10, 'True — scrubbing to the end is sufficient', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (26, 11, '70% of Gross Package Selling Price', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (27, 11, '50% after gateway fee deductions', 0, 2);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (28, 11, '25% multi-level override', 0, 3);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (29, 12, 'False — 100% verified watch progress is required', 1, 1);
INSERT IGNORE INTO `quiz_options` (`id`, `question_id`, `option_text`, `is_correct`, `display_order`) VALUES (30, 12, 'True — scrubbing to the end is sufficient', 0, 2);

-- Seed: quiz_attempts (1 rows)
INSERT IGNORE INTO `quiz_attempts` (`id`, `quiz_id`, `user_id`, `score_percentage`, `earned_points`, `total_points`, `passed`, `answers_json`, `attempted_at`) VALUES (1, 1, 5, 100, 100, 100, 1, '{}', '2026-10-31 11:03:47');

-- Seed: assignments (6 rows)
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (1, 1, 'Affiliate Systems Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (2, 2, 'Quantitative Risk Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (3, 3, 'AI Scaling Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (4, 4, 'Full-Stack Engineering Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (5, 5, 'Enterprise DevSecOps Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `assignments` (`id`, `course_id`, `title`, `instructions`, `due_days`, `allowed_file_types`, `max_upload_mb`, `requires_approval`, `is_required`, `created_at`) VALUES (6, 6, 'Venture Finance Capstone Implementation Blueprint', 'Submit a concise executive summary (or attach a document) detailing your 30-day implementation plan and risk controls.', 14, '.pdf,.doc,.docx,.txt,.png,.jpg,.zip', 10, 1, 1, '2026-11-10 11:03:47');

-- Seed: assignment_submissions (1 rows)
INSERT IGNORE INTO `assignment_submissions` (`id`, `assignment_id`, `course_id`, `user_id`, `submission_text`, `file_url`, `file_name`, `status`, `feedback`, `reviewed_by_admin_id`, `reviewed_at`, `submitted_at`) VALUES (1, 1, 1, 5, 'Implemented a 3-stage organic educational funnel with attribution locking and content cohort onboarding.', NULL, NULL, 'approved', 'Exemplary architecture and unit economics breakdown. Approved for certification.', 1, '2026-10-31 11:03:47', '2026-10-30 11:03:47');

-- Seed: certificates (1 rows)
INSERT IGNORE INTO `certificates` (`id`, `certificate_code`, `user_id`, `course_id`, `recipient_name`, `course_title`, `company_name`, `signatory_name`, `issued_at`) VALUES (1, 'CERT-2026-884920', 5, 1, 'Aarav Mehta', 'High-Conversion Affiliate Systems & Funnel Architecture', 'LearnUp India (learnupindia.com)', 'Dr. Vikramaditya Sen, Dean of Academic Standards', '2026-10-31 11:03:47');

-- Seed: wallet_accounts (9 rows)
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (1, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (2, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (3, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (4, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (5, 13699.3, 0, 1250, 1500, 3000, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (6, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (7, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (8, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `wallet_accounts` (`user_id`, `available_commission_inr`, `pending_commission_inr`, `bonus_amount_inr`, `reserved_withdrawal_inr`, `total_withdrawn_inr`, `updated_at`) VALUES (9, 0, 0, 0, 0, 0, '2026-11-10 11:03:47');

-- Seed: wallet_transactions (7 rows)
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (1, 'TXN-2026-90001', 5, 'commission_credit', 'available_commission', 'credit', 7000, 7000, '70% Direct Referral Commission — Priya Nair (Elite Executive Summit)', 2, NULL, NULL, '2026-10-29 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (2, 'TXN-2026-90002', 5, 'withdrawal_reservation', 'available_commission', 'debit', 3000, 4000, 'Withdrawal Request Reserved (WDR-2026-50001)', NULL, NULL, NULL, '2026-11-02 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (3, 'TXN-2026-90003', 5, 'withdrawal_payment', 'reserved', 'debit', 3000, 0, 'Withdrawal Paid via Bank Transfer UTR HDFC20268839201 (WDR-2026-50001)', NULL, NULL, NULL, '2026-11-03 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (4, 'TXN-2026-90004', 5, 'commission_credit', 'available_commission', 'credit', 4199.3, 8199.3, '70% Direct Referral Commission — Rohan Kapoor (Pro Accelerator)', 3, NULL, NULL, '2026-11-06 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (5, 'TXN-2026-90005', 5, 'bonus_credit', 'bonus', 'credit', 1250, 1250, 'Top Performer Weekly Consistency Bonus', NULL, NULL, NULL, '2026-11-07 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (6, 'TXN-2026-90006', 5, 'withdrawal_reservation', 'available_commission', 'debit', 1500, 6699.3, 'Withdrawal Request Reserved (WDR-2026-50002)', NULL, NULL, NULL, '2026-11-09 11:03:47');
INSERT IGNORE INTO `wallet_transactions` (`id`, `reference_id`, `user_id`, `tx_type`, `bucket`, `direction`, `amount_inr`, `balance_after_inr`, `description`, `related_payment_id`, `related_withdrawal_id`, `created_by_admin_id`, `created_at`) VALUES (7, 'TXN-2026-90007', 5, 'commission_credit', 'available_commission', 'credit', 7000, 13699.3, '70% Direct Referral Commission — Kavya Sharma (Elite Executive Summit)', 4, NULL, NULL, '2026-11-10 11:03:47');

-- Seed: bonus_transactions (1 rows)
INSERT IGNORE INTO `bonus_transactions` (`id`, `reference_id`, `user_id`, `amount_inr`, `reason`, `credited_by_admin_id`, `created_at`) VALUES (1, 'BON-2026-30001', 5, 1250, 'Top Performer Weekly Consistency Bonus', 2, '2026-11-07 11:03:47');

-- Seed: withdrawals (3 rows)
INSERT IGNORE INTO `withdrawals` (`id`, `request_ref`, `user_id`, `amount_inr`, `payout_method`, `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `upi_id`, `status`, `rejection_reason`, `admin_notes`, `payment_reference`, `business_date_ist`, `reviewed_by_admin_id`, `reviewed_at`, `paid_at`, `created_at`) VALUES (1, 'WDR-2026-50001', 5, 3000, 'bank_transfer', 'Aarav Mehta', 'HDFC Bank', '50100482910422', 'HDFC0001204', NULL, 'paid', NULL, NULL, 'HDFC20268839201', '2026-11-02', 2, '2026-11-03 11:03:47', '2026-11-03 11:03:47', '2026-11-02 11:03:47');
INSERT IGNORE INTO `withdrawals` (`id`, `request_ref`, `user_id`, `amount_inr`, `payout_method`, `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `upi_id`, `status`, `rejection_reason`, `admin_notes`, `payment_reference`, `business_date_ist`, `reviewed_by_admin_id`, `reviewed_at`, `paid_at`, `created_at`) VALUES (2, 'WDR-2026-50000', 5, 800, 'upi', 'Aarav Mehta', NULL, NULL, NULL, 'aarav.old@okaxis', 'rejected', 'UPI handle returned inactive VPA during penny-drop check. Reserved funds released to Available Balance.', 'Released ₹800 reservation back to available_commission', NULL, '2026-10-30', 2, '2026-10-31 11:03:47', NULL, '2026-10-31 11:03:47');
INSERT IGNORE INTO `withdrawals` (`id`, `request_ref`, `user_id`, `amount_inr`, `payout_method`, `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `upi_id`, `status`, `rejection_reason`, `admin_notes`, `payment_reference`, `business_date_ist`, `reviewed_by_admin_id`, `reviewed_at`, `paid_at`, `created_at`) VALUES (3, 'WDR-2026-50002', 5, 1500, 'upi', 'Aarav Mehta', NULL, NULL, NULL, 'aarav.mehta@okhdfcbank', 'pending', NULL, NULL, NULL, '2026-11-09', NULL, NULL, NULL, '2026-11-09 11:03:47');

-- Seed: withdrawal_payment_records (1 rows)
INSERT IGNORE INTO `withdrawal_payment_records` (`id`, `withdrawal_id`, `utr_or_reference`, `payout_channel`, `amount_inr`, `processed_by_admin_id`, `processed_at`) VALUES (1, 1, 'HDFC20268839201', 'IMPS Bank Settlement', 3000, 2, '2026-11-03 11:03:47');

-- Seed: kyc_submissions (2 rows)
INSERT IGNORE INTO `kyc_submissions` (`id`, `user_id`, `aadhaar_number_masked`, `bank_name`, `account_holder_name`, `account_number`, `ifsc_code`, `upi_id`, `state`, `district`, `gender`, `status`, `rejection_reason`, `reviewed_by_admin_id`, `reviewed_at`, `submitted_at`) VALUES (1, 5, 'XXXX-XXXX-4829', 'HDFC Bank', 'Aarav Mehta', '50100482910422', 'HDFC0001204', 'aarav.mehta@okhdfcbank', 'Karnataka', 'Bengaluru Urban', 'Male', 'approved', NULL, 3, '2026-10-26 11:03:47', '2026-10-25 11:03:47');
INSERT IGNORE INTO `kyc_submissions` (`id`, `user_id`, `aadhaar_number_masked`, `bank_name`, `account_holder_name`, `account_number`, `ifsc_code`, `upi_id`, `state`, `district`, `gender`, `status`, `rejection_reason`, `reviewed_by_admin_id`, `reviewed_at`, `submitted_at`) VALUES (2, 7, 'XXXX-XXXX-9104', 'ICICI Bank', 'Rohan Kapoor', '004101582910', 'ICIC0000041', 'rohan.kapoor@okicici', 'Delhi', 'New Delhi', 'Male', 'pending_review', NULL, NULL, NULL, '2026-11-08 11:03:47');

-- Seed: kyc_review_history (1 rows)
INSERT IGNORE INTO `kyc_review_history` (`id`, `kyc_submission_id`, `user_id`, `previous_status`, `new_status`, `reason`, `reviewed_by_admin_id`, `created_at`) VALUES (1, 1, 5, 'pending_review', 'approved', 'Aadhaar document and IFSC details verified against bank mandate.', 3, '2026-10-26 11:03:47');

-- Seed: website_pages (1 rows)
INSERT IGNORE INTO `website_pages` (`id`, `slug`, `title`, `meta_description`, `status`, `published_version`, `updated_at`) VALUES (1, 'home', 'LearnUp India (learnupindia.com) — E-Learning & 70% Direct Partner Platform', 'Master digital systems, quantitative market literacy, and AI automation with verifiable certificates and 70% direct affiliate commissions on learnupindia.com.', 'published', 1, '2026-11-10 11:03:47');

-- Seed: website_sections (10 rows)
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (1, 1, 'hero', 'hero_3d', 'Hero Banner & Interactive 3D Monolith', 'Executive headline, 3D visual object, and primary conversion CTAs', '{}', '{}', 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (2, 1, 'about', 'about_split', 'About LearnUp India — Mission, Vision & Architecture', 'Platform overview, institutional standards, and mission statement', '{}', '{}', 1, 2, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (3, 1, 'packages', 'packages_grid', 'Learning Packages & Curriculum Tiers', 'Dynamic packages grid (registration-first flow without direct Buy Now buttons)', '{}', '{}', 1, 3, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (4, 1, 'benefits', 'benefits_grid', 'Platform Benefits & Partner Economics', 'Highlights 70/30 gross commission split, permanent attribution, and verified LMS', '{}', '{}', 1, 4, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (5, 1, 'how_it_works', 'steps_flow', 'How It Works — Registration to Payout', '4-step walkthrough of registration, Razorpay verification, learning, and withdrawals', '{}', '{}', 1, 5, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (6, 1, 'courses', 'featured_courses', 'Featured Executive Courses', 'Preview of courses, modules, quizzes, and verifiable certificates', '{}', '{}', 1, 6, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (7, 1, 'offers', 'offers_countdown', 'Active Cohort Offers & Promotional Batches', 'Dynamic 16:9 promotional banners with live countdown timers', '{}', '{}', 1, 7, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (8, 1, 'testimonials', 'testimonials_grid', 'Graduate & Partner Testimonials', 'Verified student reviews and partner earnings stories', '{}', '{}', 1, 8, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (9, 1, 'faq', 'faq_accordion', 'Frequently Asked Questions', 'Clear answers on attribution, 70% gross commissions, KYC, and No-Refund policy', '{}', '{}', 1, 9, '2026-11-10 11:03:47');
INSERT IGNORE INTO `website_sections` (`id`, `page_id`, `section_key`, `section_type`, `title`, `subtitle`, `content_json`, `draft_content_json`, `is_visible`, `display_order`, `updated_at`) VALUES (10, 1, 'contact', 'contact_section', 'Contact & Executive Concierge (team@learnupindia.com)', 'Corporate headquarters, support desk hours, and direct inquiry channel', '{}', '{}', 1, 10, '2026-11-10 11:03:47');

-- Seed: website_content (1 rows)
INSERT IGNORE INTO `website_content` (`key`, `published_json`, `draft_json`, `has_unpublished_changes`, `updated_by_admin_id`, `updated_at`) VALUES ('main_site', '{"companyName":"LEARNUP INDIA (learnupindia.com)","logoText":"LEARNUP INDIA","logoSubtext":"LEARNUPINDIA.COM · EXECUTIVE E-LEARNING & AFFILIATE PLATFORM","faviconUrl":"/vite.svg","theme":{"primaryColor":"#10b981","accentColor":"#d97706","surfaceColor":"#0c1110","fontHeading":"Fraunces","fontBody":"Plus Jakarta Sans"},"headerNav":[{"label":"Home","href":"#hero"},{"label":"About Us","href":"#about"},{"label":"Plans / Packages","href":"#packages"},{"label":"Courses","href":"#courses"},{"label":"Offers","href":"#offers"},{"label":"FAQ","href":"#faq"},{"label":"Contact Us","href":"#contact"}],"hero":{"eyebrow":"LEARNUPINDIA.COM · DIGITAL EDUCATION & PARTNER ECOSYSTEM","headline":"Master High-Value Digital Systems. Earn 70% Direct Partner Commissions.","description":"LearnUp India (learnupindia.com) combines rigorous, certificate-backed executive courses in affiliate architecture, quantitative risk management, and AI automation with an auditable, instant-credit 70% direct referral commission ledger.","primaryCtaText":"Begin Registration & Select Package","primaryCtaLink":"/register","secondaryCtaText":"Explore Curriculum","secondaryCtaLink":"#packages","visual3dPreset":"emerald_monolith","heroImageUrl":"/assets/media/pkg_elite.jpg","stats":[{"label":"Direct Referrer Share","value":"70% Gross"},{"label":"Commission Settlement","value":"Instant Ledger Credit"},{"label":"Curriculum Access","value":"Lifetime Streaming"}]},"about":{"title":"Engineered for Verifiable Skill Mastery & Transparent Partner Economics","description":"Unlike passive video libraries, LearnUp India enforces 100% verified watch completion, graded assessments, and faculty-reviewed assignments before issuing verifiable credentials—while rewarding our student partners with 70% of gross package revenue on every direct referral.","mission":"To democratize executive-grade digital business, quantitative market literacy, and AI systems education across India through learnupindia.com with uncompromising transparency.","vision":"Building India’s most trusted skill-to-income learning infrastructure with bank-grade ledger integrity.","imageUrl":"/assets/media/pkg_pro.jpg"},"benefits":[{"title":"70% Gross Selling Price Commission","description":"Calculated on 100% of the package gross price with zero gateway fee deductions from your partner share."},{"title":"Permanent Attribution Locking","description":"Your unique 6-character referral code (e.g. AB1234) never expires and locks permanently when a learner registers."},{"title":"100% Verified Video LMS & Certificates","description":"Server-verified watch segments, graded quizzes, and capstone assignments unlock downloadable, verifiable PDF certificates."},{"title":"Fast Bank & UPI Withdrawals","description":"Withdraw starting from ₹500 via IMPS/NEFT Bank Transfer or UPI with up to 2 requests per day after KYC approval."}],"howItWorks":[{"step":"01","title":"Register & Lock Sponsor","description":"Complete registration with your chosen learning package and optional referral code."},{"step":"02","title":"Verify Payment via Razorpay","description":"Complete checkout securely. Our backend verifies cryptographic signatures before activating access."},{"step":"03","title":"Complete Courses & Certify","description":"Watch HD streaming lessons to 100%, pass quizzes, and receive course certificates."},{"step":"04","title":"Refer & Withdraw Earnings","description":"Share your permanent referral link to earn 70% commissions and withdraw to Bank or UPI."}],"testimonials":[{"name":"Aarav Mehta","role":"Elite Summit Member · Bengaluru","quote":"The 70% gross commission is credited to the ledger the exact second Razorpay verifies a referral purchase. LearnUp India’s curriculum quality is unmatched.","earnings":"₹18,199 Earned"},{"name":"Priya Nair","role":"Executive Member · Kochi","quote":"I love that certificates require 100% verified watching and real assignment review. It makes a LearnUp India certificate genuinely respected.","earnings":"Verified Graduate"},{"name":"Rohan Kapoor","role":"Pro Accelerator Member · New Delhi","quote":"The quantitative risk management module completely transformed how I calculate position sizing and drawdown limits.","earnings":"₹8,398 Earned"}],"faq":[{"q":"Why is there no direct \\"Buy Now\\" button on public package cards?","a":"To protect referral attribution integrity and ensure every learner has a verified account and locked sponsor record before payment, all package purchases happen seamlessly through the Registration & Checkout flow on learnupindia.com."},{"q":"How is the 70% affiliate commission calculated?","a":"The referring user receives 70% of the gross package selling price, and the company retains 30%. Payment gateway fees are never deducted from the referrer calculation base."},{"q":"What are the withdrawal rules and limits?","a":"The minimum withdrawal is ₹500 with no fixed maximum limit (up to your Available Commission balance). Approved KYC is required, and users may submit up to 2 withdrawal requests per day (Asia/Kolkata timezone)."},{"q":"What is the platform refund policy?","a":"All package payments are final and non-refundable as stated during checkout and in our Legal Terms. Duplicate charges or unauthorized transactions are handled in accordance with applicable law and Razorpay dispute procedures."}],"contact":{"email":"team@learnupindia.com","phone":"+91 (022) 6890-4200","address":"LearnUp India HQ — Level 14, One BKC Tower C, Bandra Kurla Complex, Mumbai, Maharashtra 400051","supportHours":"Monday – Saturday, 09:30 AM to 07:30 PM IST"},"legal":{"noRefundPolicy":"All learning package purchases on LearnUp India (learnupindia.com) are strictly non-refundable once payment is verified and digital curriculum access is provisioned. By completing checkout, you acknowledge immediate digital delivery and waive discretionary refund requests. Statutory consumer remedies for duplicate debits or unauthorized transactions remain protected under applicable Indian law.","termsAndConditions":"Users must provide accurate registration details, complete KYC verification prior to requesting withdrawals, and adhere to ethical marketing guidelines. Referral attribution is captured at registration and permanently locked. Multi-level commissions are not offered; only direct verified referrals earn the 70% gross commission.","privacyPolicy":"Personal identity documents uploaded for KYC verification are stored in access-controlled private storage and are never publicly accessible. Referral reports mask sensitive personal contact details to protect learner privacy."}}', '{"companyName":"LEARNUP INDIA (learnupindia.com)","logoText":"LEARNUP INDIA","logoSubtext":"LEARNUPINDIA.COM · EXECUTIVE E-LEARNING & AFFILIATE PLATFORM","faviconUrl":"/vite.svg","theme":{"primaryColor":"#10b981","accentColor":"#d97706","surfaceColor":"#0c1110","fontHeading":"Fraunces","fontBody":"Plus Jakarta Sans"},"headerNav":[{"label":"Home","href":"#hero"},{"label":"About Us","href":"#about"},{"label":"Plans / Packages","href":"#packages"},{"label":"Courses","href":"#courses"},{"label":"Offers","href":"#offers"},{"label":"FAQ","href":"#faq"},{"label":"Contact Us","href":"#contact"}],"hero":{"eyebrow":"LEARNUPINDIA.COM · DIGITAL EDUCATION & PARTNER ECOSYSTEM","headline":"Master High-Value Digital Systems. Earn 70% Direct Partner Commissions.","description":"LearnUp India (learnupindia.com) combines rigorous, certificate-backed executive courses in affiliate architecture, quantitative risk management, and AI automation with an auditable, instant-credit 70% direct referral commission ledger.","primaryCtaText":"Begin Registration & Select Package","primaryCtaLink":"/register","secondaryCtaText":"Explore Curriculum","secondaryCtaLink":"#packages","visual3dPreset":"emerald_monolith","heroImageUrl":"/assets/media/pkg_elite.jpg","stats":[{"label":"Direct Referrer Share","value":"70% Gross"},{"label":"Commission Settlement","value":"Instant Ledger Credit"},{"label":"Curriculum Access","value":"Lifetime Streaming"}]},"about":{"title":"Engineered for Verifiable Skill Mastery & Transparent Partner Economics","description":"Unlike passive video libraries, LearnUp India enforces 100% verified watch completion, graded assessments, and faculty-reviewed assignments before issuing verifiable credentials—while rewarding our student partners with 70% of gross package revenue on every direct referral.","mission":"To democratize executive-grade digital business, quantitative market literacy, and AI systems education across India through learnupindia.com with uncompromising transparency.","vision":"Building India’s most trusted skill-to-income learning infrastructure with bank-grade ledger integrity.","imageUrl":"/assets/media/pkg_pro.jpg"},"benefits":[{"title":"70% Gross Selling Price Commission","description":"Calculated on 100% of the package gross price with zero gateway fee deductions from your partner share."},{"title":"Permanent Attribution Locking","description":"Your unique 6-character referral code (e.g. AB1234) never expires and locks permanently when a learner registers."},{"title":"100% Verified Video LMS & Certificates","description":"Server-verified watch segments, graded quizzes, and capstone assignments unlock downloadable, verifiable PDF certificates."},{"title":"Fast Bank & UPI Withdrawals","description":"Withdraw starting from ₹500 via IMPS/NEFT Bank Transfer or UPI with up to 2 requests per day after KYC approval."}],"howItWorks":[{"step":"01","title":"Register & Lock Sponsor","description":"Complete registration with your chosen learning package and optional referral code."},{"step":"02","title":"Verify Payment via Razorpay","description":"Complete checkout securely. Our backend verifies cryptographic signatures before activating access."},{"step":"03","title":"Complete Courses & Certify","description":"Watch HD streaming lessons to 100%, pass quizzes, and receive course certificates."},{"step":"04","title":"Refer & Withdraw Earnings","description":"Share your permanent referral link to earn 70% commissions and withdraw to Bank or UPI."}],"testimonials":[{"name":"Aarav Mehta","role":"Elite Summit Member · Bengaluru","quote":"The 70% gross commission is credited to the ledger the exact second Razorpay verifies a referral purchase. LearnUp India’s curriculum quality is unmatched.","earnings":"₹18,199 Earned"},{"name":"Priya Nair","role":"Executive Member · Kochi","quote":"I love that certificates require 100% verified watching and real assignment review. It makes a LearnUp India certificate genuinely respected.","earnings":"Verified Graduate"},{"name":"Rohan Kapoor","role":"Pro Accelerator Member · New Delhi","quote":"The quantitative risk management module completely transformed how I calculate position sizing and drawdown limits.","earnings":"₹8,398 Earned"}],"faq":[{"q":"Why is there no direct \\"Buy Now\\" button on public package cards?","a":"To protect referral attribution integrity and ensure every learner has a verified account and locked sponsor record before payment, all package purchases happen seamlessly through the Registration & Checkout flow on learnupindia.com."},{"q":"How is the 70% affiliate commission calculated?","a":"The referring user receives 70% of the gross package selling price, and the company retains 30%. Payment gateway fees are never deducted from the referrer calculation base."},{"q":"What are the withdrawal rules and limits?","a":"The minimum withdrawal is ₹500 with no fixed maximum limit (up to your Available Commission balance). Approved KYC is required, and users may submit up to 2 withdrawal requests per day (Asia/Kolkata timezone)."},{"q":"What is the platform refund policy?","a":"All package payments are final and non-refundable as stated during checkout and in our Legal Terms. Duplicate charges or unauthorized transactions are handled in accordance with applicable law and Razorpay dispute procedures."}],"contact":{"email":"team@learnupindia.com","phone":"+91 (022) 6890-4200","address":"LearnUp India HQ — Level 14, One BKC Tower C, Bandra Kurla Complex, Mumbai, Maharashtra 400051","supportHours":"Monday – Saturday, 09:30 AM to 07:30 PM IST"},"legal":{"noRefundPolicy":"All learning package purchases on LearnUp India (learnupindia.com) are strictly non-refundable once payment is verified and digital curriculum access is provisioned. By completing checkout, you acknowledge immediate digital delivery and waive discretionary refund requests. Statutory consumer remedies for duplicate debits or unauthorized transactions remain protected under applicable Indian law.","termsAndConditions":"Users must provide accurate registration details, complete KYC verification prior to requesting withdrawals, and adhere to ethical marketing guidelines. Referral attribution is captured at registration and permanently locked. Multi-level commissions are not offered; only direct verified referrals earn the 70% gross commission.","privacyPolicy":"Personal identity documents uploaded for KYC verification are stored in access-controlled private storage and are never publicly accessible. Referral reports mask sensitive personal contact details to protect learner privacy."}}', 0, NULL, '2026-11-10 11:03:47');

-- Seed: media_assets (7 rows)
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (1, 'Foundation Mastery Package Cover', 'packages', '/assets/media/pkg_starter.jpg', 'image/jpeg', 636928, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (2, 'Pro Accelerator Package Cover', 'packages', '/assets/media/pkg_pro.jpg', 'image/jpeg', 670720, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (3, 'Elite Executive Summit Cover', 'packages', '/assets/media/pkg_elite.jpg', 'image/jpeg', 674816, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (4, 'VIP Batch 16:9 Promotional Banner', 'banners', '/assets/media/offer_vip_banner.jpg', 'image/jpeg', 583680, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (5, 'Affiliate Systems Course Thumbnail', 'courses', '/assets/media/course_affiliate.jpg', 'image/jpeg', 593920, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (6, 'Quantitative Trading Course Thumbnail', 'courses', '/assets/media/course_trading.jpg', 'image/jpeg', 656384, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `media_assets` (`id`, `title`, `category`, `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by_admin_id`, `created_at`) VALUES (7, 'AI Growth & Scaling Course Thumbnail', 'courses', '/assets/media/course_growth.jpg', 'image/jpeg', 750592, 1, '2026-11-10 11:03:47');

-- Seed: page_versions (1 rows)
INSERT IGNORE INTO `page_versions` (`id`, `page_slug`, `version_number`, `snapshot_json`, `note`, `created_by_admin_id`, `created_at`) VALUES (1, 'home', 1, '{"companyName":"LEARNUP INDIA (learnupindia.com)","logoText":"LEARNUP INDIA","logoSubtext":"LEARNUPINDIA.COM · EXECUTIVE E-LEARNING & AFFILIATE PLATFORM","faviconUrl":"/vite.svg","theme":{"primaryColor":"#10b981","accentColor":"#d97706","surfaceColor":"#0c1110","fontHeading":"Fraunces","fontBody":"Plus Jakarta Sans"},"headerNav":[{"label":"Home","href":"#hero"},{"label":"About Us","href":"#about"},{"label":"Plans / Packages","href":"#packages"},{"label":"Courses","href":"#courses"},{"label":"Offers","href":"#offers"},{"label":"FAQ","href":"#faq"},{"label":"Contact Us","href":"#contact"}],"hero":{"eyebrow":"LEARNUPINDIA.COM · DIGITAL EDUCATION & PARTNER ECOSYSTEM","headline":"Master High-Value Digital Systems. Earn 70% Direct Partner Commissions.","description":"LearnUp India (learnupindia.com) combines rigorous, certificate-backed executive courses in affiliate architecture, quantitative risk management, and AI automation with an auditable, instant-credit 70% direct referral commission ledger.","primaryCtaText":"Begin Registration & Select Package","primaryCtaLink":"/register","secondaryCtaText":"Explore Curriculum","secondaryCtaLink":"#packages","visual3dPreset":"emerald_monolith","heroImageUrl":"/assets/media/pkg_elite.jpg","stats":[{"label":"Direct Referrer Share","value":"70% Gross"},{"label":"Commission Settlement","value":"Instant Ledger Credit"},{"label":"Curriculum Access","value":"Lifetime Streaming"}]},"about":{"title":"Engineered for Verifiable Skill Mastery & Transparent Partner Economics","description":"Unlike passive video libraries, LearnUp India enforces 100% verified watch completion, graded assessments, and faculty-reviewed assignments before issuing verifiable credentials—while rewarding our student partners with 70% of gross package revenue on every direct referral.","mission":"To democratize executive-grade digital business, quantitative market literacy, and AI systems education across India through learnupindia.com with uncompromising transparency.","vision":"Building India’s most trusted skill-to-income learning infrastructure with bank-grade ledger integrity.","imageUrl":"/assets/media/pkg_pro.jpg"},"benefits":[{"title":"70% Gross Selling Price Commission","description":"Calculated on 100% of the package gross price with zero gateway fee deductions from your partner share."},{"title":"Permanent Attribution Locking","description":"Your unique 6-character referral code (e.g. AB1234) never expires and locks permanently when a learner registers."},{"title":"100% Verified Video LMS & Certificates","description":"Server-verified watch segments, graded quizzes, and capstone assignments unlock downloadable, verifiable PDF certificates."},{"title":"Fast Bank & UPI Withdrawals","description":"Withdraw starting from ₹500 via IMPS/NEFT Bank Transfer or UPI with up to 2 requests per day after KYC approval."}],"howItWorks":[{"step":"01","title":"Register & Lock Sponsor","description":"Complete registration with your chosen learning package and optional referral code."},{"step":"02","title":"Verify Payment via Razorpay","description":"Complete checkout securely. Our backend verifies cryptographic signatures before activating access."},{"step":"03","title":"Complete Courses & Certify","description":"Watch HD streaming lessons to 100%, pass quizzes, and receive course certificates."},{"step":"04","title":"Refer & Withdraw Earnings","description":"Share your permanent referral link to earn 70% commissions and withdraw to Bank or UPI."}],"testimonials":[{"name":"Aarav Mehta","role":"Elite Summit Member · Bengaluru","quote":"The 70% gross commission is credited to the ledger the exact second Razorpay verifies a referral purchase. LearnUp India’s curriculum quality is unmatched.","earnings":"₹18,199 Earned"},{"name":"Priya Nair","role":"Executive Member · Kochi","quote":"I love that certificates require 100% verified watching and real assignment review. It makes a LearnUp India certificate genuinely respected.","earnings":"Verified Graduate"},{"name":"Rohan Kapoor","role":"Pro Accelerator Member · New Delhi","quote":"The quantitative risk management module completely transformed how I calculate position sizing and drawdown limits.","earnings":"₹8,398 Earned"}],"faq":[{"q":"Why is there no direct \\"Buy Now\\" button on public package cards?","a":"To protect referral attribution integrity and ensure every learner has a verified account and locked sponsor record before payment, all package purchases happen seamlessly through the Registration & Checkout flow on learnupindia.com."},{"q":"How is the 70% affiliate commission calculated?","a":"The referring user receives 70% of the gross package selling price, and the company retains 30%. Payment gateway fees are never deducted from the referrer calculation base."},{"q":"What are the withdrawal rules and limits?","a":"The minimum withdrawal is ₹500 with no fixed maximum limit (up to your Available Commission balance). Approved KYC is required, and users may submit up to 2 withdrawal requests per day (Asia/Kolkata timezone)."},{"q":"What is the platform refund policy?","a":"All package payments are final and non-refundable as stated during checkout and in our Legal Terms. Duplicate charges or unauthorized transactions are handled in accordance with applicable law and Razorpay dispute procedures."}],"contact":{"email":"team@learnupindia.com","phone":"+91 (022) 6890-4200","address":"LearnUp India HQ — Level 14, One BKC Tower C, Bandra Kurla Complex, Mumbai, Maharashtra 400051","supportHours":"Monday – Saturday, 09:30 AM to 07:30 PM IST"},"legal":{"noRefundPolicy":"All learning package purchases on LearnUp India (learnupindia.com) are strictly non-refundable once payment is verified and digital curriculum access is provisioned. By completing checkout, you acknowledge immediate digital delivery and waive discretionary refund requests. Statutory consumer remedies for duplicate debits or unauthorized transactions remain protected under applicable Indian law.","termsAndConditions":"Users must provide accurate registration details, complete KYC verification prior to requesting withdrawals, and adhere to ethical marketing guidelines. Referral attribution is captured at registration and permanently locked. Multi-level commissions are not offered; only direct verified referrals earn the 70% gross commission.","privacyPolicy":"Personal identity documents uploaded for KYC verification are stored in access-controlled private storage and are never publicly accessible. Referral reports mask sensitive personal contact details to protect learner privacy."}}', 'Initial LearnUp India (learnupindia.com) production launch configuration', 1, '2026-11-10 11:03:47');

-- Seed: trading_videos (3 rows)
INSERT IGNORE INTO `trading_videos` (`id`, `title`, `category`, `description`, `thumbnail_url`, `video_asset_key`, `duration_seconds`, `display_order`, `is_published`, `created_at`) VALUES (1, 'Understanding Orderbook Liquidity & Bid-Ask Spreads', 'Market Microstructure', 'Educational breakdown of how limit orders and market orders interact across institutional liquidity pools.', '/assets/media/course_trading.jpg', 'trading_stream_1.mp4', 10, 1, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `trading_videos` (`id`, `title`, `category`, `description`, `thumbnail_url`, `video_asset_key`, `duration_seconds`, `display_order`, `is_published`, `created_at`) VALUES (2, 'Position Sizing & The 1% Capital Preservation Rule', 'Risk Management', 'Mathematical proof of why strict risk-per-trade boundaries prevent catastrophic portfolio drawdowns.', '/assets/media/pkg_starter.jpg', 'trading_stream_1.mp4', 10, 2, 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `trading_videos` (`id`, `title`, `category`, `description`, `thumbnail_url`, `video_asset_key`, `duration_seconds`, `display_order`, `is_published`, `created_at`) VALUES (3, 'Multi-Timeframe Trend Alignment & Structural Breaks', 'Price Action', 'How to read higher-timeframe market structure objectively without relying on lagging indicators.', '/assets/media/pkg_pro.jpg', 'trading_stream_1.mp4', 10, 3, 1, '2026-11-10 11:03:47');

-- Seed: social_links (5 rows)
INSERT IGNORE INTO `social_links` (`id`, `platform`, `label`, `url`, `icon_name`, `subscriber_count_label`, `is_active`, `display_order`) VALUES (1, 'YouTube', 'LearnUp India Official Channel', 'https://youtube.com/@learnupindia', 'Youtube', '142K Subscribers', 1, 1);
INSERT IGNORE INTO `social_links` (`id`, `platform`, `label`, `url`, `icon_name`, `subscriber_count_label`, `is_active`, `display_order`) VALUES (2, 'Telegram', 'LearnUp India Verified Broadcast Desk', 'https://t.me/learnupindia', 'Send', '84K Members', 1, 2);
INSERT IGNORE INTO `social_links` (`id`, `platform`, `label`, `url`, `icon_name`, `subscriber_count_label`, `is_active`, `display_order`) VALUES (3, 'Instagram', 'LearnUp India Insights (@learnupindia)', 'https://instagram.com/learnupindia', 'Instagram', '96K Followers', 1, 3);
INSERT IGNORE INTO `social_links` (`id`, `platform`, `label`, `url`, `icon_name`, `subscriber_count_label`, `is_active`, `display_order`) VALUES (4, 'X (Twitter)', 'LearnUp India Updates (@learnupindia)', 'https://x.com/learnupindia', 'Twitter', '51K Followers', 1, 4);
INSERT IGNORE INTO `social_links` (`id`, `platform`, `label`, `url`, `icon_name`, `subscriber_count_label`, `is_active`, `display_order`) VALUES (5, 'WhatsApp Channel', 'LearnUp India Direct Learner Alerts', 'https://whatsapp.com/channel/learnupindia', 'MessageCircle', '68K Subscribers', 1, 5);

-- Seed: offer_batches (2 rows)
INSERT IGNORE INTO `offer_batches` (`id`, `name`, `batch_type`, `description`, `start_at`, `end_at`, `is_active`, `created_at`) VALUES (1, 'Executive Cohort — Q4 VIP Batch', 'VIP Batch', 'Priority mentorship sessions and live funnel teardown workshops for Elite Summit members.', '2026-10-31T11:03:47.904Z', '2026-11-17T11:03:47.904Z', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `offer_batches` (`id`, `name`, `batch_type`, `description`, `start_at`, `end_at`, `is_active`, `created_at`) VALUES (2, 'Accelerator Fast-Track Batch', 'Premium Batch', 'Dedicated weekly implementation sprints for Pro Accelerator learners.', '2026-10-31T11:03:47.904Z', '2026-11-24T11:03:47.904Z', 1, '2026-11-10 11:03:47');

-- Seed: offers (2 rows)
INSERT IGNORE INTO `offers` (`id`, `batch_id`, `title`, `description`, `banner_url`, `destination_link`, `promo_badge`, `start_at`, `end_at`, `is_active`, `created_at`) VALUES (1, 1, 'Q4 Executive VIP Cohort Enrollment Window', 'Enroll in the Elite Executive Summit Package before the timer expires to unlock live weekly architecture reviews with our faculty.', '/assets/media/offer_vip_banner.jpg', '/register', 'VIP BATCH LIVE', '2026-10-31T11:03:47.904Z', '2026-11-17T11:03:47.904Z', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `offers` (`id`, `batch_id`, `title`, `description`, `banner_url`, `destination_link`, `promo_badge`, `start_at`, `end_at`, `is_active`, `created_at`) VALUES (2, 2, 'Pro Accelerator Implementation Sprint', 'Join the upcoming 14-day guided funnel implementation workshop included with all Pro Accelerator enrollments.', '/assets/media/course_affiliate.jpg', '/register', 'LIMITED SEATS', '2026-10-31T11:03:47.904Z', '2026-11-24T11:03:47.904Z', 1, '2026-11-10 11:03:47');

-- Seed: notifications (3 rows)
INSERT IGNORE INTO `notifications` (`id`, `user_id`, `title`, `message`, `action_link`, `is_read`, `created_at`) VALUES (1, 5, '₹7,000.00 Affiliate Commission Credited', 'Kavya Sharma completed enrollment in Elite Executive Summit Package. 70% gross commission credited to Available Balance.', '/dashboard?tab=affiliate', 0, '2026-11-10 11:03:47');
INSERT IGNORE INTO `notifications` (`id`, `user_id`, `title`, `message`, `action_link`, `is_read`, `created_at`) VALUES (2, 5, 'Course Certificate Issued (CERT-2026-884920)', 'Your official certificate for High-Conversion Affiliate Systems & Funnel Architecture is ready for PDF download.', '/dashboard?tab=courses', 0, '2026-10-31 11:03:47');
INSERT IGNORE INTO `notifications` (`id`, `user_id`, `title`, `message`, `action_link`, `is_read`, `created_at`) VALUES (3, 5, 'Bonus Credited: ₹1,250.00', 'Finance Admin credited ₹1,250.00 Top Performer Weekly Consistency Bonus to your Bonus Wallet.', '/dashboard?tab=withdrawal', 1, '2026-11-07 11:03:47');

-- Seed: email_templates (13 rows)
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (1, 'welcome_email', 'Welcome Email', 'Welcome to LearnUp India (learnupindia.com) — Your Portal is Live', '<p>Welcome {{name}}, your LearnUp India account and unique affiliate code <strong>{{affiliate_code}}</strong> are active.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (2, 'registration_confirmation', 'Registration Confirmation', 'Account Registration Confirmed — LearnUp India', '<p>Hi {{name}}, your registration on learnupindia.com is confirmed. Your locked sponsor code: {{referred_by}}.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (3, 'payment_confirmation', 'Payment Confirmation', 'Receipt & Package Activation: {{package_name}} ({{order_number}})', '<p>Thank you {{name}}. Your payment of ₹{{amount}} is verified and lifetime course access is unlocked on learnupindia.com.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (4, 'commission_credit', 'Commission Credit Notification', '70% Direct Referral Commission Credited: ₹{{amount}}', '<p>Congratulations {{name}}! ₹{{amount}} (70% gross package price) has been credited to your Available Commission balance on LearnUp India.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (5, 'withdrawal_request', 'Withdrawal Request Confirmation', 'Withdrawal Request Received ({{request_ref}})', '<p>Hi {{name}}, your withdrawal request for ₹{{amount}} via {{method}} has been reserved and queued for review.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (6, 'withdrawal_approved', 'Withdrawal Approval Notification', 'Withdrawal Processed & Settled ({{request_ref}})', '<p>Hi {{name}}, your withdrawal of ₹{{amount}} has been processed. Reference: {{utr}}.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (7, 'withdrawal_rejected', 'Withdrawal Rejection Notification', 'Update on Withdrawal Request ({{request_ref}})', '<p>Hi {{name}}, your withdrawal request of ₹{{amount}} could not be processed ({{reason}}). The full reserved amount has been released back to your Available Balance.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (8, 'kyc_submitted', 'KYC Submission Confirmation', 'KYC Verification Documents Received — LearnUp India', '<p>Hi {{name}}, your KYC submission is queued for compliance review.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (9, 'kyc_approved', 'KYC Approval Notification', 'KYC Approved — Withdrawals Unlocked on LearnUp India', '<p>Hi {{name}}, your KYC identity and payout details have been verified and approved.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (10, 'kyc_rejected', 'KYC Rejection Notification', 'Action Required: KYC Verification Update', '<p>Hi {{name}}, your KYC submission requires attention: {{reason}}. Please log in to resubmit.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (11, 'password_reset_otp', 'Password Reset OTP', 'Your LearnUp India Password Reset Verification Code: {{otp}}', '<p>Your single-use password reset OTP for learnupindia.com is <strong>{{otp}}</strong>. Valid for 10 minutes.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (12, 'course_completed', 'Course Completion Notification', 'Congratulations on Completing {{course_title}}!', '<p>Well done {{name}}! You have satisfied all compulsory video, quiz, and assignment requirements for {{course_title}}.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');
INSERT IGNORE INTO `email_templates` (`id`, `template_key`, `name`, `subject`, `body_html`, `sender_name`, `sender_email`, `updated_at`) VALUES (13, 'certificate_generated', 'Certificate Generated Notification', 'Official Certificate Issued: {{certificate_code}}', '<p>Hi {{name}}, your verifiable PDF certificate ({{certificate_code}}) for {{course_title}} is ready for download on learnupindia.com.</p>', 'LearnUp India Team', 'team@learnupindia.com', '2026-11-10 11:03:47');

-- Seed: email_logs (2 rows)
INSERT IGNORE INTO `email_logs` (`id`, `user_id`, `recipient_email`, `template_key`, `subject`, `body_preview`, `status`, `error_message`, `sent_at`) VALUES (1, 5, 'aarav.mehta@gmail.com', 'welcome_email', 'Welcome to LearnUp India (learnupindia.com) — Your Portal is Live', 'Welcome Aarav Mehta, your LearnUp India account and unique affiliate code AB1234 are active.', 'delivered', NULL, '2026-10-23 11:03:47');
INSERT IGNORE INTO `email_logs` (`id`, `user_id`, `recipient_email`, `template_key`, `subject`, `body_preview`, `status`, `error_message`, `sent_at`) VALUES (2, 5, 'aarav.mehta@gmail.com', 'commission_credit', '70% Direct Referral Commission Credited: ₹7,000', 'Congratulations Aarav Mehta! ₹7,000 (70% gross package price) has been credited to your Available Commission balance on LearnUp India.', 'delivered', NULL, '2026-11-10 11:03:47');

-- Seed: admin_activity_logs (3 rows)
INSERT IGNORE INTO `admin_activity_logs` (`id`, `admin_id`, `admin_role`, `action`, `affected_record`, `previous_value`, `new_value`, `ip_address`, `created_at`) VALUES (1, 1, 'Super Admin', 'INITIALIZE_PLATFORM', 'system_settings', NULL, 'LearnUp India (learnupindia.com) configured with Hostinger MySQL (u591469534_educ) & SMTP (team@learnupindia.com)', '127.0.0.1', '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_activity_logs` (`id`, `admin_id`, `admin_role`, `action`, `affected_record`, `previous_value`, `new_value`, `ip_address`, `created_at`) VALUES (2, 2, 'Finance Admin', 'CREDIT_BONUS', 'user:5 (Aarav Mehta)', '₹0.00', '₹1,250.00 (Top Performer Weekly Consistency Bonus)', '127.0.0.1', '2026-11-10 11:03:47');
INSERT IGNORE INTO `admin_activity_logs` (`id`, `admin_id`, `admin_role`, `action`, `affected_record`, `previous_value`, `new_value`, `ip_address`, `created_at`) VALUES (3, 3, 'KYC Admin', 'APPROVE_KYC', 'kyc_submission:1 (Aarav Mehta)', 'pending_review', 'approved', '127.0.0.1', '2026-11-10 11:03:47');

-- Seed: system_settings (6 rows)
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('business_timezone', '{"timezone":"Asia/Kolkata"}', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('withdrawal_rules', '{"minAmountInr":500,"maxRequestsPerDay":2,"requireApprovedKyc":true,"expectedProcessingHours":24}', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('leaderboard_config', '{"activePeriod":"weekly","isPublished":true,"minEligibleInr":500}', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('certificate_template', '{"companyName":"LearnUp India (learnupindia.com)","signatoryName":"Dr. Vikramaditya Sen","signatoryTitle":"Dean of Academic Standards","accentColor":"#10b981","goldColor":"#d97706"}', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('backup_retention', '{"autoSchedule":"daily","retentionDays":30,"encryption":"AES-256-GCM"}', 1, '2026-11-10 11:03:47');
INSERT IGNORE INTO `system_settings` (`key`, `value_json`, `updated_by_admin_id`, `updated_at`) VALUES ('hostinger_database', '{"dbName":"u591469534_educ","dbUser":"u591469534_educt","website":"learnupindia.com","smtpEmail":"team@learnupindia.com"}', 1, '2026-11-10 11:03:47');

SET FOREIGN_KEY_CHECKS = 1;
