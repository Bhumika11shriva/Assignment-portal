<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireLogin();

if ($user['role'] === 'teacher') {
    $stmt = $pdo->prepare(
        "SELECT a.*,
                COUNT(s.id) AS submission_count,
                SUM(CASE WHEN s.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed_count
         FROM assignments a
         LEFT JOIN submissions s ON s.assignment_id = a.id
         WHERE a.teacher_id = ?
         GROUP BY a.id
         ORDER BY a.deadline ASC"
    );
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// student
$stmt = $pdo->prepare(
    "SELECT a.*, u.name AS teacher_name,
            s.id AS submission_id, s.file_path, s.original_name, s.student_comment,
            s.submitted_at, s.remark, s.grade, s.status AS submission_status
     FROM assignments a
     JOIN users u ON u.id = a.teacher_id
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
     ORDER BY a.deadline ASC"
);
$stmt->execute([$user['id']]);
echo json_encode($stmt->fetchAll());
