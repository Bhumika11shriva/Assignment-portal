<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('teacher');
$data = jsonInput();
$id = $data['id'] ?? ($_GET['id'] ?? null);

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Assignment id is required']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM assignments WHERE id = ? AND teacher_id = ?');
$stmt->execute([$id, $user['id']]);
$assignment = $stmt->fetch();

if (!$assignment) {
    http_response_code(404);
    echo json_encode(['error' => 'Assignment not found']);
    exit;
}

// clean up files on disk: assignment attachment + all student submissions
if ($assignment['attachment_path']) {
    $p = __DIR__ . '/../' . $assignment['attachment_path'];
    if (file_exists($p)) unlink($p);
}
$stmt = $pdo->prepare('SELECT file_path FROM submissions WHERE assignment_id = ?');
$stmt->execute([$id]);
foreach ($stmt->fetchAll() as $row) {
    $p = __DIR__ . '/../' . $row['file_path'];
    if (file_exists($p)) unlink($p);
}

$stmt = $pdo->prepare('DELETE FROM assignments WHERE id = ?');
$stmt->execute([$id]);

echo json_encode(['success' => true]);
