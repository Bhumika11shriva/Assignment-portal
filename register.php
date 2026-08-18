<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$data = jsonInput();
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role = $data['role'] ?? '';

if (!$name || !$email || !$password || !$role) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}
if (!in_array($role, ['teacher', 'student'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Role must be teacher or student']);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already registered']);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $email, $hashed, $role]);
$userId = $pdo->lastInsertId();

$_SESSION['user_id'] = $userId;
$_SESSION['user_name'] = $name;
$_SESSION['user_role'] = $role;

echo json_encode(['user' => ['id' => $userId, 'name' => $name, 'role' => $role]]);
