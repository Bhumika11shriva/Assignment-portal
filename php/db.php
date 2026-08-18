<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/*
 * Render PostgreSQL connection
 * DATABASE_URL is added in Render Environment Variables.
 */

$databaseUrl = getenv('DATABASE_URL');

if (!$databaseUrl) {
    die('Database connection failed: DATABASE_URL is not configured.');
}

$db = parse_url($databaseUrl);

if (
    $db === false ||
    !isset($db['host']) ||
    !isset($db['user']) ||
    !isset($db['pass']) ||
    !isset($db['path'])
) {
    die('Database connection failed: Invalid DATABASE_URL.');
}

$host = $db['host'];
$port = $db['port'] ?? 5432;
$user = rawurldecode($db['user']);
$pass = rawurldecode($db['pass']);
$name = ltrim($db['path'], '/');

try {

    $pdo = new PDO(
        "pgsql:host={$host};port={$port};dbname={$name};sslmode=require",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

} catch (PDOException $e) {

    error_log('Database connection error: ' . $e->getMessage());

    die('Database connection failed.');

}

session_start();