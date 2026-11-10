# LearnUp India (`learnupindia.com`)
**Executive E-Learning & 70% Direct Partner Affiliate Marketing Platform**

Full-stack production web application implementing PRD v1.0 across:
1. **Public Website** — Editorial Three.js 3D hero, dynamic CMS sections, packages showcase (no direct public Buy Now button), featured courses, promotional batch countdown timers, and public certificate verification.
2. **User Dashboard (12 Modules)** — Earnings summary cards, interactive SVG earnings graph, My Account (non-deletable permanent accounts), Affiliate Dashboard (unique `AA1234` code & locked sponsor attribution), My Courses LMS (protected HTTP byte-range streaming video player with anti-skip 100% watch rule, quizzes, assignments, and auto-issued PDF certificates), Trading Education Hub, Withdrawals (₹500 min, max 2/day IST), KYC Verification, Leaderboard, Community Links, Offers, and Notifications.
3. **Master Admin Panel** — Complete CMS with Draft/Preview/Publish workflow, Media Manager, User/Affiliate/Commission/Wallet/Bonus/Withdrawal/KYC/Course/Certificate/Email/Report/RBAC & AES-256-GCM Encrypted Backup management.
4. **Backend API & Relational Database** — 43 relational tables in `database/schema.mysql.sql` (Hostinger MySQL 8.0 / MariaDB) and `database/schema.postgresql.sql`.

---

## Configured Hostinger Production Details

### Website Domain
- **Website Name**: `learnupindia.com` (`LearnUp India`)

### Hostinger MySQL Database
- **Database Name**: `u591469534_educ`
- **MySQL Username**: `u591469534_educt`
- **Schema File**: `database/schema.mysql.sql`
- **Connection Config**: `server/config.ts` & `server/mysql.ts`

### Hostinger Mail (SMTP)
- **Email**: `team@learnupindia.com`
- **SMTP Host**: `smtp.hostinger.com` (Port `465`, SSL/TLS)
- **Owner Super Admin Login**: `team@learnupindia.com` / `Owner@team4`

---

## Scripts

```bash
# Development server (Frontend + API middleware on port 3000)
npm run dev

# Build production frontend bundle
npm run build

# Start production server (serves dist/ + /api/*)
npm start

# Run automated PRD acceptance test suite
npm run test:acceptance
```
