-- =====================================================
-- Assignment Portal — Database Schema (PostgreSQL version)
-- Use this file when deploying on Render (or any Postgres
-- host). For local XAMPP/WAMP with MySQL, use
-- assignment_db.sql instead.
--
-- Render's own Postgres dashboard already creates the
-- database for you, so this file only creates the tables —
-- run it from the "psql" shell/Shell tab, or paste it into
-- any Postgres client connected to your Render database.
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('teacher', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100),
    description TEXT,
    instructions TEXT,
    attachment_path VARCHAR(255),
    attachment_name VARCHAR(255),
    deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    student_comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark TEXT,
    grade VARCHAR(10),
    status VARCHAR(10) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
    CONSTRAINT unique_submission UNIQUE (assignment_id, student_id)
);
