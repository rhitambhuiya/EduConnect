const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Generate simple unique IDs
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

class Database {
  constructor() {
    this.data = {
      users: [],
      classes: [],
      enrollments: [],
      notes: [],
      announcements: []
    };
    this.init();
  }

  init() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        return;
      } catch (err) {
        console.error('Error reading db.json, re-initializing with seed data:', err);
      }
    }
    this.seed();
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  seed() {
    console.log('Seeding initial College Portal data...');
    const salt = bcrypt.genSaltSync(10);
    const teacherPasswordHash = bcrypt.hashSync('password123', salt);
    const studentPasswordHash = bcrypt.hashSync('password123', salt);

    const teacher1 = {
      id: 'usr_teacher_1',
      name: 'Dr. Robert Miller',
      email: 'teacher@college.edu',
      password: teacherPasswordHash,
      role: 'teacher',
      createdAt: '2026-09-01T08:00:00.000Z'
    };

    const student1 = {
      id: 'usr_student_1',
      name: 'Alice Johnson',
      email: 'student@college.edu',
      password: studentPasswordHash,
      role: 'student',
      createdAt: '2026-09-02T09:00:00.000Z'
    };

    const student2 = {
      id: 'usr_student_2',
      name: 'Brian Chen',
      email: 'brian@college.edu',
      password: studentPasswordHash,
      role: 'student',
      createdAt: '2026-09-02T10:00:00.000Z'
    };

    this.data.users = [teacher1, student1, student2];

    const class1 = {
      id: 'cls_cs101',
      name: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'Foundations of algorithms, variables, control flow, functions, and structured problem solving.',
      teacherId: teacher1.id,
      teacherName: teacher1.name,
      createdAt: '2026-09-05T10:00:00.000Z'
    };

    const class2 = {
      id: 'cls_cs202',
      name: 'Data Structures and Algorithms',
      code: 'CS202',
      description: 'Comprehensive study of stacks, queues, linked lists, trees, graphs, sorting, and algorithmic complexity.',
      teacherId: teacher1.id,
      teacherName: teacher1.name,
      createdAt: '2026-09-06T11:00:00.000Z'
    };

    const class3 = {
      id: 'cls_cs304',
      name: 'Web Application Engineering',
      code: 'CS304',
      description: 'Modern full-stack web development covering client-server communication, RESTful APIs, and responsive design.',
      teacherId: teacher1.id,
      teacherName: teacher1.name,
      createdAt: '2026-09-07T12:00:00.000Z'
    };

    this.data.classes = [class1, class2, class3];

    // Enrollments: Alice is enrolled in CS101 and CS202; Brian in CS101 and CS304
    this.data.enrollments = [
      {
        id: 'enr_1',
        studentId: student1.id,
        classId: class1.id,
        enrolledAt: '2026-09-10T08:30:00.000Z'
      },
      {
        id: 'enr_2',
        studentId: student1.id,
        classId: class2.id,
        enrolledAt: '2026-09-10T08:35:00.000Z'
      },
      {
        id: 'enr_3',
        studentId: student2.id,
        classId: class1.id,
        enrolledAt: '2026-09-10T09:15:00.000Z'
      },
      {
        id: 'enr_4',
        studentId: student2.id,
        classId: class3.id,
        enrolledAt: '2026-09-10T09:30:00.000Z'
      }
    ];

    // Seed sample files in uploads
    const sampleFile1 = 'sample_cs101_week1.txt';
    const samplePath1 = path.join(UPLOADS_DIR, sampleFile1);
    if (!fs.existsSync(samplePath1)) {
      fs.writeFileSync(samplePath1, 'CS101 Week 1 Lecture Notes:\n\nWelcome to Introduction to Computer Science.\nKey concepts: algorithms, pseudo-code, compilation, variables, and expressions.', 'utf-8');
    }

    const sampleFile2 = 'sample_cs202_trees.txt';
    const samplePath2 = path.join(UPLOADS_DIR, sampleFile2);
    if (!fs.existsSync(samplePath2)) {
      fs.writeFileSync(samplePath2, 'CS202 Data Structures Notes:\n\nTopic: Binary Search Trees & Tree Traversals (In-order, Pre-order, Post-order).\nTime complexity: O(log n) average, O(n) worst-case.', 'utf-8');
    }

    this.data.notes = [
      {
        id: 'not_1',
        classId: class1.id,
        teacherId: teacher1.id,
        title: 'Week 1 - Computing Fundamentals & Pseudo-code',
        originalName: 'CS101_Week1_Fundamentals.txt',
        fileName: sampleFile1,
        fileSize: 185,
        mimeType: 'text/plain',
        uploadedAt: '2026-09-12T14:00:00.000Z'
      },
      {
        id: 'not_2',
        classId: class2.id,
        teacherId: teacher1.id,
        title: 'Binary Search Trees & Traversal Techniques',
        originalName: 'CS202_BST_Notes.txt',
        fileName: sampleFile2,
        fileSize: 210,
        mimeType: 'text/plain',
        uploadedAt: '2026-09-14T16:20:00.000Z'
      }
    ];

    this.data.announcements = [
      {
        id: 'anc_1',
        classId: class1.id,
        teacherId: teacher1.id,
        teacherName: teacher1.name,
        title: 'Welcome to CS101!',
        content: 'Welcome everyone to Introduction to Computer Science. Please review the syllabus and the Week 1 lecture notes posted in the Notes section.',
        createdAt: '2026-09-08T10:00:00.000Z'
      },
      {
        id: 'anc_2',
        classId: class1.id,
        teacherId: teacher1.id,
        teacherName: teacher1.name,
        title: 'Lab Session Timing & Setup Reminder',
        content: 'Please ensure you have configured your development environment before Thursday lab session at 2:00 PM in Lab Hall B.',
        createdAt: '2026-09-12T09:15:00.000Z'
      },
      {
        id: 'anc_3',
        classId: class2.id,
        teacherId: teacher1.id,
        teacherName: teacher1.name,
        title: 'Upcoming Problem Set 1 Released',
        content: 'Problem Set 1 covering asymptotic notation and linked list algorithms has been scheduled. Office hours will be on Wednesday 4 PM.',
        createdAt: '2026-09-15T11:30:00.000Z'
      }
    ];
  }

  // --- User Operations ---
  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser({ name, email, password, role }) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const user = {
      id: generateId('usr'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: passwordHash,
      role,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Class Operations ---
  getClasses() {
    return this.data.classes;
  }

  findClassById(id) {
    return this.data.classes.find(c => c.id === id);
  }

  getClassesByTeacher(teacherId) {
    return this.data.classes.filter(c => c.teacherId === teacherId);
  }

  createClass({ name, code, description, teacherId, teacherName }) {
    const newClass = {
      id: generateId('cls'),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      teacherId,
      teacherName,
      createdAt: new Date().toISOString()
    };
    this.data.classes.push(newClass);
    this.save();
    return newClass;
  }

  // --- Enrollment Operations ---
  isEnrolled(studentId, classId) {
    return this.data.enrollments.some(e => e.studentId === studentId && e.classId === classId);
  }

  enrollStudent(studentId, classId) {
    if (this.isEnrolled(studentId, classId)) {
      return null; // Already enrolled
    }
    const enrollment = {
      id: generateId('enr'),
      studentId,
      classId,
      enrolledAt: new Date().toISOString()
    };
    this.data.enrollments.push(enrollment);
    this.save();
    return enrollment;
  }

  getEnrollmentCount(classId) {
    return this.data.enrollments.filter(e => e.classId === classId).length;
  }

  getEnrolledStudents(classId) {
    const enrollments = this.data.enrollments.filter(e => e.classId === classId);
    return enrollments.map(e => {
      const student = this.findUserById(e.studentId);
      return {
        id: e.studentId,
        name: student ? student.name : 'Unknown Student',
        email: student ? student.email : '',
        enrolledAt: e.enrolledAt
      };
    });
  }

  getClassesForStudent(studentId) {
    const enrollments = this.data.enrollments.filter(e => e.studentId === studentId);
    const classIds = new Set(enrollments.map(e => e.classId));
    return this.data.classes.filter(c => classIds.has(c.id));
  }

  // --- Note Operations ---
  getNotesByClass(classId) {
    return this.data.notes
      .filter(n => n.classId === classId)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  findNoteById(id) {
    return this.data.notes.find(n => n.id === id);
  }

  createNote({ classId, teacherId, title, originalName, fileName, fileSize, mimeType }) {
    const note = {
      id: generateId('not'),
      classId,
      teacherId,
      title: title.trim(),
      originalName,
      fileName,
      fileSize,
      mimeType,
      uploadedAt: new Date().toISOString()
    };
    this.data.notes.push(note);
    this.save();
    return note;
  }

  deleteNote(id) {
    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return null;
    const [deletedNote] = this.data.notes.splice(index, 1);
    this.save();

    // Remove the physical file from disk if present
    if (deletedNote.fileName) {
      const filePath = path.join(UPLOADS_DIR, deletedNote.fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error removing note file from disk:', err);
        }
      }
    }
    return deletedNote;
  }

  // --- Announcement Operations ---
  getAnnouncementsByClass(classId) {
    return this.data.announcements
      .filter(a => a.classId === classId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createAnnouncement({ classId, teacherId, teacherName, title, content }) {
    const announcement = {
      id: generateId('anc'),
      classId,
      teacherId,
      teacherName,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    this.data.announcements.push(announcement);
    this.save();
    return announcement;
  }
}

const db = new Database();

module.exports = {
  db,
  UPLOADS_DIR
};
