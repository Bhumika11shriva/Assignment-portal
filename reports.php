<?php
require 'db.php';
require 'auth.php';
header('Content-Type: application/json');

$user = requireLogin();

if ($user['role'] === 'teacher') {
    // overall counts across this teacher's assignments
    $stmt = $pdo->prepare(
        "SELECT
            COUNT(DISTINCT a.id) AS total_assignments,
            COUNT(s.id) AS total_submissions,
            SUM(CASE WHEN s.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed_count,
            SUM(CASE WHEN s.status = 'submitted' THEN 1 ELSE 0 END) AS pending_review_count
         FROM assignments a
         LEFT JOIN submissions s ON s.assignment_id = a.id
         WHERE a.teacher_id = ?"
    );
    $stmt->execute([$user['id']]);
    $summary = $stmt->fetch();

    // per-student progress: how many of this teacher's assignments has each student submitted?
    $totalAssignments = (int) $summary['total_assignments'];
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, u.email,
                COUNT(s.id) AS submitted_count,
                SUM(CASE WHEN s.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed_count
         FROM submissions s
         JOIN users u ON u.id = s.student_id
         JOIN assignments a ON a.id = s.assignment_id
         WHERE a.teacher_id = ?
         GROUP BY u.id, u.name, u.email
         ORDER BY submitted_count DESC"
    );
    $stmt->execute([$user['id']]);
    $students = $stmt->fetchAll();

    echo json_encode([
        'summary' => $summary,
        'total_assignments' => $totalAssignments,
        'students' => $students,
    ]);
    exit;
}

// student: their own completion breakdown
$stmt = $pdo->prepare(
    "SELECT a.id, a.title, a.subject, a.deadline,
            s.status AS submission_status, s.grade, s.submitted_at
     FROM assignments a
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
     ORDER BY a.deadline ASC"
);
$stmt->execute([$user['id']]);
$rows = $stmt->fetchAll();

$completed = 0; $pending = 0; $reviewed = 0;
foreach ($rows as $r) {
    if (!$r['submission_status']) $pending++;
    elseif ($r['submission_status'] === 'reviewed') { $completed++; $reviewed++; }
    else $completed++;
}

echo json_encode([
    'total' => count($rows),
    'completed' => $completed,
    'pending' => $pending,
    'reviewed' => $reviewed,
    'assignments' => $rows,
]);
