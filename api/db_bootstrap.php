<?php
/**
 * LearnUp India (learnupindia.com) — Hostinger MySQL Connection & Auto-Initializer
 * Database: u591469534_educ
 * Username: u591469534_educt
 */

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

function getLearnUpPdo(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        ensureMysqlSchemaAndSeed($pdo);
        return $pdo;
    } catch (Throwable $e) {
        // Fallback to localhost socket if 127.0.0.1 fails on Hostinger
        try {
            $dsn = 'mysql:host=localhost;dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            ensureMysqlSchemaAndSeed($pdo);
            return $pdo;
        } catch (Throwable $e2) {
            return null;
        }
    }
}

function ensureMysqlSchemaAndSeed(PDO $pdo): void {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'offer_batches'");
        $hasBatches = $stmt && $stmt->fetchColumn();
        if ($hasBatches) {
            $cntUsers = (int)$pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
            $cntContent = (int)$pdo->query("SELECT COUNT(*) FROM `website_content`")->fetchColumn();
            if ($cntUsers >= 9 && $cntContent >= 1) {
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
