const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, UPLOADS_DIR } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Cloudinary integration for assignment documents & student PDF submissions
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// GET /api/assignments/my-pending - Student views pending assignments across all classes
router.get('/my-pending', authenticate, requireRole('student'), (req, res) => {
  const allStudentAssignments = db.getAssignmentsForStudent(req.user.id);
  const pending = allStudentAssignments.filter(a => a.status === 'pending');
  return res.json(pending);
});

// GET /api/assignments/my-all - Student views all assignments across all enrolled classes
router.get('/my-all', authenticate, requireRole('student'), (req, res) => {
  const allStudentAssignments = db.getAssignmentsForStudent(req.user.id);
  return res.json(allStudentAssignments);
});

// GET /api/assignments/class/:classId - View all assignments for a class
router.get('/class/:classId', authenticate, (req, res) => {
  const cls = db.findClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You are not authorized to view assignments for this class.' });
  }

  const assignments = db.getAssignmentsByClass(cls.id);
  const now = new Date();

  if (isOwner) {
    // Teacher view: include submission count metrics
    const totalEnrolled = db.getEnrollmentCount(cls.id);
    const result = assignments.map(a => {
      const submissions = db.getSubmissionsByAssignment(a.id);
      const isExpired = now > new Date(a.dueDate);
      return {
        ...a,
        totalEnrolled,
        submittedCount: submissions.length,
        pendingCount: Math.max(0, totalEnrolled - submissions.length),
        isExpired
      };
    });
    return res.json(result);
  } else {
    // Student view: include individual submission status
    const result = assignments.map(a => {
      const sub = db.getSubmission(a.id, req.user.id);
      const hasSubmitted = !!sub;
      const isExpired = now > new Date(a.dueDate);
      let status = 'pending';
      if (hasSubmitted) {
        status = 'submitted';
      } else if (isExpired) {
        status = 'overdue';
      }

      return {
        ...a,
        className: cls.name,
        classCode: cls.code,
        status,
        hasSubmitted,
        isExpired,
        submission: sub || null
      };
    });
    return res.json(result);
  }
});

// GET /api/assignments/:id - Single assignment detail
router.get('/:id', authenticate, (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Associated class not found' });
  }

  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You are not authorized to view this assignment.' });
  }

  const now = new Date();
  const isExpired = now > new Date(assignment.dueDate);

  if (isOwner) {
    const totalEnrolled = db.getEnrollmentCount(cls.id);
    const submissions = db.getSubmissionsByAssignment(assignment.id);
    return res.json({
      ...assignment,
      className: cls.name,
      classCode: cls.code,
      totalEnrolled,
      submittedCount: submissions.length,
      pendingCount: Math.max(0, totalEnrolled - submissions.length),
      isExpired
    });
  } else {
    const sub = db.getSubmission(assignment.id, req.user.id);
    const hasSubmitted = !!sub;
    let status = 'pending';
    if (hasSubmitted) {
      status = 'submitted';
    } else if (isExpired) {
      status = 'overdue';
    }

    return res.json({
      ...assignment,
      className: cls.name,
      classCode: cls.code,
      status,
      hasSubmitted,
      isExpired,
      submission: sub || null
    });
  }
});

// POST /api/assignments/class/:classId - Teacher creates assignment with optional prompt attachment
router.post('/class/:classId', authenticate, requireRole('teacher'), upload.single('file'), async (req, res) => {
  try {
    const cls = db.findClassById(req.params.classId);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only create assignments for classes you created.' });
    }

    const { title, description, dueDate, allowReupload, totalPoints } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Assignment instructions/description are required.' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'A deadline date and time is required.' });
    }

    const parsedDue = new Date(dueDate);
    if (isNaN(parsedDue.getTime())) {
      return res.status(400).json({ error: 'Invalid deadline date format.' });
    }

    let attachment = null;
    if (req.file) {
      const cloudFile = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'college_portal/assignments');
      attachment = {
        originalName: req.file.originalname,
        fileName: cloudFile.fileName,
        fileUrl: cloudFile.fileUrl,
        cloudinaryId: cloudFile.cloudinaryId,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    const assignment = db.createAssignment({
      classId: cls.id,
      teacherId: req.user.id,
      teacherName: req.user.name,
      title: title.trim(),
      description: description.trim(),
      dueDate: parsedDue.toISOString(),
      allowReupload: allowReupload === 'false' || allowReupload === false ? false : true,
      totalPoints: totalPoints ? Number(totalPoints) : 100,
      attachment
    });

    return res.status(201).json({
      message: 'Assignment published successfully',
      assignment
    });
  } catch (err) {
    console.error('Error creating assignment:', err);
    return res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PUT /api/assignments/:id - Teacher edits assignment details
router.put('/:id', authenticate, requireRole('teacher'), (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls || cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit assignments you created.' });
  }

  const { title, description, dueDate, allowReupload, totalPoints } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (allowReupload !== undefined) updates.allowReupload = allowReupload;
  if (totalPoints !== undefined) updates.totalPoints = totalPoints;

  const updated = db.updateAssignment(assignment.id, updates);
  return res.json({
    message: 'Assignment updated successfully',
    assignment: updated
  });
});

// PATCH /api/assignments/:id/toggle-reupload - Teacher toggles re-upload permission
router.patch('/:id/toggle-reupload', authenticate, requireRole('teacher'), (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls || cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only modify assignments you created.' });
  }

  const updated = db.toggleAssignmentReupload(assignment.id);
  return res.json({
    message: `Re-uploading is now ${updated.allowReupload ? 'allowed' : 'locked'} for this assignment.`,
    assignment: updated
  });
});

// DELETE /api/assignments/:id - Teacher deletes assignment
router.delete('/:id', authenticate, requireRole('teacher'), (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls || cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete assignments you created.' });
  }

  const deleted = db.deleteAssignment(assignment.id);
  return res.json({
    message: 'Assignment deleted successfully',
    assignmentId: assignment.id
  });
});

// GET /api/assignments/:id/submissions - Teacher views who submitted and who did not
router.get('/:id/submissions', authenticate, requireRole('teacher'), (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls || cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only view submissions for your own courses.' });
  }

  const report = db.getAssignmentRoster(assignment.id);
  return res.json(report);
});

// POST /api/assignments/:id/submit - Student uploads assignment submission (e.g. PDF)
router.post('/:id/submit', authenticate, requireRole('student'), upload.single('file'), async (req, res) => {
  try {
    const assignment = db.findAssignmentById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const cls = db.findClassById(assignment.classId);
    if (!cls || !db.isEnrolled(req.user.id, cls.id)) {
      return res.status(403).json({ error: 'You must be enrolled in this class to submit this assignment.' });
    }

    // Check Timeline / Deadline
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (now > dueDate) {
      return res.status(400).json({
        error: 'The submission deadline has passed. Submissions are no longer accepted for this assignment.'
      });
    }

    // Check if student already submitted and if re-upload is disallowed
    const existingSubmission = db.getSubmission(assignment.id, req.user.id);
    if (existingSubmission && !assignment.allowReupload) {
      return res.status(403).json({
        error: 'You have already submitted this assignment, and the instructor has disabled re-uploading.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A submission file (such as a PDF or document) is required.' });
    }

    const { notes } = req.body;

    // Stream submission PDF directly to Cloudinary (or local fallback)
    const cloudFile = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'college_portal/submissions');

    // If re-uploading, cleanup previous submission from Cloudinary
    if (existingSubmission && existingSubmission.cloudinaryId) {
      deleteFromCloudinary(existingSubmission.cloudinaryId);
    }

    const submission = db.createSubmission({
      assignmentId: assignment.id,
      classId: cls.id,
      studentId: req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      originalName: req.file.originalname,
      fileName: cloudFile.fileName,
      fileUrl: cloudFile.fileUrl,
      cloudinaryId: cloudFile.cloudinaryId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      notes: notes || ''
    });

    return res.status(201).json({
      message: 'Assignment submitted successfully!',
      submission
    });
  } catch (err) {
    console.error('Error submitting assignment:', err);
    return res.status(500).json({ error: 'Failed to process assignment submission' });
  }
});

// DELETE /api/assignments/:id/submission - Student deletes submission to re-upload
router.delete('/:id/submission', authenticate, requireRole('student'), (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls || !db.isEnrolled(req.user.id, cls.id)) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }

  const existingSubmission = db.getSubmission(assignment.id, req.user.id);
  if (!existingSubmission) {
    return res.status(404).json({ error: 'No active submission found to delete.' });
  }

  // Check if teacher allowed re-upload
  if (!assignment.allowReupload) {
    return res.status(403).json({
      error: 'The instructor has locked submissions for this assignment. Re-uploading is not permitted.'
    });
  }

  // Check if timeline expired
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  if (now > dueDate) {
    return res.status(400).json({
      error: 'The submission deadline has passed. Submissions cannot be removed or replaced.'
    });
  }

  const deleted = db.deleteSubmission(assignment.id, req.user.id);
  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete submission' });
  }

  return res.json({
    message: 'Submission removed successfully. You can now submit a new version.',
    assignmentId: assignment.id
  });
});

// GET /api/assignments/:id/attachment/download - Download teacher reference file
router.get('/:id/attachment/download', authenticate, (req, res) => {
  const assignment = db.findAssignmentById(req.params.id);
  if (!assignment || !assignment.attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  const cls = db.findClassById(assignment.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You are not authorized to download this file.' });
  }

  // 1. Direct Cloudinary / CDN URL
  if (assignment.attachment.fileUrl && assignment.attachment.fileUrl.startsWith('http')) {
    return res.redirect(assignment.attachment.fileUrl);
  }

  // 2. Local disk file if present
  const filePath = path.join(UPLOADS_DIR, assignment.attachment.fileName);
  if (fs.existsSync(filePath)) {
    if (req.query.view === 'inline') {
      res.setHeader('Content-Type', assignment.attachment.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(assignment.attachment.originalName)}"`);
      return res.sendFile(filePath);
    }
    return res.download(filePath, assignment.attachment.originalName);
  }

  // 3. Fallback to Cloudinary URL if uploaded to cloud
  if (process.env.CLOUDINARY_CLOUD_NAME && assignment.attachment.fileName) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudUrl = assignment.attachment.cloudinaryId 
      ? `https://res.cloudinary.com/${cloudName}/raw/upload/${assignment.attachment.cloudinaryId}`
      : `https://res.cloudinary.com/${cloudName}/raw/upload/college_portal/assignments/${assignment.attachment.fileName}`;
    return res.redirect(cloudUrl);
  }

  return res.status(404).json({ error: 'File was not found on server disk or cloud storage.' });
});

// GET /api/assignments/submissions/:submissionId/download - Download student submission file
router.get('/submissions/:submissionId/download', authenticate, (req, res) => {
  const submission = db.findSubmissionById(req.params.submissionId);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const cls = db.findClassById(submission.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const isTeacherOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isStudentOwner = req.user.role === 'student' && submission.studentId === req.user.id;

  if (!isTeacherOwner && !isStudentOwner) {
    return res.status(403).json({ error: 'You are not authorized to access this submission file.' });
  }

  // 1. Direct Cloudinary / CDN URL
  if (submission.fileUrl && submission.fileUrl.startsWith('http')) {
    return res.redirect(submission.fileUrl);
  }

  // 2. Local disk file if present
  const filePath = path.join(UPLOADS_DIR, submission.fileName);
  if (fs.existsSync(filePath)) {
    if (req.query.view === 'inline') {
      res.setHeader('Content-Type', submission.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(submission.originalName)}"`);
      return res.sendFile(filePath);
    }
    return res.download(filePath, submission.originalName);
  }

  // 3. Fallback to Cloudinary URL if uploaded to cloud
  if (process.env.CLOUDINARY_CLOUD_NAME && submission.fileName) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudUrl = submission.cloudinaryId 
      ? `https://res.cloudinary.com/${cloudName}/raw/upload/${submission.cloudinaryId}`
      : `https://res.cloudinary.com/${cloudName}/raw/upload/college_portal/submissions/${submission.fileName}`;
    return res.redirect(cloudUrl);
  }

  return res.status(404).json({ error: 'File not found on server disk or cloud storage.' });
});

module.exports = router;
