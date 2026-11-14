<?php
/**
 * Blank Starter Database Bootstrap
 */

@ini_set('display_errors', '0');
@error_reporting(0);

define('DB_HOST', getenv('MYSQL_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('MYSQL_PORT') ?: '3306');
define('DB_NAME', getenv('MYSQL_DATABASE') ?: 'u591469534_educ');
define('DB_USER', getenv('MYSQL_USER') ?: 'u591469534_educt');
define('DB_PASS', getenv('MYSQL_PASSWORD') ?: '');

function getDbConnection(): ?PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    if (DB_PASS === '') {
        return null;
    }

    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 4,
            PDO::ATTR_PERSISTENT => false,
        ]);
        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}
