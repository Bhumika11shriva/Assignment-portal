<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('teacher');
$assignmentId = $_GET['assignment_id'] ?? null;

if (!$assignmentId) {
    http_response_code(400);
    echo json_encode(['error' => 'Assignment id is required']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM assignments WHERE id = ? AND teacher_id = ?');
$stmt->execute([$assignmentId, $user['id']]);
$assignment = $stmt->fetch();
if (!$assignment) {
    http_response_code(404);
    echo json_encode(['error' => 'Assignment not found']);
    exit;
}

$stmt = $pdo->prepare(
    "SELECT s.*, u.name AS student_name, u.email AS student_email
     FROM submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.assignment_id = ?
     ORDER BY s.submitted_at DESC"
);
$stmt->execute([$assignmentId]);

echo json_encode(['assignment' => $assignment, 'submissions' => $stmt->fetchAll()]);
