<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('teacher');
$data = jsonInput();

$id = $data['id'] ?? null;
$remark = trim($data['remark'] ?? '');
$grade = trim($data['grade'] ?? '');

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Submission id is required']);
    exit;
}

// ownership check: submission's assignment must belong to this teacher
$stmt = $pdo->prepare(
    "SELECT s.id FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     WHERE s.id = ? AND a.teacher_id = ?"
);
$stmt->execute([$id, $user['id']]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'Submission not found']);
    exit;
}

$stmt = $pdo->prepare("UPDATE submissions SET remark = ?, grade = ?, status = 'reviewed' WHERE id = ?");
$stmt->execute([$remark ?: null, $grade ?: null, $id]);

$stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = ?');
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
