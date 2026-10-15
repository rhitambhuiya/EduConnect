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
  - **Student Roster**: View all enrolled students (name, email, enrollment date).

### 3. Student Portal
- **Dashboard**:
  - Total number of classes enrolled in
  - Enrolled courses list with quick access
  - Recent announcements feed from professors
- **My Classes**:
  - View all registered classes with instructor name, course code, and description
  - Click to open the class page
- **Class Detail (View Only)**:
  - **Overview**: Course information, teacher profile, and course updates.
  - **Notes**: Download and view study materials uploaded by the instructor (read-only; upload restricted).
  - **Announcements**: Read announcements from the professor (read-only; creation restricted).
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
node test_portal.js
```
Validates all 16 authentication, enrollment, note upload/download, announcement, and permission security rules.

---

## Technology Stack

- **Backend**: Node.js, Express, JSON-backed persistent store (`server/data/db.json`), Multer for file uploads, Bcrypt for password security, JWT for role-based session tokens.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons, React Router v6.
