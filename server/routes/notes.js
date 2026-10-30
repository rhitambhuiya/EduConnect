const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, UPLOADS_DIR } = require('../db');
const { authenticate } = require('../middleware/auth');
const { deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// GET /api/notes/:id/download - Secure file download
router.get('/:id/download', authenticate, (req, res) => {
  const note = db.findNoteById(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  const cls = db.findClassById(note.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Associated class not found' });
  }

  // Security check: teacher owner OR enrolled student
  const isOwner = req.user.role === 'teacher' && cls.teacherId === req.user.id;
  const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

  if (!isOwner && !isEnrolled) {
    return res.status(403).json({ error: 'You are not authorized to download this file.' });
  }

  // 1. Direct Cloudinary / CDN URL
  if (note.fileUrl && note.fileUrl.startsWith('http')) {
    return res.redirect(note.fileUrl);
  }

  // 2. Local disk file if present
  const filePath = path.join(UPLOADS_DIR, note.fileName);
  if (fs.existsSync(filePath)) {
    if (req.query.view === 'inline') {
      res.setHeader('Content-Type', note.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.originalName)}"`);
      return res.sendFile(filePath);
    }
    return res.download(filePath, note.originalName);
  }

  // 3. Fallback to Cloudinary URL if uploaded to cloud
  if (process.env.CLOUDINARY_CLOUD_NAME && note.fileName) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudUrl = note.cloudinaryId 
      ? `https://res.cloudinary.com/${cloudName}/raw/upload/${note.cloudinaryId}`
      : `https://res.cloudinary.com/${cloudName}/raw/upload/college_portal/notes/${note.fileName}`;
    return res.redirect(cloudUrl);
  }

  return res.status(404).json({ error: 'File was not found on server disk or cloud storage.' });
});

// DELETE /api/notes/:id - Teacher deletes a previously uploaded note
router.delete('/:id', authenticate, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Only teachers can delete study materials.' });
  }

  const note = db.findNoteById(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Study material not found' });
  }

  const cls = db.findClassById(note.classId);
  if (!cls) {
    return res.status(404).json({ error: 'Associated class not found' });
  }

  // Enforce ownership: only the teacher who created the class can delete its notes
  if (cls.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete materials from classes you created.' });
  }

  if (note.cloudinaryId) {
    deleteFromCloudinary(note.cloudinaryId);
  }
  const deleted = db.deleteNote(req.params.id);
  if (!deleted) {
    return res.status(500).json({ error: 'Failed to delete study material' });
  }

  return res.json({
    message: 'Study material deleted successfully',
    noteId: req.params.id
  });
});

module.exports = router;

