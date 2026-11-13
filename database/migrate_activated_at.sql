-- LearnUp India (learnupindia.com)
-- Migration: Add `activated_at` column to `users` table for Hostinger MySQL (u591469534_educ)
-- Safe to run in phpMyAdmin or via MySQL command line.

ALTER TABLE `users` ADD COLUMN `activated_at` LONGTEXT NULL AFTER `status`;

-- Backfill activated_at timestamp for active users using their registration created_at date
UPDATE `users` SET `activated_at` = `created_at` WHERE `status` = 'active' AND (`activated_at` IS NULL OR `activated_at` = '');
