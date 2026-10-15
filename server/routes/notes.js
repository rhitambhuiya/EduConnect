const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, UPLOADS_DIR } = require('../db');
const { authenticate } = require('../middleware/auth');

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

  const filePath = path.join(UPLOADS_DIR, note.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File was not found on server disk.' });
  }

  // Check if query wants inline viewing vs attachment download
  if (req.query.view === 'inline') {
    res.setHeader('Content-Type', note.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.originalName)}"`);
    return res.sendFile(filePath);
  }

  return res.download(filePath, note.originalName);
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

