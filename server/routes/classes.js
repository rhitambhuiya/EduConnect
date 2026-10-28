const express = require('express');
const multer = require('multer');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Multer storage for note uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// GET /api/classes - Browse available classes on the platform
// Used by students to see all offerings and whether they are enrolled
router.get('/', authenticate, (req, res) => {
  const allClasses = db.getClasses();
  const result = allClasses.map(cls => {
    const enrollmentCount = db.getEnrollmentCount(cls.id);
    const isEnrolled = req.user.role === 'student' ? db.isEnrolled(req.user.id, cls.id) : false;
    return {
      ...cls,
      enrollmentCount,
      isEnrolled
    };
  });
  return res.json(result);
});

// GET /api/classes/my - Get classes relevant to current user
// If teacher: classes created by them
// If student: classes they are enrolled in
router.get('/my', authenticate, (req, res) => {
  if (req.user.role === 'teacher') {
    const teacherClasses = db.getClassesByTeacher(req.user.id);
    const result = teacherClasses.map(cls => ({
      ...cls,
      enrollmentCount: db.getEnrollmentCount(cls.id)
    }));
    return res.json(result);
  } else if (req.user.role === 'student') {
    const studentClasses = db.getClassesForStudent(req.user.id);
    const result = studentClasses.map(cls => ({
      ...cls,
      enrollmentCount: db.getEnrollmentCount(cls.id),
      isEnrolled: true
    }));
    return res.json(result);
  }
  return res.status(403).json({ error: 'Invalid user role' });
});

// POST /api/classes - Teacher creates a new class
router.post('/', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code || !description) {
      return res.status(400).json({ error: 'Class name, code, and description are all required.' });
    }

    const newClass = db.createClass({
      name,
      code,
      description,
      teacherId: req.user.id,
      teacherName: req.user.name
    });

    return res.status(201).json({
      message: 'Class created successfully',
      class: {
        ...newClass,
        enrollmentCount: 0
      }
    });
  } catch (err) {
    console.error('Error creating class:', err);
    return res.status(500).json({ error: 'Failed to create class' });
  }
});

// GET /api/classes/:id - Get details of a single class
router.get('/:id', authenticate, (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const enrollmentCount = db.getEnrollmentCount(cls.id);
  const isEnrolled = req.user.role === 'student' ? db.isEnrolled(req.user.id, cls.id) : false;
  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;

  // Enforce role-based access:
  // Teachers can only access classes they created
  if (req.user.role === 'teacher' && !isOwner) {
    return res.status(403).json({ error: 'You do not have permission to view classes created by other teachers.' });
  }

  // Students must be enrolled to view full class details (or they can browse in the available classes list)
  if (req.user.role === 'student' && !isEnrolled) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }

  return res.json({
    ...cls,
    enrollmentCount,
    isEnrolled,
    isOwner
  });
});

// POST /api/classes/:id/enroll - Student enrolls in class
router.post('/:id/enroll', authenticate, requireRole('student'), (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  if (db.isEnrolled(req.user.id, cls.id)) {
    return res.status(400).json({ error: 'You are already enrolled in this class.' });
  }

  const enrollment = db.enrollStudent(req.user.id, cls.id);
  if (!enrollment) {
    return res.status(400).json({ error: 'Could not enroll in this class.' });
  }

  return res.status(201).json({
    message: 'Successfully enrolled in class',
    enrollment,
    class: {
      ...cls,
      enrollmentCount: db.getEnrollmentCount(cls.id),
      isEnrolled: true
    }
  });
});

// GET /api/classes/:id/students - Teacher views enrolled students
router.get('/:id/students', authenticate, requireRole('teacher'), (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  if (cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only view students enrolled in your own classes.' });
  }

  const students = db.getEnrolledStudents(cls.id);
  return res.json(students);
});

// DELETE /api/classes/:id/students/:studentId - Teacher derolls an enrolled student
router.delete('/:id/students/:studentId', authenticate, requireRole('teacher'), (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  // Only the teacher who created the class can deroll students
  if (cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only manage enrollments for classes you created.' });
  }

  const { studentId } = req.params;
  if (!db.isEnrolled(studentId, cls.id)) {
    return res.status(404).json({ error: 'Student is not enrolled in this class.' });
  }

  const removed = db.unenrollStudent(studentId, cls.id);
  if (!removed) {
    return res.status(500).json({ error: 'Failed to deroll student from class.' });
  }

  return res.json({
    message: 'Student has been successfully derolled from the class.',
    studentId,
    classId: cls.id,
    enrollmentCount: db.getEnrollmentCount(cls.id)
  });
});

// GET /api/classes/:id/notes - View notes
router.get('/:id/notes', authenticate, (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  // Permissions: Teacher owner or enrolled student
  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You must be enrolled in this class to access study notes.' });
  }

  const notes = db.getNotesByClass(cls.id);
  return res.json(notes);
});

// POST /api/classes/:id/notes - Teacher uploads notes
router.post('/:id/notes', authenticate, requireRole('teacher'), upload.single('file'), (req, res) => {
  try {
    const cls = db.findClassById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only upload notes to classes you created.' });
    }

    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A file attachment is required.' });
    }

    const note = db.createNote({
      classId: cls.id,
      teacherId: req.user.id,
      title: title.trim(),
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    return res.status(201).json({
      message: 'Note uploaded successfully',
      note
    });
  } catch (err) {
    console.error('Error uploading note:', err);
    return res.status(500).json({ error: 'Failed to upload note' });
  }
});

// GET /api/classes/:id/announcements - View announcements
router.get('/:id/announcements', authenticate, (req, res) => {
  const cls = db.findClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You must be enrolled in this class to view announcements.' });
  }

  const announcements = db.getAnnouncementsByClass(cls.id);
  return res.json(announcements);
});

// POST /api/classes/:id/announcements - Teacher posts announcement
router.post('/:id/announcements', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const cls = db.findClassById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create announcements for classes you created.' });
    }

    const { title, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Title and content are required for an announcement.' });
    }

    const announcement = db.createAnnouncement({
      classId: cls.id,
      teacherId: req.user.id,
      teacherName: req.user.name,
      title,
      content
    });

    return res.status(201).json({
      message: 'Announcement posted successfully',
      announcement
    });
  } catch (err) {
    console.error('Error creating announcement:', err);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
});

module.exports = router;
