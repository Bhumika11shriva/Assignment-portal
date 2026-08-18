<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$data = jsonInput();
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password required']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || !password_verify($password, $row['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit;
}

$_SESSION['user_id'] = $row['id'];
$_SESSION['user_name'] = $row['name'];
$_SESSION['user_role'] = $row['role'];

echo json_encode(['user' => ['id' => $row['id'], 'name' => $row['name'], 'role' => $row['role']]]);
