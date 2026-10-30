const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const QUESTION_BANK_FILE = path.join(DATA_DIR, 'question_bank.json');

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
    this.isMongoConnected = false;
    this.models = null;
    this.data = {
      users: [],
      classes: [],
      enrollments: [],
      notes: [],
      announcements: [],
      assignments: [],
      submissions: [],
      quizzes: [],
      quizAttempts: []
    };
    this.init();
  }

  init() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.users = this.data.users || [];
        this.data.classes = this.data.classes || [];
        this.data.enrollments = this.data.enrollments || [];
        this.data.notes = this.data.notes || [];
        this.data.announcements = this.data.announcements || [];
        this.data.assignments = this.data.assignments || [];
        this.data.submissions = this.data.submissions || [];
        this.data.quizzes = this.data.quizzes || [];
        this.data.quizAttempts = this.data.quizAttempts || [];

        let needsSave = false;
        if (this.data.assignments.length === 0 && this.data.classes.length > 0) {
          this.seedAssignments();
          needsSave = true;
        }
        if (this.data.quizzes.length === 0 && this.data.classes.length > 0) {
          this.seedQuizzes();
          needsSave = true;
        }
        if (needsSave) {
          this.save();
        }
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

    if (this.isMongoConnected && this.models) {
      this.syncToMongo().catch(err => {
        console.error('[MongoDB Atlas] Async persist error:', err.message);
      });
    }
  }

  async connectMongo(uri) {
    try {
      const mongoose = require('mongoose');
      const models = require('./models');
      console.log('[MongoDB Atlas] Connecting to cluster...');
      await mongoose.connect(uri);
      this.isMongoConnected = true;
      this.models = models;
      console.log('[MongoDB Atlas] Connected successfully!');

      const userCount = await models.User.countDocuments();
      if (userCount === 0) {
        console.log('[MongoDB Atlas] Cluster is empty. Initializing with local seed data...');
        await this.syncToMongo();
        console.log('[MongoDB Atlas] Initial seed data uploaded successfully!');
      } else {
        console.log('[MongoDB Atlas] Syncing live data from cloud database into cache...');
        await this.syncFromMongo();
        console.log('[MongoDB Atlas] Cloud synchronization complete.');
      }
    } catch (err) {
      console.error('[MongoDB Atlas] Connection failed:', err.message);
      this.isMongoConnected = false;
    }
  }

  async syncToMongo() {
    if (!this.models) return;
    try {
      const collections = [
        { model: this.models.User, items: this.data.users },
        { model: this.models.Class, items: this.data.classes },
        { model: this.models.Enrollment, items: this.data.enrollments },
        { model: this.models.Note, items: this.data.notes },
        { model: this.models.Announcement, items: this.data.announcements },
        { model: this.models.Assignment, items: this.data.assignments },
        { model: this.models.Submission, items: this.data.submissions },
        { model: this.models.Quiz, items: this.data.quizzes },
        { model: this.models.QuizAttempt, items: this.data.quizAttempts }
      ];

      for (const col of collections) {
        const currentIds = (col.items || []).map(i => i.id).filter(Boolean);
        // Remove documents deleted from memory (e.g. deleted quizzes, notes, or reset attempts)
        await col.model.deleteMany({ id: { $nin: currentIds } });

        for (const item of (col.items || [])) {
          if (!item.id) continue;
          await col.model.findOneAndUpdate(
            { id: item.id },
            { $set: item },
            { upsert: true }
          );
        }
      }
    } catch (err) {
      console.error('[MongoDB Atlas] Sync error:', err.message);
    }
  }

  async syncFromMongo() {
    if (!this.models) return;
    try {
      const [users, classes, enrollments, notes, announcements, assignments, submissions, quizzes, quizAttempts] = await Promise.all([
        this.models.User.find({}).lean(),
        this.models.Class.find({}).lean(),
        this.models.Enrollment.find({}).lean(),
        this.models.Note.find({}).lean(),
        this.models.Announcement.find({}).lean(),
        this.models.Assignment.find({}).lean(),
        this.models.Submission.find({}).lean(),
        this.models.Quiz.find({}).lean(),
        this.models.QuizAttempt.find({}).lean()
      ]);

      if (users.length > 0) this.data.users = users;
      if (classes.length > 0) this.data.classes = classes;
      if (enrollments.length > 0) this.data.enrollments = enrollments;
      if (notes.length > 0) this.data.notes = notes;
      if (announcements.length > 0) this.data.announcements = announcements;
      if (assignments.length > 0) this.data.assignments = assignments;
      if (submissions.length > 0) this.data.submissions = submissions;
      if (quizzes.length > 0) this.data.quizzes = quizzes;
      if (quizAttempts.length > 0) this.data.quizAttempts = quizAttempts;

      if (this.models.QuestionBank) {
        const cloudQuestions = await this.models.QuestionBank.find({}).lean();
        if (cloudQuestions.length > 0) {
          this.questionBank = cloudQuestions;
        }
      }
      if (this.models.QuestionBankSection) {
        const cloudSections = await this.models.QuestionBankSection.find({}).lean();
        if (cloudSections.length > 0) {
          const names = cloudSections.map(s => s.name);
          this.data.questionBankSections = Array.from(new Set([...(this.data.questionBankSections || []), ...names]));
        }
      }
    } catch (err) {
      console.error('[MongoDB Atlas] Sync from cloud error:', err.message);
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

    this.seedAssignments();
    this.seedQuizzes();
  }

  seedAssignments() {
    const cs101 = this.data.classes.find(c => c.code === 'CS101') || this.data.classes[0];
    const cs202 = this.data.classes.find(c => c.code === 'CS202') || this.data.classes[1];
    const teacher = this.data.users.find(u => u.role === 'teacher');
    const studentBrian = this.data.users.find(u => u.email === 'brian@college.edu');

    if (!cs101 || !teacher) return;

    // Seed teacher prompt file
    const promptFile = 'sample_cs101_assignment1_prompt.txt';
    const promptPath = path.join(UPLOADS_DIR, promptFile);
    if (!fs.existsSync(promptPath)) {
      fs.writeFileSync(promptPath, 'CS101 Assignment 1 Instructions:\n\n1. Design pseudo-code for Linear Search and Binary Search.\n2. Compare time and space complexity in best, average, and worst cases.\n3. Format your report clearly and export as a PDF document for submission.', 'utf-8');
    }

    const assignment1 = {
      id: 'asg_cs101_1',
      classId: cs101.id,
      teacherId: teacher.id,
      teacherName: teacher.name,
      title: 'Assignment 1: Algorithms & Pseudo-code Analysis',
      description: 'Analyze time and space complexity of fundamental search algorithms. Formulate structured pseudocode and submit your completed PDF report before the cutoff.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      allowReupload: true,
      totalPoints: 100,
      attachment: {
        originalName: 'CS101_Assignment1_Guidelines.pdf',
        fileName: promptFile,
        fileSize: 268,
        mimeType: 'application/pdf'
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    const assignmentList = [assignment1];

    if (cs202) {
      const assignment2 = {
        id: 'asg_cs202_1',
        classId: cs202.id,
        teacherId: teacher.id,
        teacherName: teacher.name,
        title: 'Problem Set 1: BST Traversals & Height Balancing',
        description: 'Implement recursive and iterative tree traversal algorithms. Upload your solution PDF document before the deadline.',
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
        allowReupload: false, // Teacher locked re-uploads
        totalPoints: 50,
        attachment: null,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      };
      assignmentList.push(assignment2);
    }

    this.data.assignments = assignmentList;

    // Seed Brian's submission for Assignment 1
    if (studentBrian) {
      const brianSubFile = 'sample_brian_cs101_submission.txt';
      const brianSubPath = path.join(UPLOADS_DIR, brianSubFile);
      if (!fs.existsSync(brianSubPath)) {
        fs.writeFileSync(brianSubPath, 'CS101 Assignment 1 Submission\nStudent: Brian Chen\n\nCompleted algorithms analysis, pseudo-code tables, and complexity comparisons.', 'utf-8');
      }

      this.data.submissions = [
        {
          id: 'sub_brian_1',
          assignmentId: assignment1.id,
          classId: cs101.id,
          studentId: studentBrian.id,
          studentName: studentBrian.name,
          studentEmail: studentBrian.email,
          originalName: 'Brian_Chen_CS101_Assign1.pdf',
          fileName: brianSubFile,
          fileSize: 185,
          mimeType: 'application/pdf',
          notes: 'Completed all sections including worst-case analysis graphs.',
          submittedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
        }
      ];
    } else {
      this.data.submissions = [];
    }
  }

  seedQuizzes() {
    const cs101 = this.data.classes.find(c => c.code === 'CS101') || this.data.classes[0];
    const teacher = this.data.users.find(u => u.role === 'teacher');
    const studentBrian = this.data.users.find(u => u.email === 'brian@college.edu');

    if (!cs101 || !teacher) return;

    const quiz1 = {
      id: 'qiz_cs101_1',
      classId: cs101.id,
      teacherId: teacher.id,
      teacherName: teacher.name,
      title: 'Midterm Quiz: Algorithms & Complexity Analysis',
      description: 'Scheduled academic quiz covering searching and sorting complexities, asymptotic notation, and algorithmic paradigms.',
      durationMinutes: 20,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      totalPoints: 30,
      questions: [
        {
          id: 'q_1',
          type: 'single',
          questionText: 'What is the tight worst-case time complexity of Binary Search on a sorted array of size n?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          correctAnswer: 1, // index of 'O(log n)'
          points: 5,
          explanation: 'Binary Search halves the search space at each comparison step, requiring at most log2(n) iterations.'
        },
        {
          id: 'q_2',
          type: 'multiple',
          questionText: 'Which of the following sorting algorithms have an average-case time complexity of O(n log n)? (Select all that apply)',
          options: ['Merge Sort', 'Heap Sort', 'Bubble Sort', 'Quick Sort'],
          correctAnswers: [0, 1, 3], // Merge Sort, Heap Sort, Quick Sort
          points: 10,
          explanation: 'Merge Sort, Heap Sort, and Quick Sort run in O(n log n) average time. Bubble Sort runs in O(n^2) average time.'
        },
        {
          id: 'q_3',
          type: 'paragraph',
          questionText: 'Explain why Merge Sort is preferred over Quick Sort when sorting Linked Lists, specifically addressing cache locality, random access, and auxiliary pointer manipulation.',
          points: 15,
          rubric: 'Expect discussion of sequential node traversal, lack of O(1) random access in linked lists, and O(1) extra space merge operations with node pointers.'
        }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.data.quizzes = [quiz1];

    // Seed Brian's attempt
    if (studentBrian) {
      this.data.quizAttempts = [
        {
          id: 'att_brian_1',
          quizId: quiz1.id,
          classId: cs101.id,
          studentId: studentBrian.id,
          studentName: studentBrian.name,
          studentEmail: studentBrian.email,
          answers: [
            {
              questionId: 'q_1',
              type: 'single',
              selectedOption: 1,
              isCorrect: true,
              pointsEarned: 5,
              autoGraded: true
            },
            {
              questionId: 'q_2',
              type: 'multiple',
              selectedOptions: [0, 1, 3],
              isCorrect: true,
              pointsEarned: 10,
              autoGraded: true
            },
            {
              questionId: 'q_3',
              type: 'paragraph',
              textAnswer: 'In a linked list, random access is O(n), so selecting middle elements or partitioning in QuickSort is inefficient. In Merge Sort, linked list merging only requires changing next pointers, so it requires O(1) auxiliary memory and sequentially traverses nodes efficiently without array reallocation.',
              pointsEarned: 14,
              teacherRemarks: 'Excellent analysis of sequential traversal and O(1) pointer-relinking memory efficiency.',
              gradedByTeacher: true
            }
          ],
          mcqScore: 15,
          paragraphScore: 14,
          totalScore: 29,
          maxScore: 30,
          isGraded: true,
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    } else {
      this.data.quizAttempts = [];
    }
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

  unenrollStudent(studentId, classId) {
    const index = this.data.enrollments.findIndex(
      e => e.studentId === studentId && e.classId === classId
    );
    if (index === -1) return null;
    const [removed] = this.data.enrollments.splice(index, 1);
    this.save();
    return removed;
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

  createNote({ classId, teacherId, title, originalName, fileName, fileSize, mimeType, fileUrl = '', cloudinaryId = '' }) {
    const note = {
      id: generateId('not'),
      classId,
      teacherId,
      title: title.trim(),
      originalName,
      fileName,
      fileUrl,
      cloudinaryId,
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

  // --- Assignment Operations ---
  getAssignmentsByClass(classId) {
    return (this.data.assignments || [])
      .filter(a => a.classId === classId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  findAssignmentById(id) {
    return (this.data.assignments || []).find(a => a.id === id);
  }

  createAssignment({ classId, teacherId, teacherName, title, description, dueDate, allowReupload = true, totalPoints = 100, attachment = null }) {
    const assignment = {
      id: generateId('asg'),
      classId,
      teacherId,
      teacherName,
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
      allowReupload: Boolean(allowReupload),
      totalPoints: Number(totalPoints) || 100,
      attachment,
      createdAt: new Date().toISOString()
    };
    this.data.assignments = this.data.assignments || [];
    this.data.assignments.push(assignment);
    this.save();
    return assignment;
  }

  updateAssignment(id, updates) {
    const assignment = this.findAssignmentById(id);
    if (!assignment) return null;
    if (updates.title !== undefined) assignment.title = updates.title.trim();
    if (updates.description !== undefined) assignment.description = updates.description.trim();
    if (updates.dueDate !== undefined) assignment.dueDate = new Date(updates.dueDate).toISOString();
    if (updates.allowReupload !== undefined) assignment.allowReupload = Boolean(updates.allowReupload);
    if (updates.totalPoints !== undefined) assignment.totalPoints = Number(updates.totalPoints);
    if (updates.attachment !== undefined) assignment.attachment = updates.attachment;
    this.save();
    return assignment;
  }

  toggleAssignmentReupload(id) {
    const assignment = this.findAssignmentById(id);
    if (!assignment) return null;
    assignment.allowReupload = !assignment.allowReupload;
    this.save();
    return assignment;
  }

  deleteAssignment(id) {
    const index = (this.data.assignments || []).findIndex(a => a.id === id);
    if (index === -1) return null;
    const [deleted] = this.data.assignments.splice(index, 1);

    // Delete assignment attachment file if exists
    if (deleted.attachment && deleted.attachment.fileName) {
      const filePath = path.join(UPLOADS_DIR, deleted.attachment.fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (err) { console.error('Error removing assignment file:', err); }
      }
    }

    // Delete all submissions associated with this assignment
    const remainingSubmissions = [];
    (this.data.submissions || []).forEach(sub => {
      if (sub.assignmentId === id) {
        if (sub.fileName) {
          const sPath = path.join(UPLOADS_DIR, sub.fileName);
          if (fs.existsSync(sPath)) {
            try { fs.unlinkSync(sPath); } catch (err) { console.error('Error removing submission file:', err); }
          }
        }
      } else {
        remainingSubmissions.push(sub);
      }
    });
    this.data.submissions = remainingSubmissions;

    this.save();
    return deleted;
  }

  // Full roster submission review for teachers: enrolled students, who submitted vs who did not
  getAssignmentRoster(assignmentId) {
    const assignment = this.findAssignmentById(assignmentId);
    if (!assignment) return null;

    const enrolledStudents = this.getEnrolledStudents(assignment.classId);
    const submissions = this.getSubmissionsByAssignment(assignmentId);
    const subMap = new Map();
    submissions.forEach(sub => subMap.set(sub.studentId, sub));

    const roster = enrolledStudents.map(student => {
      const sub = subMap.get(student.id);
      const hasSubmitted = !!sub;
      const isLate = hasSubmitted ? new Date(sub.submittedAt) > new Date(assignment.dueDate) : false;
      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        enrolledAt: student.enrolledAt,
        hasSubmitted,
        isLate,
        submission: sub ? {
          id: sub.id,
          originalName: sub.originalName,
          fileName: sub.fileName,
          fileUrl: sub.fileUrl || '',
          cloudinaryId: sub.cloudinaryId || '',
          fileSize: sub.fileSize,
          mimeType: sub.mimeType,
          notes: sub.notes,
          submittedAt: sub.submittedAt
        } : null
      };
    });

    const submittedCount = roster.filter(r => r.hasSubmitted).length;
    const pendingCount = roster.length - submittedCount;

    return {
      assignment,
      totalEnrolled: roster.length,
      submittedCount,
      pendingCount,
      roster
    };
  }

  // Student perspective: list of all assignments across enrolled classes with submission status
  getAssignmentsForStudent(studentId) {
    const enrolledClasses = this.getClassesForStudent(studentId);
    const classMap = new Map(enrolledClasses.map(c => [c.id, c]));
    const classIds = new Set(enrolledClasses.map(c => c.id));

    const allAssignments = (this.data.assignments || []).filter(a => classIds.has(a.classId));
    const now = new Date();

    return allAssignments.map(assignment => {
      const cls = classMap.get(assignment.classId);
      const sub = this.getSubmission(assignment.id, studentId);
      const hasSubmitted = !!sub;
      const dueDate = new Date(assignment.dueDate);
      const isExpired = now > dueDate;

      let status = 'pending';
      if (hasSubmitted) {
        status = 'submitted';
      } else if (isExpired) {
        status = 'overdue';
      }

      return {
        ...assignment,
        className: cls ? cls.name : 'Unknown Class',
        classCode: cls ? cls.code : '',
        status,
        hasSubmitted,
        isExpired,
        submission: sub || null
      };
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  // --- Quiz Operations ---
  getQuizzesByClass(classId) {
    return (this.data.quizzes || [])
      .filter(q => q.classId === classId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  findQuizById(id) {
    return (this.data.quizzes || []).find(q => q.id === id);
  }

  createQuiz({ classId, teacherId, teacherName, title, description, durationMinutes, startTime, endTime, questions = [] }) {
    const formattedQuestions = (questions || []).map((q, idx) => ({
      id: q.id || generateId('q'),
      type: q.type || 'single', // 'single' | 'multiple' | 'paragraph'
      questionText: (q.questionText || q.question || '').trim(),
      options: Array.isArray(q.options) ? q.options.map(opt => (typeof opt === 'object' ? String(opt.text || '').trim() : String(opt).trim())) : [],
      correctAnswer: q.type === 'single' ? Number(q.correctAnswer) : undefined,
      correctAnswers: q.type === 'multiple' ? (Array.isArray(q.correctAnswers) ? q.correctAnswers.map(Number) : []) : undefined,
      points: Number(q.points) || 1,
      explanation: (q.explanation || '').trim(),
      rubric: (q.rubric || '').trim()
    }));

    const totalPoints = formattedQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

    const quiz = {
      id: generateId('qiz'),
      classId,
      teacherId,
      teacherName,
      title: title.trim(),
      description: description.trim(),
      durationMinutes: Number(durationMinutes) || 0,
      startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalPoints,
      questions: formattedQuestions,
      createdAt: new Date().toISOString()
    };

    this.data.quizzes = this.data.quizzes || [];
    this.data.quizzes.push(quiz);
    this.save();
    return quiz;
  }

  updateQuiz(id, updates) {
    const quiz = this.findQuizById(id);
    if (!quiz) return null;

    let timingChanged = false;
    if (updates.startTime !== undefined && new Date(updates.startTime).toISOString() !== quiz.startTime) {
      quiz.startTime = new Date(updates.startTime).toISOString();
      timingChanged = true;
    }
    if (updates.endTime !== undefined && new Date(updates.endTime).toISOString() !== quiz.endTime) {
      quiz.endTime = new Date(updates.endTime).toISOString();
      timingChanged = true;
    }

    if (updates.title !== undefined) quiz.title = updates.title.trim();
    if (updates.description !== undefined) quiz.description = updates.description.trim();
    if (updates.durationMinutes !== undefined) {
      quiz.durationMinutes = Number(updates.durationMinutes) || 0;
    } else if (timingChanged) {
      const startMs = new Date(quiz.startTime).getTime();
      const endMs = new Date(quiz.endTime).getTime();
      quiz.durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
    }

    if (updates.questions !== undefined) {
      quiz.questions = updates.questions.map(q => ({
        id: q.id || generateId('q'),
        type: q.type || 'single',
        questionText: (q.questionText || q.question || '').trim(),
        options: Array.isArray(q.options) ? q.options.map(opt => (typeof opt === 'object' ? String(opt.text || '').trim() : String(opt).trim())) : [],
        correctAnswer: q.type === 'single' ? Number(q.correctAnswer) : undefined,
        correctAnswers: q.type === 'multiple' ? (Array.isArray(q.correctAnswers) ? q.correctAnswers.map(Number) : []) : undefined,
        points: Number(q.points) || 1,
        explanation: (q.explanation || '').trim(),
        rubric: (q.rubric || '').trim()
      }));
      quiz.totalPoints = quiz.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
    }

    if (timingChanged) {
      this.data.quizAttempts = (this.data.quizAttempts || []).filter(a => a.quizId !== id);
      quiz.rescheduledAt = new Date().toISOString();
    }

    this.save();
    return quiz;
  }

  deleteQuiz(id) {
    const index = (this.data.quizzes || []).findIndex(q => q.id === id);
    if (index === -1) return null;
    const [deleted] = this.data.quizzes.splice(index, 1);

    // Remove all associated quiz attempts
    this.data.quizAttempts = (this.data.quizAttempts || []).filter(a => a.quizId !== id);

    this.save();
    return deleted;
  }

  // --- Teacher Question Bank Operations ---
  getQuestionBankSections() {
    const defaults = ['DBMS', 'Operating Systems', 'Computer Networks', 'Java'];
    const custom = (this.data.questionBankSections || []);
    const fromQuestions = (this.getQuestionBank() || []).map(q => q.subject).filter(Boolean);
    const set = new Set([...defaults, ...custom, ...fromQuestions]);
    return Array.from(set);
  }

  addQuestionBankSection(name) {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    this.data.questionBankSections = this.data.questionBankSections || [];
    if (!this.data.questionBankSections.includes(trimmed)) {
      this.data.questionBankSections.push(trimmed);
      this.save();
    }
    if (this.isMongoConnected && this.models && this.models.QuestionBankSection) {
      this.models.QuestionBankSection.findOneAndUpdate(
        { name: trimmed },
        { $set: { name: trimmed } },
        { upsert: true }
      ).catch(e => console.error('[MongoDB Atlas] Error saving section:', e.message));
    }
    return trimmed;
  }

  getQuestionBank({ subject, type, search } = {}) {
    if (!this.questionBank) {
      if (fs.existsSync(QUESTION_BANK_FILE)) {
        try {
          this.questionBank = JSON.parse(fs.readFileSync(QUESTION_BANK_FILE, 'utf-8'));
        } catch (e) {
          console.error('Failed to load question bank:', e);
          this.questionBank = [];
        }
      } else {
        this.questionBank = [];
      }
    }

    let results = [...(this.questionBank || [])];
    if (subject && subject !== 'all') {
      results = results.filter(q => (q.subject || '').toLowerCase() === subject.toLowerCase());
    }
    if (type && type !== 'all') {
      results = results.filter(q => q.type === type);
    }
    if (search && search.trim()) {
      const qLower = search.trim().toLowerCase();
      results = results.filter(q =>
        (q.question || '').toLowerCase().includes(qLower) ||
        (q.topic && q.topic.toLowerCase().includes(qLower)) ||
        (q.options && q.options.some(opt => (typeof opt === 'string' ? opt : opt.text || '').toLowerCase().includes(qLower)))
      );
    }
    return results;
  }

  addQuestionToBank(qData) {
    if (!this.questionBank) {
      this.getQuestionBank();
    }

    const { subject, type, question, options, correctAnswer, correctAnswers, points, explanation, rubric } = qData;
    const qText = (qData.questionText || question || '').trim();
    const sub = (subject || 'General').trim();

    // Ensure section is registered
    this.addQuestionBankSection(sub);

    const newQ = {
      id: qData.id && qData.id.startsWith('qb_') ? qData.id : `qb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subject: sub,
      type: type || 'single',
      question: qText,
      options: type !== 'paragraph' 
        ? (options || []).map(opt => typeof opt === 'object' ? String(opt.text || '').trim() : String(opt).trim())
        : [],
      correctAnswer: type === 'single' ? (correctAnswer !== undefined && correctAnswer !== null ? Number(correctAnswer) : null) : null,
      correctAnswers: type === 'multiple' ? (Array.isArray(correctAnswers) ? correctAnswers.map(Number) : []) : [],
      points: Number(points) || (type === 'paragraph' ? 10 : 5),
      explanation: (explanation || '').trim(),
      rubric: (rubric || '').trim()
    };

    // Check if duplicate question exists
    const existsIndex = this.questionBank.findIndex(q => 
      q.id === newQ.id || 
      (q.subject.toLowerCase() === newQ.subject.toLowerCase() && q.question.toLowerCase() === newQ.question.toLowerCase())
    );

    if (existsIndex === -1) {
      this.questionBank.unshift(newQ);
    } else {
      this.questionBank[existsIndex] = newQ;
    }

    // Save to question_bank.json
    try {
      fs.writeFileSync(QUESTION_BANK_FILE, JSON.stringify(this.questionBank, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write question_bank.json:', err);
    }

    // If MongoDB Atlas is connected, save directly to Atlas
    if (this.isMongoConnected && this.models && this.models.QuestionBank) {
      this.models.QuestionBank.findOneAndUpdate(
        { id: newQ.id },
        { $set: newQ },
        { upsert: true }
      ).catch(err => console.error('[MongoDB Atlas] Error saving question to bank:', err.message));
    }

    return newQ;
  }



  // --- Submission Operations ---
  getSubmissionsByAssignment(assignmentId) {
    return (this.data.submissions || [])
      .filter(s => s.assignmentId === assignmentId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  getSubmission(assignmentId, studentId) {
    return (this.data.submissions || []).find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
  }

  findSubmissionById(id) {
    return (this.data.submissions || []).find(s => s.id === id);
  }

  createSubmission({ assignmentId, classId, studentId, studentName, studentEmail, originalName, fileName, fileSize, mimeType, notes = '', fileUrl = '', cloudinaryId = '' }) {
    this.data.submissions = this.data.submissions || [];
    
    // If student already has a submission, remove previous file and record
    const existingIndex = this.data.submissions.findIndex(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (existingIndex !== -1) {
      const oldSub = this.data.submissions[existingIndex];
      if (oldSub.fileName && oldSub.fileName !== fileName) {
        const oldPath = path.join(UPLOADS_DIR, oldSub.fileName);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (err) { console.error('Error removing old submission:', err); }
        }
      }
      this.data.submissions.splice(existingIndex, 1);
    }

    const submission = {
      id: generateId('sub'),
      assignmentId,
      classId,
      studentId,
      studentName,
      studentEmail,
      originalName,
      fileName,
      fileUrl,
      cloudinaryId,
      fileSize,
      mimeType,
      notes: (notes || '').trim(),
      submittedAt: new Date().toISOString()
    };
    this.data.submissions.push(submission);
    this.save();
    return submission;
  }

  deleteSubmission(assignmentId, studentId) {
    this.data.submissions = this.data.submissions || [];
    const index = this.data.submissions.findIndex(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (index === -1) return null;
    const [deleted] = this.data.submissions.splice(index, 1);

    if (deleted.fileName) {
      const sPath = path.join(UPLOADS_DIR, deleted.fileName);
      if (fs.existsSync(sPath)) {
        try { fs.unlinkSync(sPath); } catch (err) { console.error('Error removing submission file:', err); }
      }
    }
    this.save();
    return deleted;
  }

  // --- Teacher Question Bank Operations ---
  getQuestionBankSections() {
    const defaults = ['DBMS', 'Operating Systems', 'Computer Networks', 'Java'];
    const custom = (this.data.questionBankSections || []);
    const fromQuestions = (this.getQuestionBank() || []).map(q => q.subject).filter(Boolean);
    const set = new Set([...defaults, ...custom, ...fromQuestions]);
    return Array.from(set);
  }

  addQuestionBankSection(name) {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    this.data.questionBankSections = this.data.questionBankSections || [];
    if (!this.data.questionBankSections.includes(trimmed)) {
      this.data.questionBankSections.push(trimmed);
      this.save();
    }
    if (this.isMongoConnected && this.models && this.models.QuestionBankSection) {
      this.models.QuestionBankSection.findOneAndUpdate(
        { name: trimmed },
        { $set: { name: trimmed } },
        { upsert: true }
      ).catch(e => console.error('[MongoDB Atlas] Error saving section:', e.message));
    }
    return trimmed;
  }

  getQuestionBank({ subject, type, search } = {}) {
    if (!this.questionBank) {
      if (fs.existsSync(QUESTION_BANK_FILE)) {
        try {
          this.questionBank = JSON.parse(fs.readFileSync(QUESTION_BANK_FILE, 'utf-8'));
        } catch (e) {
          console.error('Failed to load question bank:', e);
          this.questionBank = [];
        }
      } else {
        this.questionBank = [];
      }
    }

    let results = [...(this.questionBank || [])];
    if (subject && subject !== 'all') {
      results = results.filter(q => (q.subject || '').toLowerCase() === subject.toLowerCase());
    }
    if (type && type !== 'all') {
      results = results.filter(q => q.type === type);
    }
    if (search && search.trim()) {
      const qLower = search.trim().toLowerCase();
      results = results.filter(q =>
        (q.question || '').toLowerCase().includes(qLower) ||
        (q.topic && q.topic.toLowerCase().includes(qLower)) ||
        (q.options && q.options.some(opt => (typeof opt === 'string' ? opt : opt.text || '').toLowerCase().includes(qLower)))
      );
    }
    return results;
  }

  // --- Quiz Attempt Operations ---
  getQuizAttempts(quizId) {
    return (this.data.quizAttempts || [])
      .filter(a => a.quizId === quizId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  getQuizAttempt(quizId, studentId) {
    return (this.data.quizAttempts || []).find(
      a => a.quizId === quizId && a.studentId === studentId
    );
  }

  findQuizAttemptById(id) {
    return (this.data.quizAttempts || []).find(a => a.id === id);
  }

  // Automatically grade MCQ questions and create attempt
  submitQuizAttempt(arg1, arg2, arg3, arg4, arg5) {
    let quizId, classId, studentId, studentName, studentEmail, answers;
    if (typeof arg1 === 'object' && arg1 !== null) {
      quizId = arg1.quizId;
      classId = arg1.classId;
      studentId = arg1.studentId;
      studentName = arg1.studentName;
      studentEmail = arg1.studentEmail;
      answers = arg1.answers || [];
    } else {
      quizId = arg1;
      studentId = arg2;
      studentName = arg3;
      studentEmail = arg4;
      answers = arg5 || [];
    }

    const quiz = this.findQuizById(quizId);
    if (!quiz) return null;
    classId = classId || quiz.classId;

    this.data.quizAttempts = this.data.quizAttempts || [];
    const existingIndex = this.data.quizAttempts.findIndex(
      a => a.quizId === quizId && a.studentId === studentId
    );
    if (existingIndex !== -1) {
      throw new Error('You have already submitted an attempt for this quiz.');
    }

    const qMap = new Map((quiz.questions || []).map(q => [q.id, q]));
    let mcqScore = 0;
    let hasParagraph = false;

    const evaluatedAnswers = (quiz.questions || []).map(q => {
      const studentAns = (answers || []).find(a => a.questionId === q.id) || {};

      if (q.type === 'single') {
        const isCorrect = Number(studentAns.selectedOption) === Number(q.correctAnswer);
        const pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
        mcqScore += pointsEarned;
        return {
          questionId: q.id,
          type: 'single',
          selectedOption: studentAns.selectedOption !== undefined ? Number(studentAns.selectedOption) : null,
          isCorrect,
          pointsEarned,
          autoGraded: true
        };
      } else if (q.type === 'multiple') {
        const studentSelected = Array.isArray(studentAns.selectedOptions)
          ? studentAns.selectedOptions.map(Number).sort((a, b) => a - b)
          : [];
        const correctSelected = Array.isArray(q.correctAnswers)
          ? q.correctAnswers.map(Number).sort((a, b) => a - b)
          : [];

        const isCorrect = studentSelected.length === correctSelected.length &&
          studentSelected.every((val, idx) => val === correctSelected[idx]);
        const pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
        mcqScore += pointsEarned;
        return {
          questionId: q.id,
          type: 'multiple',
          selectedOptions: studentSelected,
          isCorrect,
          pointsEarned,
          autoGraded: true
        };
      } else if (q.type === 'paragraph') {
        hasParagraph = true;
        const textVal = (studentAns.answerText || studentAns.textAnswer || '').trim();
        return {
          questionId: q.id,
          type: 'paragraph',
          answerText: textVal,
          textAnswer: textVal,
          pointsEarned: 0, // Pending teacher grading
          teacherRemarks: '',
          gradedByTeacher: false
        };
      }
    });

    const attempt = {
      id: generateId('att'),
      quizId,
      classId,
      studentId,
      studentName,
      studentEmail,
      answers: evaluatedAnswers,
      mcqScore,
      paragraphScore: 0,
      totalScore: mcqScore,
      maxScore: quiz.totalPoints,
      isGraded: !hasParagraph, // If no paragraph questions, it is fully graded immediately!
      submittedAt: new Date().toISOString()
    };

    this.data.quizAttempts.push(attempt);
    this.save();
    return attempt;
  }

  // Update quiz questions/correct options and immediately re-evaluate marks for all student attempts
  updateQuizAnswerKey(quizId, updatedQuestions = []) {
    const quiz = this.findQuizById(quizId);
    if (!quiz) return null;

    const updateMap = new Map();
    (updatedQuestions || []).forEach(uq => {
      if (uq && uq.id) {
        updateMap.set(uq.id, uq);
      }
    });

    // Update questions in the quiz
    quiz.questions = (quiz.questions || []).map(q => {
      const uq = updateMap.get(q.id);
      if (!uq) return q;

      const updated = { ...q };
      if (q.type === 'single') {
        if (uq.correctAnswer !== undefined && uq.correctAnswer !== null) {
          updated.correctAnswer = Number(uq.correctAnswer);
        }
      } else if (q.type === 'multiple') {
        if (Array.isArray(uq.correctAnswers)) {
          updated.correctAnswers = uq.correctAnswers.map(Number).sort((a, b) => a - b);
        }
      }
      if (uq.points !== undefined && !isNaN(Number(uq.points))) {
        updated.points = Number(uq.points);
      }
      if (uq.explanation !== undefined) {
        updated.explanation = uq.explanation;
      }
      return updated;
    });

    // Update total quiz points
    quiz.totalPoints = (quiz.questions || []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);

    // Re-grade all existing student attempts for this quiz
    const attempts = this.getQuizAttempts(quizId);
    const qMap = new Map((quiz.questions || []).map(q => [q.id, q]));

    attempts.forEach(attempt => {
      let mcqScore = 0;
      (attempt.answers || []).forEach(ans => {
        const q = qMap.get(ans.questionId);
        if (!q) return;

        if (q.type === 'single') {
          const isCorrect = ans.selectedOption !== null && ans.selectedOption !== undefined &&
            Number(ans.selectedOption) === Number(q.correctAnswer);
          const pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
          ans.isCorrect = isCorrect;
          ans.pointsEarned = pointsEarned;
          ans.autoGraded = true;
          mcqScore += pointsEarned;
        } else if (q.type === 'multiple') {
          const studentSelected = Array.isArray(ans.selectedOptions)
            ? ans.selectedOptions.map(Number).sort((a, b) => a - b)
            : [];
          const correctSelected = Array.isArray(q.correctAnswers)
            ? q.correctAnswers.map(Number).sort((a, b) => a - b)
            : [];
          const isCorrect = studentSelected.length > 0 &&
            studentSelected.length === correctSelected.length &&
            studentSelected.every((val, idx) => val === correctSelected[idx]);
          const pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
          ans.isCorrect = isCorrect;
          ans.pointsEarned = pointsEarned;
          ans.autoGraded = true;
          mcqScore += pointsEarned;
        }
      });

      const paragraphScore = (attempt.answers || [])
        .filter(a => a.type === 'paragraph')
        .reduce((sum, a) => sum + (Number(a.pointsEarned) || 0), 0);

      attempt.mcqScore = mcqScore;
      attempt.paragraphScore = paragraphScore;
      attempt.totalScore = mcqScore + paragraphScore;
      attempt.maxScore = quiz.totalPoints;
    });

    this.save();
    return {
      quiz,
      affectedAttemptsCount: attempts.length
    };
  }

  // Teacher grades paragraph answers, allots marks and provides remarks
  gradeParagraphAnswers(attemptId, teacherId, grades = []) {
    const attempt = this.findQuizAttemptById(attemptId);
    if (!attempt) return null;
    const quiz = this.findQuizById(attempt.quizId);
    if (!quiz) return null;

    const qMap = new Map((quiz.questions || []).map(q => [q.id, q]));

    (grades || []).forEach(g => {
      const ans = attempt.answers.find(a => a.questionId === g.questionId);
      const question = qMap.get(g.questionId);
      if (ans && question && question.type === 'paragraph') {
        const maxPts = Number(question.points) || 0;
        const awarded = Math.min(maxPts, Math.max(0, Number(g.pointsEarned) || 0));
        ans.pointsEarned = awarded;
        ans.teacherRemarks = (g.teacherRemarks || '').trim();
        ans.gradedByTeacher = true;
      }
    });

    // Recalculate scores
    const mcqScore = attempt.answers
      .filter(a => a.type === 'single' || a.type === 'multiple')
      .reduce((sum, a) => sum + (Number(a.pointsEarned) || 0), 0);
    const paragraphScore = attempt.answers
      .filter(a => a.type === 'paragraph')
      .reduce((sum, a) => sum + (Number(a.pointsEarned) || 0), 0);

    attempt.mcqScore = mcqScore;
    attempt.paragraphScore = paragraphScore;
    attempt.totalScore = mcqScore + paragraphScore;
    attempt.isGraded = true;

    this.save();
    return attempt;
  }

  // Overall summary & statistical analytics of a quiz
  getQuizAnalytics(quizId) {
    const quiz = this.findQuizById(quizId);
    if (!quiz) return null;

    const enrolledStudents = this.getEnrolledStudents(quiz.classId);
    const attempts = this.getQuizAttempts(quizId);
    const totalEnrolled = enrolledStudents.length;
    const totalAttempted = attempts.length;

    let highestScore = 0;
    let lowestScore = 0;
    let averageScore = 0;
    let medianScore = 0;
    let topScorers = [];

    if (totalAttempted > 0) {
      const scores = attempts.map(a => Number(a.totalScore) || 0).sort((a, b) => a - b);
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
      const totalScoreSum = scores.reduce((sum, s) => sum + s, 0);
      averageScore = parseFloat((totalScoreSum / totalAttempted).toFixed(1));

      const mid = Math.floor(scores.length / 2);
      medianScore = scores.length % 2 !== 0
        ? scores[mid]
        : parseFloat(((scores[mid - 1] + scores[mid]) / 2).toFixed(1));

      topScorers = attempts
        .filter(a => Number(a.totalScore) === highestScore)
        .map(a => ({
          studentId: a.studentId,
          studentName: a.studentName,
          score: a.totalScore,
          maxScore: a.maxScore
        }));
    }

    const attMap = new Map(attempts.map(a => [a.studentId, a]));
    const rosterStatus = enrolledStudents.map(student => {
      const att = attMap.get(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        hasAttempted: !!att,
        attempt: att ? {
          id: att.id,
          mcqScore: att.mcqScore,
          paragraphScore: att.paragraphScore,
          totalScore: att.totalScore,
          maxScore: att.maxScore,
          isGraded: att.isGraded,
          submittedAt: att.submittedAt
        } : null
      };
    });

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalPoints: quiz.totalPoints,
        durationMinutes: quiz.durationMinutes,
        startTime: quiz.startTime,
        endTime: quiz.endTime
      },
      totalEnrolled,
      totalAttempted,
      pendingAttempts: Math.max(0, totalEnrolled - totalAttempted),
      attemptRate: totalEnrolled > 0 ? Math.round((totalAttempted / totalEnrolled) * 100) : 0,
      highestScore,
      lowestScore,
      averageScore,
      medianScore,
      topScorers,
      rosterStatus
    };
  }

  // Student perspective: list quizzes across enrolled courses with attempt status
  getQuizzesForStudent(studentId) {
    const enrolledClasses = this.getClassesForStudent(studentId);
    const classMap = new Map(enrolledClasses.map(c => [c.id, c]));
    const classIds = new Set(enrolledClasses.map(c => c.id));

    const allQuizzes = (this.data.quizzes || []).filter(q => classIds.has(q.classId));
    const now = new Date();

    return allQuizzes.map(quiz => {
      const cls = classMap.get(quiz.classId);
      const attempt = this.getQuizAttempt(quiz.id, studentId);
      const hasAttempted = !!attempt;
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(quiz.endTime);

      const isUpcoming = now < startTime;
      const isExpired = now > endTime;

      let status = 'pending';
      if (hasAttempted) {
        status = 'attempted';
      } else if (isExpired) {
        status = 'overdue';
      } else if (isUpcoming) {
        status = 'upcoming';
      }

      return {
        id: quiz.id,
        classId: quiz.classId,
        className: cls ? cls.name : 'Unknown Class',
        classCode: cls ? cls.code : '',
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        totalPoints: quiz.totalPoints,
        questionCount: (quiz.questions || []).length,
        status,
        hasAttempted,
        isExpired,
        isUpcoming,
        attempt: attempt ? {
          id: attempt.id,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          mcqScore: attempt.mcqScore,
          paragraphScore: attempt.paragraphScore,
          isGraded: attempt.isGraded,
          submittedAt: attempt.submittedAt
        } : null
      };
    }).sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
  }
}

const db = new Database();

module.exports = {
  db,
  UPLOADS_DIR
};
