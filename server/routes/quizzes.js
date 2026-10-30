const express = require('express');
const { db } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to sanitize quiz questions for students who haven't attempted yet.
 * Strips out correctAnswer, correctAnswers, and explanation to prevent cheating.
 */
function sanitizeQuestions(questions = []) {
  return questions.map(q => {
    const sanitized = {
      id: q.id,
      type: q.type,
      question: q.question,
      points: q.points || 0
    };
    if (q.type === 'single' || q.type === 'multiple') {
      sanitized.options = (q.options || []).map(opt => ({
        id: opt.id !== undefined ? opt.id : opt.text,
        text: typeof opt === 'object' ? opt.text : opt
      }));
    }
    return sanitized;
  });
}

// GET /api/quizzes/question-bank - Strictly for teachers to browse and select curated questions for DBMS, OS, CN, and Java
router.get('/question-bank', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const { subject, type, search } = req.query;
    const questions = db.getQuestionBank({ subject, type, search });
    return res.json({
      total: questions.length,
      questions
    });
  } catch (err) {
    console.error('Error fetching question bank:', err);
    return res.status(500).json({ error: 'Failed to fetch question bank' });
  }
});

// GET /api/quizzes/my-pending - Student views pending quizzes across all enrolled classes
router.get('/my-pending', authenticate, requireRole('student'), (req, res) => {
  try {
    const all = db.getQuizzesForStudent(req.user.id);
    const pending = all.filter(q => q.status === 'pending');
    return res.json(pending);
  } catch (err) {
    console.error('Error fetching pending quizzes:', err);
    return res.status(500).json({ error: 'Failed to fetch pending quizzes' });
  }
});

// GET /api/quizzes/my-all - Student views all quizzes across all enrolled classes
router.get('/my-all', authenticate, requireRole('student'), (req, res) => {
  try {
    const all = db.getQuizzesForStudent(req.user.id);
    return res.json(all);
  } catch (err) {
    console.error('Error fetching student quizzes:', err);
    return res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// GET /api/quizzes/class/:classId - View all quizzes for a class
router.get('/class/:classId', authenticate, (req, res) => {
  try {
    const cls = db.findClassById(req.params.classId);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const isTeacher = req.user.role === 'teacher' && cls.teacherId === req.user.id;
    const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, cls.id);

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ error: 'Unauthorized to view quizzes for this class' });
    }

    const quizzes = db.getQuizzesByClass(cls.id);
    const totalEnrolled = db.getEnrollmentCount(cls.id);

    if (isTeacher) {
      // Teacher sees attempt stats for each quiz
      const result = quizzes.map(q => {
        const attempts = db.getQuizAttempts(q.id);
        const pendingGradingCount = attempts.filter(a => !a.isGraded).length;
        return {
          ...q,
          totalEnrolled,
          attemptCount: attempts.length,
          pendingGradingCount
        };
      });
      return res.json(result);
    }

    // Student view
    const now = new Date();
    const result = quizzes.map(q => {
      const attempt = db.getQuizAttempt(q.id, req.user.id);
      const hasAttempted = !!attempt;
      const startTime = new Date(q.startTime);
      const endTime = new Date(q.endTime);
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
        id: q.id,
        classId: q.classId,
        title: q.title,
        description: q.description,
        durationMinutes: q.durationMinutes,
        startTime: q.startTime,
        endTime: q.endTime,
        totalPoints: q.totalPoints,
        questionCount: (q.questions || []).length,
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
    });

    return res.json(result);
  } catch (err) {
    console.error('Error fetching class quizzes:', err);
    return res.status(500).json({ error: 'Failed to fetch class quizzes' });
  }
});

// POST /api/quizzes/class/:classId - Teacher creates and schedules a quiz
router.get('/detail/:id', authenticate, (req, res) => {
  // Shortcut alias to GET /api/quizzes/:id
  return getQuizDetail(req, res);
});

// GET /api/quizzes/:id - Get quiz details (with security sanitization)
router.get('/:id', authenticate, (req, res) => {
  return getQuizDetail(req, res);
});

function getQuizDetail(req, res) {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const cls = db.findClassById(quiz.classId);
    const isTeacher = req.user.role === 'teacher' && cls && cls.teacherId === req.user.id;
    const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, quiz.classId);

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ error: 'Unauthorized to view this quiz' });
    }

    if (isTeacher) {
      // Teacher gets full question definitions
      const attempts = db.getQuizAttempts(quiz.id);
      return res.json({
        ...quiz,
        attemptsCount: attempts.length
      });
    }

    // Student view: check if already attempted
    const attempt = db.getQuizAttempt(quiz.id, req.user.id);
    const hasAttempted = !!attempt;

    // If student has not attempted, questions must be sanitized!
    const questions = hasAttempted ? quiz.questions : sanitizeQuestions(quiz.questions);

    return res.json({
      id: quiz.id,
      classId: quiz.classId,
      className: cls ? cls.name : '',
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      totalPoints: quiz.totalPoints,
      questions,
      hasAttempted,
      attempt: attempt ? {
        id: attempt.id,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        mcqScore: attempt.mcqScore,
        paragraphScore: attempt.paragraphScore,
        isGraded: attempt.isGraded,
        submittedAt: attempt.submittedAt
      } : null
    });
  } catch (err) {
    console.error('Error fetching quiz detail:', err);
    return res.status(500).json({ error: 'Failed to fetch quiz detail' });
  }
}

// POST /api/quizzes/class/:classId - Create a new quiz with schedule and questions
router.post('/class/:classId', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const cls = db.findClassById(req.params.classId);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Only the class teacher can create quizzes' });
    }

    const { title, description, durationMinutes, startTime, endTime, questions } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Both start time and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end time format' });
    }
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const calculatedDuration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const duration = Math.max(1, parseInt(durationMinutes, 10) || calculatedDuration);

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Quiz must contain at least one question' });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        return res.status(400).json({ error: `Question #${i + 1} is missing question text` });
      }
      if (!['single', 'multiple', 'paragraph'].includes(q.type)) {
        return res.status(400).json({ error: `Question #${i + 1} has invalid type: ${q.type}` });
      }
      if (q.type === 'single') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ error: `Question #${i + 1} must have at least 2 options` });
        }
        if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          return res.status(400).json({ error: `Question #${i + 1} must have a valid correct answer option selected` });
        }
      } else if (q.type === 'multiple') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ error: `Question #${i + 1} must have at least 2 options` });
        }
        if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
          return res.status(400).json({ error: `Question #${i + 1} must have at least one correct answer selected` });
        }
      }
      if (q.points !== undefined && (isNaN(Number(q.points)) || Number(q.points) < 0)) {
        return res.status(400).json({ error: `Question #${i + 1} points must be a positive number` });
      }
    }

    const created = db.createQuiz({
      classId: cls.id,
      teacherId: req.user.id,
      title: title.trim(),
      description: (description || '').trim(),
      durationMinutes: duration,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      questions
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('Error creating quiz:', err);
    return res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// PUT /api/quizzes/:id - Teacher updates a quiz
router.put('/:id', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const cls = db.findClassById(quiz.classId);
    if (!cls || cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this quiz' });
    }

    const updated = db.updateQuiz(quiz.id, req.body);
    return res.json(updated);
  } catch (err) {
    console.error('Error updating quiz:', err);
    return res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// DELETE /api/quizzes/:id - Teacher deletes a quiz
router.delete('/:id', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const cls = db.findClassById(quiz.classId);
    if (!cls || cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this quiz' });
    }

    db.deleteQuiz(quiz.id);
    return res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('Error deleting quiz:', err);
    return res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// POST /api/quizzes/:id/attempt - Student submits their quiz attempt
router.post('/:id/attempt', authenticate, requireRole('student'), (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Verify enrollment
    if (!db.isEnrolled(req.user.id, quiz.classId)) {
      return res.status(403).json({ error: 'You are not enrolled in this class' });
    }

    // Check timeline
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) {
      return res.status(400).json({ error: `Quiz has not started yet. Starts at ${startTime.toLocaleString()}` });
    }

    // Small 2-minute grace period for network delays
    const gracePeriodMs = 2 * 60 * 1000;
    if (now.getTime() > endTime.getTime() + gracePeriodMs) {
      return res.status(400).json({ error: 'Quiz deadline has passed' });
    }

    // Check if already attempted
    const existing = db.getQuizAttempt(quiz.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted an attempt for this quiz' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Quiz answers are required' });
    }

    const attempt = db.submitQuizAttempt(
      quiz.id,
      req.user.id,
      req.user.name,
      req.user.email,
      answers
    );

    return res.status(201).json({
      message: 'Quiz submitted successfully',
      attempt
    });
  } catch (err) {
    console.error('Error submitting quiz attempt:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit quiz attempt' });
  }
});

// GET /api/quizzes/:id/review - View attempt verification with full answer breakdown
router.get('/:id/review', authenticate, (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const cls = db.findClassById(quiz.classId);
    const isTeacher = req.user.role === 'teacher' && cls && cls.teacherId === req.user.id;
    const isStudent = req.user.role === 'student' && db.isEnrolled(req.user.id, quiz.classId);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Unauthorized to view review for this quiz' });
    }

    // Target student ID: teacher can inspect specific student attempt via ?studentId=...
    const studentId = isTeacher && req.query.studentId ? req.query.studentId : req.user.id;
    const attempt = db.getQuizAttempt(quiz.id, studentId);

    if (!attempt) {
      return res.status(404).json({ error: 'No quiz attempt found for this student' });
    }

    // Build question-by-question verification review
    const answersMap = new Map((attempt.answers || []).map(a => [a.questionId, a]));

    const reviewQuestions = (quiz.questions || []).map((q, idx) => {
      const studentAns = answersMap.get(q.id) || null;
      const isMcq = q.type === 'single' || q.type === 'multiple';

      return {
        questionId: q.id,
        index: idx + 1,
        type: q.type,
        question: q.question,
        points: q.points || 0,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers || [],
        explanation: q.explanation || '',
        studentAnswer: studentAns ? {
          selectedOption: studentAns.selectedOption,
          selectedOptions: studentAns.selectedOptions,
          answerText: studentAns.answerText,
          isCorrect: studentAns.isCorrect,
          pointsEarned: studentAns.pointsEarned || 0,
          teacherRemarks: studentAns.teacherRemarks || '',
          gradedByTeacher: studentAns.gradedByTeacher || false
        } : null
      };
    });

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalPoints: quiz.totalPoints,
        durationMinutes: quiz.durationMinutes,
        startTime: quiz.startTime,
        endTime: quiz.endTime
      },
      attempt: {
        id: attempt.id,
        studentId: attempt.studentId,
        studentName: attempt.studentName,
        studentEmail: attempt.studentEmail,
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        mcqScore: attempt.mcqScore,
        paragraphScore: attempt.paragraphScore,
        isGraded: attempt.isGraded
      },
      questions: reviewQuestions
    });
  } catch (err) {
    console.error('Error fetching quiz review:', err);
    return res.status(500).json({ error: 'Failed to fetch quiz review' });
  }
});

// GET /api/quizzes/:id/summary - Overall statistical summary & analytics for quiz
router.get('/:id/summary', authenticate, (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const cls = db.findClassById(quiz.classId);
    const isTeacher = req.user.role === 'teacher' && cls && cls.teacherId === req.user.id;
    const isEnrolled = req.user.role === 'student' && db.isEnrolled(req.user.id, quiz.classId);

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({ error: 'Unauthorized to view summary for this quiz' });
    }

    const analytics = db.getQuizAnalytics(quiz.id);
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not available' });
    }

    // For students, check if their attempt is available and include their own rank/score info
    if (isEnrolled && !isTeacher) {
      const myAttempt = db.getQuizAttempt(quiz.id, req.user.id);
      return res.json({
        ...analytics,
        myAttempt: myAttempt ? {
          totalScore: myAttempt.totalScore,
          maxScore: myAttempt.maxScore,
          isGraded: myAttempt.isGraded,
          submittedAt: myAttempt.submittedAt
        } : null,
        // Hide other students' emails in student view for privacy, but keep name and score
        rosterStatus: analytics.rosterStatus.map(r => ({
          studentName: r.studentName,
          hasAttempted: r.hasAttempted,
          isMe: r.studentId === req.user.id,
          totalScore: r.attempt ? r.attempt.totalScore : null
        }))
      });
    }

    return res.json(analytics);
  } catch (err) {
    console.error('Error fetching quiz analytics:', err);
    return res.status(500).json({ error: 'Failed to fetch quiz analytics' });
  }
});

// GET /api/quizzes/:id/attempts - Teacher views all attempts for a quiz
router.get('/:id/attempts', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const cls = db.findClassById(quiz.classId);
    if (!cls || cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view attempts for this quiz' });
    }

    const attempts = db.getQuizAttempts(quiz.id);
    return res.json(attempts);
  } catch (err) {
    console.error('Error fetching attempts:', err);
    return res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// PUT /api/quizzes/attempts/:attemptId/grade - Teacher grades paragraph answers
router.put('/attempts/:attemptId/grade', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const attempt = db.findQuizAttemptById(req.params.attemptId);
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const quiz = db.findQuizById(attempt.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Associated quiz not found' });
    }

    const cls = db.findClassById(quiz.classId);
    if (!cls || cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Only the class teacher can grade attempts' });
    }

    const { grades } = req.body;
    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'Grades must be an array of { questionId, pointsEarned, teacherRemarks }' });
    }

    const updated = db.gradeParagraphAnswers(attempt.id, req.user.id, grades);
    return res.json({
      message: 'Paragraph answers graded successfully',
      attempt: updated
    });
  } catch (err) {
    console.error('Error grading attempt:', err);
    return res.status(500).json({ error: err.message || 'Failed to grade attempt' });
  }
});

// PUT /api/quizzes/:id/answer-key - Teacher updates correct options and automatically re-evaluates all student attempts
router.put('/:id/answer-key', authenticate, requireRole('teacher'), (req, res) => {
  try {
    const quiz = db.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const cls = db.findClassById(quiz.classId);
    if (!cls || cls.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Only the class teacher can modify the quiz answer key' });
    }

    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const result = db.updateQuizAnswerKey(quiz.id, questions);
    if (!result) {
      return res.status(500).json({ error: 'Failed to update answer key' });
    }

    return res.json({
      message: `Answer key updated successfully. Re-graded ${result.affectedAttemptsCount} student submission(s).`,
      quiz: result.quiz,
      affectedAttemptsCount: result.affectedAttemptsCount
    });
  } catch (err) {
    console.error('Error updating quiz answer key:', err);
    return res.status(500).json({ error: err.message || 'Failed to update quiz answer key' });
  }
});

module.exports = router;
