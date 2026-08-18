-- =====================================================
-- Assignment Portal — Database Schema
-- Import this file in phpMyAdmin, or run:
--   mysql -u root -p < assignment_db.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS assignment_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE assignment_db;

-- ---------------------------------------------------
-- Users: teachers and students in one table, split by role
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Assignments: posted by a teacher, with a deadline and
-- an optional reference file (instructions sheet, etc.)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100),
    description TEXT,
    instructions TEXT,
    attachment_path VARCHAR(255),
    attachment_name VARCHAR(255),
    deadline DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Submissions: one student's uploaded file for one assignment,
-- their optional comment, plus the teacher's remark/grade
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    student_comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark TEXT,
    grade VARCHAR(10),
    status ENUM('submitted', 'reviewed') DEFAULT 'submitted',
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_submission (assignment_id, student_id)
) ENGINE=InnoDB;
