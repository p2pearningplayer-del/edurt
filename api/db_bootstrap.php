<?php
/**
 * LearnUp India (learnupindia.com) — Hostinger MySQL Connection & Auto-Initializer
 * Optimized for Hostinger Business Plan:
 * - ATTR_PERSISTENT = false (prevents connection pooling starvation on PHP-FPM)
 * - Session wait_timeout = 60 & interactive_timeout = 60 (releases idle sockets immediately)
 * - ATTR_TIMEOUT = 4 (prevents hanging requests)
 * - executeWithRetry() helper with auto-reconnect on dropped connections
 */

@ini_set('display_errors', '0');
@error_reporting(0);

define('DB_HOST', getenv('MYSQL_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('MYSQL_PORT') ?: '3306');
define('DB_NAME', getenv('MYSQL_DATABASE') ?: 'u591469534_educ');
define('DB_USER', getenv('MYSQL_USER') ?: 'u591469534_educt');
define('DB_PASS', getenv('MYSQL_PASSWORD') ?: 'Q5w^tt5EY>');

define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'team@learnupindia.com');
define('SMTP_PASS', 'Owner@team4');
define('WEBSITE_NAME', 'learnupindia.com');

function getLearnUpPdo(bool $forceNew = false): ?PDO {
    static $pdo = null;
    if ($pdo !== null && !$forceNew) {
        return $pdo;
    }

    $candidates = [
        ['host' => DB_HOST, 'db' => DB_NAME, 'user' => DB_USER, 'pass' => DB_PASS],
        ['host' => 'localhost', 'db' => DB_NAME, 'user' => DB_USER, 'pass' => DB_PASS],
        ['host' => '127.0.0.1', 'db' => 'u591469534_educ', 'user' => 'u591469534_educ', 'pass' => DB_PASS],
        ['host' => 'localhost', 'db' => 'u591469534_educ', 'user' => 'u591469534_educ', 'pass' => DB_PASS],
        ['host' => '127.0.0.1', 'db' => 'u591469534_educt', 'user' => 'u591469534_educt', 'pass' => DB_PASS],
        ['host' => 'localhost', 'db' => 'u591469534_educt', 'user' => 'u591469534_educt', 'pass' => DB_PASS],
    ];

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 4,
        PDO::ATTR_PERSISTENT => false, // Crucial for Hostinger Business Plan to prevent "Too many connections"
    ];
    if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
        $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, SESSION wait_timeout = 60, SESSION interactive_timeout = 60";
    }

    foreach ($candidates as $c) {
        try {
            $dsn = 'mysql:host=' . $c['host'] . ';port=' . DB_PORT . ';dbname=' . $c['db'] . ';charset=utf8mb4';
            $inst = new PDO($dsn, $c['user'], $c['pass'], $options);
            ensureMysqlSchemaAndSeed($inst);
            $pdo = $inst;
            return $pdo;
        } catch (Throwable $e) {
            // try next candidate
        }
    }

    $pdo = null;
    return null;
}

/**
 * Execute query with automatic retry on transient connection drops (e.g. MySQL server has gone away)
 */
function executeWithRetry(?PDO &$pdo, string $sql, array $params = [], int $maxRetries = 3): ?PDOStatement {
    $attempt = 0;
    while ($attempt < $maxRetries) {
        if (!$pdo) {
            $pdo = getLearnUpPdo(true);
        }
        if (!$pdo) return null;

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            $attempt++;
            $code = (int)($e->errorInfo[1] ?? 0);
            $msg = $e->getMessage();
            // Retry on MySQL server gone away (2006), connection lost (2013), deadlock/lock wait timeout (1205, 1213)
            $isRetryable = in_array($code, [2006, 2013, 1205, 1213, 1040], true)
                || stripos($msg, 'server has gone away') !== false
                || stripos($msg, 'Lost connection') !== false;

            if ($isRetryable && $attempt < $maxRetries) {
                usleep($attempt * 200000); // 200ms, 400ms backoff
                $pdo = getLearnUpPdo(true);
            } else {
                throw $e;
            }
        }
    }
    return null;
}

function ensureMysqlSchemaAndSeed(PDO $pdo): void {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'offer_batches'");
        $hasBatches = $stmt && $stmt->fetchColumn();
        if ($hasBatches) {
            $cntUsers = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
            $cntCourses = (int)$pdo->query("SELECT COUNT(*) FROM `courses`")->fetchColumn();
            if ($cntUsers >= 9 && $cntCourses >= 3) {
                return;
            }
        }
    } catch (Throwable $e) {
        // Proceed to initialize schema and seed data
    }

    $schemaFile = dirname(__DIR__) . '/database/schema.mysql.sql';
    if (!file_exists($schemaFile)) {
        return;
    }

    $sql = file_get_contents($schemaFile);
    if (!$sql) {
        return;
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $statements = explode(";\n", $sql);
    foreach ($statements as $rawStmt) {
        $lines = explode("\n", $rawStmt);
        $cleanLines = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || strpos($trimmed, '--') === 0) {
                continue;
            }
            $cleanLines[] = $line;
        }
        $query = trim(implode("\n", $cleanLines));
        if ($query !== '') {
            try {
                $pdo->exec($query);
            } catch (Throwable $ignore) {
                // Continue executing remaining statements
            }
        }
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
}
