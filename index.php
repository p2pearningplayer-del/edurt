<?php
/**
 * Blank Starter Entry Point
 */
$reqPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
if (strpos($reqPath, '/api/') === 0 || $reqPath === '/api') {
    require __DIR__ . '/api/index.php';
    exit;
}

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter Application</title>
    <link rel="stylesheet" crossorigin href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/app.js"></script>
  </body>
</html>
