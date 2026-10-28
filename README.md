# EduConnect

> **Connect. Learn. Stay Updated.**

A modern, responsive university academic portal featuring role-based authentication and separated workspaces for **Teachers** and **Students**.

---

## Features

### 1. Authentication & Role Separation
- **Dual-role Login & Signup**: Toggle between Student and Teacher roles.
- **Strict Role Protection**: Students cannot access Teacher pages, and Teachers cannot access Student pages.
- **Instant Demo Logins**: One-click quick login buttons for both roles to test out the application instantly.

### 2. Teacher Portal
- **Dashboard**:
  - Total classes created
  - Total student enrollments across all classes
  - Active classes list with live enrollment counts
  - Quick action to create classes
- **Class Management**:
  - Create new classes with Course Name, Course Code, and Description (Teacher auto-associated)
  - View all classes created under "My Classes"
  - Search and filter classes by name or code
- **Class Detail Tabs**:
  - **Overview**: Class summary, code, instructor name, and quick preview of announcements.
  - **Notes / Study Materials**: Upload documents (PDF, DOCX, TXT, PPTX), preview, download, and delete previously uploaded materials.
  - **Announcements**: Broadcast notices to enrolled students with title, message, and timestamp.
  - **Student Roster**: View enrolled students (name, email, enrollment date) and deroll/remove students with a custom confirmation dialog.
  - **Timed Assignments**: Create assignments with title, detailed instructions, point values, deadline timestamps, and optional reference handouts (PDF, Word).
  - **Submissions & Roster Review**: Inspect complete roster for each assignment to see which students submitted (with file view/download, submission date/time, and student notes) and who has not submitted yet.
  - **Re-upload Permission Toggle**: One-click toggle switch to permit or lock student submission deletions and re-uploads at any time.
  - **Scheduled Quizzes & Tests**: Create quizzes in a specific timeline (Start time, End time, Duration). Supports Single-Correct MCQs, Multi-Correct MCQs (auto-graded against presets), and Paragraph type questions.
  - **Paragraph Evaluation & Remarks**: Allot marks (0 to max points) and write qualitative feedback remarks for essay/paragraph answers.
  - **Statistical Analytics & Scoreboard**: View highest marks, lowest marks, class average marks, median marks, top scorers list, and student participation rates.

### 3. Student Portal
- **Dashboard**:
  - Total number of classes enrolled in
  - Enrolled courses list with quick access
  - **Pending Assignments Widget**: Live countdown badges, due dates, and one-click submission triggers
  - **Pending Quizzes Widget**: Highlights pending tests with direct "Take Quiz" action
  - Recent announcements feed from professors
- **My Classes**:
  - View all registered classes with instructor name, course code, and description
  - Click to open the class page
- **Quizzes & Tests Hub (`/student/quizzes`)**:
  - View Pending, Attempted, and All Quizzes across enrolled classes
  - **Take Timed Quiz**: Live countdown timer, auto-submit on time expiry, progress indicator
  - **Answer Key & Verification**: After attempting, verify MCQ answers (chosen option, correct preset, points awarded, and teacher explanations)
  - **Instructor Remarks**: View allotted marks and teacher feedback remarks on paragraph questions
  - **Overall Summary Analytics**: View total attempts, class participation, highest marks, top scorers, class average, and median marks
- **Assignments & Deadlines Hub**:
  - Filter by "Pending", "Submitted", or "All"
  - Real-time countdown timer for each assignment
  - Upload PDF/document submissions before the deadline
  - Delete and re-upload submissions when authorized by instructor
- **Class Detail**:
  - **Overview**: Course information, teacher profile, and course updates.
  - **Notes**: Download and view study materials uploaded by the instructor.
  - **Assignments**: View class assignments, download reference prompt sheets, submit PDF coursework, or delete/re-upload before the deadline.
  - **Quizzes**: View scheduled tests, take active quizzes, or inspect results and class summary.
  - **Announcements**: Read announcements from the professor.
- **View Available Classes**:
  - Browse all classes offered across the university platform
  - One-click enrollment
  - Real-time enrolled count update
  - Duplicate enrollment prevention (shows "Already Enrolled" state)

---

## Demo Accounts

The database is pre-seeded with sample data:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Teacher** | Dr. Robert Miller | `teacher@college.edu` | `password123` |
| **Student** | Alice Johnson | `student@college.edu` | `password123` |
| **Student** | Brian Chen | `brian@college.edu` | `password123` |

You can also create your own Teacher or Student accounts on the Sign Up tab.

---

## Quick Start

### 1. Run the Application
```bash
# Start backend server (serves both API & built frontend at http://localhost:5000)
npm run start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

### 2. Development Mode (with Vite Hot Reload)
```bash
# Runs Express API on port 5000 and Vite dev server on port 3000 concurrently:
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

### 3. Run Integration Tests
```bash
# Run overall portal test suite:
node test_portal.js

# Run full quiz & assessment integration tests:
node test_quizzes.js
```
Validates authentication, class enrollment, assignments, quizzes scheduling, MCQ auto-grading, paragraph remarks, and summary analytics.

---

## Technology Stack

- **Backend**: Node.js, Express, JSON-backed persistent store (`server/data/db.json`), Multer for file uploads, Bcrypt for password security, JWT for role-based session tokens.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons, React Router v6.
