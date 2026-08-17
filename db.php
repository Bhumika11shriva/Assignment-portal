<?php
/**
 * db.php — shared database connection.
 * Update DB_USER / DB_PASS below to match your MySQL setup
 * (defaults match a typical fresh XAMPP/WAMP install: user
 * "root" with no password).
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'assignment_db');
define('DB_USER', 'root');
define('DB_PASS', '');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Every request that touches the DB also needs the session
// (for auth), so start it here in one place.
//
// FIX: the login->dashboard "flicker back to login" glitch was caused by
// the session cookie not reliably surviving the redirect straight after
// login. PHP's default cookie params can end up with no explicit path
// and an implicit SameSite value that some browsers refuse to attach on
// the very next request, so the auth check on dashboard.html would
// intermittently fail even though login had just succeeded. Setting the
// params explicitly, once, before the session starts fixes that.
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 7, // 7 days
        'path' => '/',
        'domain' => '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
