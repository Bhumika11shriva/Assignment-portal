<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireLogin();
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Assignment id is required']);
    exit;
}

if ($user['role'] === 'teacher') {
    $stmt = $pdo->prepare(
        "SELECT a.*, COUNT(s.id) AS submission_count
         FROM assignments a
         LEFT JOIN submissions s ON s.assignment_id = a.id
         WHERE a.id = ? AND a.teacher_id = ?
         GROUP BY a.id"
    );
    $stmt->execute([$id, $user['id']]);
} else {
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS teacher_name,
                s.id AS submission_id, s.file_path, s.original_name, s.student_comment,
                s.submitted_at, s.remark, s.grade, s.status AS submission_status
         FROM assignments a
         JOIN users u ON u.id = a.teacher_id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
         WHERE a.id = ?"
    );
    $stmt->execute([$user['id'], $id]);
}

$row = $stmt->fetch();
if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Assignment not found']);
    exit;
}

echo json_encode($row);
