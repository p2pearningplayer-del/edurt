<?php
/**
 * LearnUp India (learnupindia.com) — Production Entry Point for Hostinger
 * Routes /api/* requests directly to api/index.php if .htaccess rewrite is bypassed,
 * initializes MySQL database u591469534_educ on first visit, and serves the app bundle.
 */
$reqPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
if (strpos($reqPath, '/api/') === 0 || $reqPath === '/api' || isset($_GET['_route'])) {
    require __DIR__ . '/api/index.php';
    exit;
}

require_once __DIR__ . '/api/db_bootstrap.php';

// Ensure Hostinger MySQL database (u591469534_educ) has all tables & seed data
$pdo = getLearnUpPdo();

// Serve compiled production HTML
$distHtml = __DIR__ . '/dist/index.html';
if (file_exists($distHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($distHtml);
    exit;
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0f0e" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>LearnUp India (learnupindia.com) — Executive E-Learning &amp; 70% Direct Partner Platform</title>
    <meta
      name="description"
      content="Master high-value digital systems, quantitative market literacy, and AI automation with 100% verified streaming courses, downloadable PDF certificates, and 70% direct referral commissions."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" crossorigin href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/app.js"></script>
  </body>
</html>
