# Assignment Portal — PHP + MySQL

A full homework/assignment portal for teachers and students, built with
plain PHP (session-based auth, no framework) + MySQL, and a multi-page
HTML/CSS/JS frontend.

## Folder structure
```
assignment-portal/
├── index.html              Login / register
├── dashboard.html           Stats overview + charts + upcoming deadlines
├── assignments.html         Browse all assignments — search + filters
├── assignment-details.html  One assignment: description, instructions, file, deadline
├── submit-assignment.html   Upload + comment + submit (student)
├── teacher-panel.html       Create / edit / delete assignments, review submissions
├── reports.html             Completed/pending charts + student progress table
├── css/style.css
├── js/script.js             All frontend logic — one shared file for every page
├── images/                  (empty — drop any logo/icons here if you want)
├── php/
│   ├── db.php                 DB connection (edit your MySQL credentials here)
│   ├── auth.php                Session helper functions
│   ├── register.php / login.php / logout.php / session.php
│   ├── add-assignment.php      Create (teacher, supports file attachment)
│   ├── edit-assignment.php     Update (teacher)
│   ├── delete-assignment.php   Delete (teacher)
│   ├── get-assignments.php     List — role-aware
│   ├── get-assignment.php      Single assignment detail — role-aware
│   ├── submit-assignment.php   Student uploads/re-uploads work + comment
│   ├── get-submissions.php     Teacher views all submissions for one assignment
│   ├── add-remark.php          Teacher sets remark + grade
│   └── download.php            Secure file download (attachments + submissions)
├── database/
│   └── assignment_db.sql    Import this first
└── uploads/                 Uploaded files land here (auto-created)
```

> **Note:** your original request listed 4 PHP files (`db.php`,
> `add-assignment.php`, `submit-assignment.php`, `delete-assignment.php`).
> I kept those exact names and added the rest (`login.php`, `get-assignments.php`,
> etc.) since a working portal needs login/session handling and a way to
> actually fetch the assignment list — those 4 alone can't run the app end to end.

## Setup (XAMPP / WAMP / LAMP)

1. **Copy the `assignment-portal` folder** into your server's web root:
   - XAMPP (Windows): `C:\xampp\htdocs\assignment-portal`
   - WAMP: `C:\wamp64\www\assignment-portal`
   - Linux/LAMP: `/var/www/html/assignment-portal`

2. **Import the database.** Open phpMyAdmin → Import → choose
   `database/assignment_db.sql` → Go. (Or via terminal:
   `mysql -u root -p < database/assignment_db.sql`.)

3. **Check DB credentials** in `php/db.php`. Defaults are `root` with no
   password (standard fresh XAMPP setup). Change `DB_USER` / `DB_PASS` if
   your MySQL is set up differently.

4. **Make sure `uploads/` is writable.** On Linux: `chmod 755 uploads`.
   On Windows/XAMPP this is usually not an issue.

5. Start Apache + MySQL in your XAMPP/WAMP control panel, then open:
   ```
   http://localhost/assignment-portal/index.html
   ```

## Usage
1. Register as a **Teacher**, go to **Teacher Panel** → create an assignment
   (title, subject, description, instructions, deadline, optional file).
2. Register as a **Student** (different email/browser or logout first) —
   the assignment shows up on **Dashboard** and **Assignments**.
3. Open the assignment → **Submit work** → upload a file + optional comment.
4. Log back in as the teacher → **Teacher Panel** → **Submissions** on that
   assignment → add a grade + remark.
5. Log back in as the student → grade/remark now shows on the assignment
   details page and in **Reports**.

## Features included
- Session-based login for teacher/student roles (PHP `$_SESSION`, passwords hashed with `password_hash`)
- Dashboard: total/completed/pending counts, donut chart, upcoming-deadline list, (teacher) submissions-per-assignment bar chart, (student) completion progress bar
- Assignments list: live search + subject filter + status filter
- Assignment details: description, instructions, attached reference file, live deadline countdown
- Submit assignment: file upload + comment, re-submission supported (resets any prior grade/remark)
- Teacher panel: create / edit / delete assignments (with optional file attachment), inline submissions review + grading
- Reports: completion charts + per-student progress table (teacher) / personal assignment history with grades (student)
- Notification bell: auto-flags assignments due within 72 hours (student) or with unreviewed submissions (teacher) — computed live, no separate notifications table needed
- Fully responsive (mobile breakpoints throughout)
- Charts are hand-drawn SVG/CSS — no external chart library or internet connection required

## Security notes for a real deployment
- All queries use PDO prepared statements (no SQL injection).
- Passwords are hashed with `password_hash()` / verified with `password_verify()`.
- File downloads check ownership before serving (`download.php`).
- For production use, also add: CSRF tokens on state-changing forms, file-type/size validation on uploads, and HTTPS.
