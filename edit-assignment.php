<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('teacher');
$data = jsonInput();

$id = $data['id'] ?? null;
$title = trim($data['title'] ?? '');
$subject = trim($data['subject'] ?? '');
$description = trim($data['description'] ?? '');
$instructions = trim($data['instructions'] ?? '');
$deadline = trim($data['deadline'] ?? '');

if (!$id || !$title || !$deadline) {
    http_response_code(400);
    echo json_encode(['error' => 'ID, title and deadline are required']);
    exit;
}

// ownership check
$stmt = $pdo->prepare('SELECT id FROM assignments WHERE id = ? AND teacher_id = ?');
$stmt->execute([$id, $user['id']]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'Assignment not found']);
    exit;
}

$stmt = $pdo->prepare(
    'UPDATE assignments SET title = ?, subject = ?, description = ?, instructions = ?, deadline = ? WHERE id = ?'
);
$stmt->execute([$title, $subject, $description, $instructions, $deadline, $id]);

$stmt = $pdo->prepare('SELECT * FROM assignments WHERE id = ?');
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
