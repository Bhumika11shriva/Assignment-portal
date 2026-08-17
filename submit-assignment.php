<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('student');

$assignmentId = $_POST['assignment_id'] ?? null;
$comment = trim($_POST['comment'] ?? '');

if (!$assignmentId) {
    http_response_code(400);
    echo json_encode(['error' => 'Assignment id is required']);
    exit;
}
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'A file is required']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM assignments WHERE id = ?');
$stmt->execute([$assignmentId]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['error' => 'Assignment not found']);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
$safeName = 'submission_' . $user['id'] . '_' . time() . '_' . mt_rand(1000, 9999) . ($ext ? ".$ext" : '');
$dest = $uploadDir . $safeName;

if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save uploaded file']);
    exit;
}
$relPath = 'uploads/' . $safeName;

$stmt = $pdo->prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?');
$stmt->execute([$assignmentId, $user['id']]);
$existing = $stmt->fetch();

if ($existing) {
    $oldPath = __DIR__ . '/../' . $existing['file_path'];
    if (file_exists($oldPath)) unlink($oldPath);

    $stmt = $pdo->prepare(
        "UPDATE submissions
         SET file_path = ?, original_name = ?, student_comment = ?, submitted_at = NOW(),
             remark = NULL, grade = NULL, status = 'submitted'
         WHERE id = ?"
    );
    $stmt->execute([$relPath, $_FILES['file']['name'], $comment, $existing['id']]);
    $subId = $existing['id'];
} else {
    $stmt = $pdo->prepare(
        'INSERT INTO submissions (assignment_id, student_id, file_path, original_name, student_comment)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$assignmentId, $user['id'], $relPath, $_FILES['file']['name'], $comment]);
    $subId = $pdo->lastInsertId();
}

$stmt = $pdo->prepare('SELECT * FROM submissions WHERE id = ?');
$stmt->execute([$subId]);
echo json_encode($stmt->fetch());
