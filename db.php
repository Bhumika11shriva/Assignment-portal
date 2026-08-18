<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/*
|--------------------------------------------------------------------------
| Database Connection
|--------------------------------------------------------------------------
| Render provides PostgreSQL connection details through DATABASE_URL.
| The application uses PDO so the rest of the PHP files can continue
| using the existing $pdo variable.
|--------------------------------------------------------------------------
*/

try {

    /*
    |--------------------------------------------------------------------------
    | Render PostgreSQL
    |--------------------------------------------------------------------------
    */

    if (!empty(getenv('DATABASE_URL'))) {

        $databaseUrl = getenv('DATABASE_URL');

        $url = parse_url($databaseUrl);

        if ($url === false || empty($url['host'])) {
            throw new Exception('Invalid DATABASE_URL.');
        }

        $host = $url['host'];
        $port = $url['port'] ?? 5432;
        $dbname = isset($url['path'])
            ? ltrim($url['path'], '/')
            : '';

        $username = $url['user'] ?? '';
        $password = $url['pass'] ?? '';

        /*
         * PostgreSQL PDO connection.
         * Render PostgreSQL requires SSL.
         */
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";

        $pdo = new PDO(
            $dsn,
            urldecode($username),
            urldecode($password),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );

    } else {

        /*
        |--------------------------------------------------------------------------
        | Local / fallback database
        |--------------------------------------------------------------------------
        |
        | These values can be supplied through environment variables.
        | Do NOT put production passwords directly in this file.
        |
        */

        $dbHost = getenv('DB_HOST') ?: 'localhost';
        $dbName = getenv('DB_NAME') ?: 'assignment_portal';
        $dbUser = getenv('DB_USER') ?: 'root';
        $dbPass = getenv('DB_PASS') ?: '';

        $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";

        $pdo = new PDO(
            $dsn,
            $dbUser,
            $dbPass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
    }

} catch (PDOException $e) {

    /*
     * Don't expose database credentials or connection details
     * to users in production.
     */
    error_log('Database connection failed: ' . $e->getMessage());

    die('Database connection failed.');

} catch (Exception $e) {

    error_log('Database configuration error: ' . $e->getMessage());

    die('Database configuration error.');

}


/*
|--------------------------------------------------------------------------
| Start session safely
|--------------------------------------------------------------------------
*/

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}