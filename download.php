<?php
require 'db.php';
require 'auth.php';

$user = requireLogin();
$type = $_GET['type'] ?? '';   // 'assignment' or 'submission'
$id = $_GET['id'] ?? null;

if (!$id || !in_array($type, ['assignment', 'submission'])) {
    http_response_code(400);
    echo 'Bad request';
    exit;
}

if ($type === 'assignment') {
    $stmt = $pdo->prepare('SELECT * FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row || !$row['attachment_path']) { http_response_code(404); echo 'Not found'; exit; }

    // teacher must own it; students can view any (it's the assignment's public attachment)
    if ($user['role'] === 'teacher' && $row['teacher_id'] != $user['id']) {
        http_response_code(403); echo 'Forbidden'; exit;
    }
    $filePath = __DIR__ . '/../' . $row['attachment_path'];
    $downloadName = $row['attachment_name'] ?: 'attachment';
} else {
    $stmt = $pdo->prepare('SELECT s.*, a.teacher_id FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo 'Not found'; exit; }

    $isOwner = $user['role'] === 'student' && $row['student_id'] == $user['id'];
    $isTeacher = $user['role'] === 'teacher' && $row['teacher_id'] == $user['id'];
    if (!$isOwner && !$isTeacher) { http_response_code(403); echo 'Forbidden'; exit; }

    $filePath = __DIR__ . '/../' . $row['file_path'];
    $downloadName = $row['original_name'] ?: 'submission';
}

if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'File missing on server';
    exit;
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($downloadName) . '"');
header('Content-Length: ' . filesize($filePath));
readfile($filePath);
