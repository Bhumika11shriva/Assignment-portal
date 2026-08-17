<?php
/**
 * auth.php — session-based auth helpers.
 * Included by every protected PHP endpoint (after db.php,
 * which already starts the session).
 */

function currentUser() {
    if (!isset($_SESSION['user_id'])) return null;
    return [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'],
    ];
}

function requireLogin() {
    $user = currentUser();
    if (!$user) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not logged in']);
        exit;
    }
    return $user;
}

function requireRole($role) {
    $user = requireLogin();
    if ($user['role'] !== $role) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => "Only {$role}s can do this"]);
        exit;
    }
    return $user;
}

function jsonInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return $data ?: [];
}
