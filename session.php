<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = currentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}
echo json_encode(['user' => $user]);
