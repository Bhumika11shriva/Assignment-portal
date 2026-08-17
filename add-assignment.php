<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireRole('teacher');

$title = trim($_POST['title'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$description = trim($_POST['description'] ?? '');
$instructions = trim($_POST['instructions'] ?? '');
$deadline = trim($_POST['deadline'] ?? '');

if (!$title || !$deadline) {
    http_response_code(400);
    echo json_encode(['error' => 'Title and deadline are required']);
    exit;
}

$attachmentPath = null;
$attachmentName = null;

if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $ext = pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION);
    $safeName = 'assignment_' . $user['id'] . '_' . time() . '_' . mt_rand(1000, 9999) . ($ext ? ".$ext" : '');
    $dest = $uploadDir . $safeName;

    if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dest)) {
        $attachmentPath = 'uploads/' . $safeName;
        $attachmentName = $_FILES['attachment']['name'];
    }
}

$stmt = $pdo->prepare(
    'INSERT INTO assignments (teacher_id, title, subject, description, instructions, attachment_path, attachment_name, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$user['id'], $title, $subject, $description, $instructions, $attachmentPath, $attachmentName, $deadline]);

$id = $pdo->lastInsertId();
$stmt = $pdo->prepare('SELECT * FROM assignments WHERE id = ?');
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
