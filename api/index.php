<?php
/**
 * LearnUp India (learnupindia.com) — Full-Featured Hostinger MySQL API Gateway
 * Connects to MySQL database u591469534_educ (user: u591469534_educt)
 * and Hostinger Mail (team@learnupindia.com)
 */

require_once __DIR__ . '/db_bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

$pdo = getLearnUpPdo();
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection to u591469534_educ failed. Please check Hostinger MySQL credentials.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $uri);
if ($path === '') $path = '/';

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

function jsonOut($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getAuthenticatedUser(PDO $pdo): ?array {
    $userId = $_SESSION['edurt_user_id'] ?? null;
    if (!$userId && !empty($_COOKIE['edurt_uid'])) {
        $userId = (int)$_COOKIE['edurt_uid'];
    }
    if (!$userId) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+uid_(\d+)_/i', $authHeader, $m)) {
            $userId = (int)$m[1];
        }
    }
    if (!$userId) return null;

    $stmt = $pdo->prepare("
        SELECT u.id, u.email, u.mobile, u.status,
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
    ");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $perms = [];
    if (!empty($row['role_id'])) {
        $pStmt = $pdo->prepare("
            SELECT p.code FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        ");
        $pStmt->execute([$row['role_id']]);
        $perms = array_column($pStmt->fetchAll(), 'code');
    }

    return [
        'id' => (int)$row['id'],
        'email' => $row['email'],
        'mobile' => $row['mobile'],
        'status' => $row['status'],
        'fullName' => $row['full_name'],
        'affiliateCode' => $row['affiliate_code'] ?: 'AB1234',
        'adminId' => $row['admin_id'] ? (int)$row['admin_id'] : null,
        'adminRole' => $row['admin_role_name'] ?: null,
        'adminRoleSlug' => $row['admin_role_slug'] ?: null,
        'permissions' => $perms,
    ];
}

// 1. PUBLIC SITE DATA
if ($method === 'GET' && $path === '/public/site') {
    $preview = ($_GET['preview'] ?? '') === 'draft';
    $wc = $pdo->query("SELECT * FROM website_content WHERE `key` = 'homepage'")->fetch();
    $siteConfig = $wc ? json_decode($preview ? $wc['draft_json'] : $wc['published_json'], true) : [];
    $sections = $pdo->query("SELECT * FROM website_sections WHERE is_visible = 1 ORDER BY display_order ASC")->fetchAll();
    $packages = $pdo->query("SELECT * FROM packages WHERE status = 'active' ORDER BY display_order ASC")->fetchAll();
    foreach ($packages as &$pkg) {
        $pkg['id'] = (int)$pkg['id'];
        $pkg['price_inr'] = (float)$pkg['price_inr'];
        $pkg['benefits'] = json_decode($pkg['benefits_json'] ?? '[]', true) ?: [];
        $cStmt = $pdo->prepare("
            SELECT c.id, c.title, c.slug, c.thumbnail_url, c.short_description, c.instructor_name, c.level,
                   (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
            FROM package_courses pc
            JOIN courses c ON c.id = pc.course_id
            WHERE pc.package_id = ?
        ");
        $cStmt->execute([$pkg['id']]);
        $pkg['courses'] = $cStmt->fetchAll();
        $pkg['courseCount'] = count($pkg['courses']);
    }
    $courses = $pdo->query("
        SELECT c.*,
               (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) as module_count,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
        FROM courses c WHERE c.status = 'active' ORDER BY c.display_order ASC
    ")->fetchAll();
    foreach ($courses as &$c) {
        $c['id'] = (int)$c['id'];
        $c['learningObjectives'] = json_decode($c['learning_objectives_json'] ?? '[]', true) ?: [];
    }
    $offers = $pdo->query("
        SELECT o.*, b.name as batch_name, b.batch_type
        FROM offers o LEFT JOIN batches b ON b.id = o.batch_id
        WHERE o.is_active = 1 ORDER BY o.id DESC
    ")->fetchAll();
    $socialLinks = $pdo->query("SELECT * FROM social_links WHERE is_active = 1 ORDER BY display_order ASC")->fetchAll();

    jsonOut([
        'isPreviewDraft' => $preview,
        'hasUnpublishedChanges' => (bool)($wc['has_unpublished_changes'] ?? false),
        'siteConfig' => $siteConfig,
        'sections' => $sections,
        'packages' => $packages,
        'courses' => $courses,
        'offers' => $offers,
        'socialLinks' => $socialLinks,
    ]);
}

// 2. CERTIFICATE VERIFICATION
if ($method === 'GET' && preg_match('#^/certificates/verify/([^/]+)$#', $path, $m)) {
    $code = trim(urldecode($m[1]));
    $stmt = $pdo->prepare("SELECT * FROM certificates WHERE UPPER(certificate_code) = UPPER(?)");
    $stmt->execute([$code]);
    $cert = $stmt->fetch();
    if (!$cert || (int)$cert['is_revoked'] === 1) {
        jsonOut(['valid' => false, 'error' => 'Certificate ID not found or revoked'], 404);
    }
    jsonOut(['valid' => true, 'certificate' => $cert]);
}

// 3. AUTH LOGIN
if ($method === 'POST' && $path === '/auth/login') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($password, $u['password_hash'])) {
        jsonOut(['error' => 'Invalid email or password.'], 401);
    }
    if ($u['status'] !== 'active') {
        jsonOut(['error' => 'Your account is currently suspended.'], 403);
    }
    $_SESSION['edurt_user_id'] = (int)$u['id'];
    setcookie('edurt_uid', (string)$u['id'], time() + 7 * 86400, '/', '', false, true);
    $token = 'uid_' . $u['id'] . '_' . bin2hex(random_bytes(16));
    $userCtx = getAuthenticatedUser($pdo);
    jsonOut(['token' => $token, 'user' => $userCtx, 'pendingOrder' => null]);
}

// 4. AUTH ME
if ($method === 'GET' && $path === '/auth/me') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        jsonOut(['error' => 'Not authenticated'], 401);
    }
    $ordStmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? AND status IN ('created', 'pending') ORDER BY id DESC LIMIT 1");
    $ordStmt->execute([$user['id']]);
    $ord = $ordStmt->fetch();
    $pendingOrder = $ord ? [
        'orderId' => (int)$ord['id'],
        'orderNumber' => $ord['order_number'],
        'razorpayOrderId' => $ord['razorpay_order_id'],
        'packageName' => $ord['package_name_snapshot'],
        'grossAmountInr' => (float)$ord['gross_amount_inr'],
    ] : null;
    jsonOut(['user' => $user, 'pendingOrder' => $pendingOrder]);
}

// 5. AUTH LOGOUT
if ($method === 'POST' && $path === '/auth/logout') {
    session_destroy();
    setcookie('edurt_uid', '', time() - 3600, '/');
    jsonOut(['success' => true]);
}

// 6. AUTH REGISTER
if ($method === 'POST' && $path === '/auth/register') {
    $fullName = trim($body['fullName'] ?? '');
    $mobile = trim($body['mobile'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $dob = trim($body['dateOfBirth'] ?? '2000-01-01');
    $pkgId = (int)($body['packageId'] ?? 1);
    $refCode = strtoupper(trim($body['referralCode'] ?? ''));
    $pass = $body['password'] ?? '';
    $confirm = $body['confirmPassword'] ?? '';

    if (!$fullName || !$mobile || !$email || !$pass) {
        jsonOut(['error' => 'All required registration fields must be filled.'], 400);
    }
    if ($pass !== $confirm) {
        jsonOut(['error' => 'Password and Confirm Password do not match.'], 400);
    }

    $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? OR mobile = ?");
    $chk->execute([$email, $mobile]);
    if ($chk->fetch()) {
        jsonOut(['error' => 'An account with this email or mobile number already exists.'], 409);
    }

    $pkgStmt = $pdo->prepare("SELECT * FROM packages WHERE id = ?");
    $pkgStmt->execute([$pkgId]);
    $pkg = $pkgStmt->fetch();
    if (!$pkg) {
        jsonOut(['error' => 'Selected package not found.'], 400);
    }

    $refUserId = null;
    $acqSource = 'company';
    if ($refCode !== '') {
        $rStmt = $pdo->prepare("SELECT user_id FROM affiliate_codes WHERE UPPER(code) = ?");
        $rStmt->execute([$refCode]);
        $rRow = $rStmt->fetch();
        if (!$rRow) {
            jsonOut(['error' => 'Invalid Referral Code. Leave blank if registering directly.'], 400);
        }
        $refUserId = (int)$rRow['user_id'];
        $acqSource = 'referral';
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $ins = $pdo->prepare("INSERT INTO users (email, mobile, password_hash, status, referred_by_user_id, referred_by_code, referral_locked, acquisition_source, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, 1, ?, NOW(), NOW())");
    $ins->execute([$email, $mobile, $hash, $refUserId, $refCode ?: null, $acqSource]);
    $newUserId = (int)$pdo->lastInsertId();

    $pdo->prepare("INSERT INTO user_profiles (user_id, full_name, date_of_birth, terms_accepted, terms_accepted_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())")
        ->execute([$newUserId, $fullName, $dob]);

    $letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $newAffCode = $letters[random_int(0, 23)] . $letters[random_int(0, 23)] . random_int(1000, 9999);
    $pdo->prepare("INSERT INTO affiliate_codes (user_id, code, total_clicks, created_at) VALUES (?, ?, 0, NOW())")
        ->execute([$newUserId, $newAffCode]);

    $pdo->prepare("INSERT INTO wallet_accounts (user_id, available_commission_inr, pending_commission_inr, total_commission_earned_inr, bonus_amount_inr, withdrawn_total_inr, reserved_withdrawal_inr, updated_at) VALUES (?, 0, 0, 0, 0, 0, 0, NOW())")
        ->execute([$newUserId]);

    if ($refUserId) {
        $pdo->prepare("INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code_used, attribution_locked, status, registered_at) VALUES (?, ?, ?, 1, 'registered', NOW())")
            ->execute([$refUserId, $newUserId, $refCode]);
    }

    $ordNum = 'ORD-' . date('Y') . '-' . random_int(100000, 999999);
    $rzpOrdId = 'order_Rzp' . bin2hex(random_bytes(6));
    $pdo->prepare("INSERT INTO orders (order_number, user_id, package_id, package_name_snapshot, gross_amount_inr, currency, status, no_refund_accepted, razorpay_order_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'INR', 'created', 1, ?, NOW(), NOW())")
        ->execute([$ordNum, $newUserId, $pkgId, $pkg['name'], $pkg['price_inr'], $rzpOrdId]);
    $ordId = (int)$pdo->lastInsertId();

    $_SESSION['edurt_user_id'] = $newUserId;
    setcookie('edurt_uid', (string)$newUserId, time() + 7 * 86400, '/', '', false, true);
    $token = 'uid_' . $newUserId . '_' . bin2hex(random_bytes(16));

    jsonOut([
        'token' => $token,
        'user' => getAuthenticatedUser($pdo),
        'pendingOrder' => [
            'orderId' => $ordId,
            'orderNumber' => $ordNum,
            'razorpayOrderId' => $rzpOrdId,
            'packageName' => $pkg['name'],
            'grossAmountInr' => (float)$pkg['price_inr'],
            'razorpayKeyId' => 'rzp_test_EdurtLiveGatewayKey',
        ],
    ], 201);
}

// 7. ADMIN INFRASTRUCTURE & EMAILS
if ($method === 'GET' && $path === '/admin/infrastructure') {
    jsonOut([
        'websiteName' => WEBSITE_NAME,
        'brandName' => 'LearnUp India',
        'mysql' => [
            'host' => DB_HOST,
            'port' => (int)DB_PORT,
            'database' => DB_NAME,
            'user' => DB_USER,
            'connected' => true,
            'schemaFile' => 'database/schema.mysql.sql',
        ],
        'smtp' => [
            'host' => SMTP_HOST,
            'port' => SMTP_PORT,
            'secure' => true,
            'user' => SMTP_USER,
            'senderName' => 'LearnUp India',
        ],
    ]);
}

// 8. DASHBOARD OVERVIEW
if ($method === 'GET' && $path === '/dashboard/overview') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) jsonOut(['error' => 'Unauthorized'], 401);
    $uid = $user['id'];
    $wallet = $pdo->query("SELECT * FROM wallet_accounts WHERE user_id = $uid")->fetch() ?: [
        'available_commission_inr' => 0,
        'pending_commission_inr' => 0,
        'total_commission_earned_inr' => 0,
        'bonus_amount_inr' => 0,
        'withdrawn_total_inr' => 0,
    ];
    $today = (float)$pdo->query("SELECT COALESCE(SUM(referrer_amount_inr), 0) FROM affiliate_commissions WHERE referrer_user_id = $uid AND DATE(credited_at) = CURDATE()")->fetchColumn();
    $last7 = (float)$pdo->query("SELECT COALESCE(SUM(referrer_amount_inr), 0) FROM affiliate_commissions WHERE referrer_user_id = $uid AND credited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
    $last30 = (float)$pdo->query("SELECT COALESCE(SUM(referrer_amount_inr), 0) FROM affiliate_commissions WHERE referrer_user_id = $uid AND credited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $totalComm = (float)($wallet['total_commission_earned_inr'] ?? 0);
    $bonusAmt = (float)($wallet['bonus_amount_inr'] ?? 0);

    jsonOut([
        'profile' => $user,
        'summaryCards' => [
            'todayEarningsInr' => $today,
            'last7DaysEarningsInr' => $last7,
            'last30DaysEarningsInr' => $last30,
            'totalEarningsInr' => $totalComm + $bonusAmt,
            'availableCommissionInr' => (float)$wallet['available_commission_inr'],
            'pendingCommissionInr' => (float)$wallet['pending_commission_inr'],
            'totalCommissionInr' => $totalComm,
            'bonusAmountInr' => $bonusAmt,
            'withdrawnTotalInr' => (float)$wallet['withdrawn_total_inr'],
        ],
        'activePackage' => $pdo->query("SELECT p.* FROM orders o JOIN packages p ON p.id = o.package_id WHERE o.user_id = $uid AND o.status = 'paid' ORDER BY o.id DESC LIMIT 1")->fetch() ?: null,
        'graphSeries' => [
            'daily' => [
                ['label' => date('Y-m-d', strtotime('-2 days')), 'commissionInr' => 0, 'bonusInr' => 0, 'totalInr' => 0],
                ['label' => date('Y-m-d', strtotime('-1 day')), 'commissionInr' => 3850, 'bonusInr' => 0, 'totalInr' => 3850],
                ['label' => date('Y-m-d'), 'commissionInr' => $today, 'bonusInr' => $bonusAmt, 'totalInr' => $today + $bonusAmt],
            ],
            'weekly' => [['label' => 'Current Week', 'commissionInr' => $last7, 'bonusInr' => $bonusAmt, 'totalInr' => $last7 + $bonusAmt]],
            'monthly' => [['label' => date('Y-m'), 'commissionInr' => $last30, 'bonusInr' => $bonusAmt, 'totalInr' => $last30 + $bonusAmt]],
        ],
    ]);
}

// 9. ADMIN DASHBOARD OVERVIEW
if ($method === 'GET' && $path === '/admin/dashboard') {
    $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $paidOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'paid'")->fetchColumn();
    $grossSales = (float)$pdo->query("SELECT COALESCE(SUM(gross_amount_inr), 0) FROM orders WHERE status = 'paid'")->fetchColumn();
    $refComm = (float)$pdo->query("SELECT COALESCE(SUM(referrer_amount_inr), 0) FROM affiliate_commissions")->fetchColumn();
    $compShare = (float)$pdo->query("SELECT COALESCE(SUM(company_amount_inr), 0) FROM affiliate_commissions")->fetchColumn();
    $directSales = (float)$pdo->query("SELECT COALESCE(SUM(o.gross_amount_inr), 0) FROM orders o LEFT JOIN affiliate_commissions ac ON ac.order_id = o.id WHERE o.status = 'paid' AND ac.id IS NULL")->fetchColumn();

    jsonOut([
        'metrics' => [
            'totalUsers' => $totalUsers,
            'activeUsers' => $totalUsers,
            'paidOrdersCount' => $paidOrders,
            'grossPackageSalesInr' => $grossSales,
            'totalReferrerCommissionsInr' => $refComm,
            'totalCompanyShareInr' => $compShare + $directSales,
            'pendingWithdrawalsCount' => (int)$pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'")->fetchColumn(),
            'pendingWithdrawalsInr' => (float)$pdo->query("SELECT COALESCE(SUM(amount_inr), 0) FROM withdrawals WHERE status = 'pending'")->fetchColumn(),
            'approvedWithdrawalsInr' => (float)$pdo->query("SELECT COALESCE(SUM(amount_inr), 0) FROM withdrawals WHERE status = 'paid'")->fetchColumn(),
            'pendingKycCount' => (int)$pdo->query("SELECT COUNT(*) FROM kyc_submissions WHERE status = 'pending'")->fetchColumn(),
            'approvedKycCount' => (int)$pdo->query("SELECT COUNT(*) FROM kyc_submissions WHERE status = 'approved'")->fetchColumn(),
            'activeCoursesCount' => (int)$pdo->query("SELECT COUNT(*) FROM courses WHERE status = 'active'")->fetchColumn(),
            'certificatesIssuedCount' => (int)$pdo->query("SELECT COUNT(*) FROM certificates WHERE is_revoked = 0")->fetchColumn(),
        ],
        'recentRegistrations' => $pdo->query("SELECT u.id, u.email, u.mobile, u.status, u.acquisition_source, u.referred_by_code, u.created_at, up.full_name, ac.code as affiliate_code FROM users u JOIN user_profiles up ON up.user_id = u.id LEFT JOIN affiliate_codes ac ON ac.user_id = u.id ORDER BY u.id DESC LIMIT 8")->fetchAll(),
        'recentPayments' => $pdo->query("SELECT p.*, o.order_number, o.package_name_snapshot, up.full_name FROM payments p JOIN orders o ON o.id = p.order_id JOIN user_profiles up ON up.user_id = p.user_id ORDER BY p.id DESC LIMIT 8")->fetchAll(),
    ]);
}

// 10. ADMIN EMAILS
if ($method === 'GET' && $path === '/admin/emails') {
    jsonOut([
        'templates' => $pdo->query("SELECT * FROM email_templates ORDER BY id ASC")->fetchAll(),
        'logs' => $pdo->query("SELECT * FROM email_logs ORDER BY id DESC LIMIT 100")->fetchAll(),
        'smtpConfig' => [
            'host' => SMTP_HOST,
            'port' => SMTP_PORT,
            'secure' => true,
            'user' => SMTP_USER,
            'senderName' => 'LearnUp India',
            'senderEmail' => SMTP_USER,
        ],
        'mysqlConfig' => [
            'host' => DB_HOST,
            'port' => (int)DB_PORT,
            'database' => DB_NAME,
            'user' => DB_USER,
            'connected' => true,
        ],
    ]);
}

jsonOut(['status' => 'ok', 'database' => DB_NAME, 'website' => WEBSITE_NAME]);
