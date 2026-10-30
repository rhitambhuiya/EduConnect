const mongoose = require('mongoose');

// 1. User Schema
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  department: { type: String, default: '' },
  semester: { type: String, default: '' },
  collegeId: { type: String, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  phone: { type: String, default: '' },
  enrollmentStatus: { type: String, default: 'active' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'users', timestamps: false });

// 2. Class Schema
const ClassSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  section: { type: String, default: 'A' },
  department: { type: String, default: '' },
  semester: { type: String, default: '' },
  academicTerm: { type: String, default: '' },
  schedule: { type: String, default: '' },
  room: { type: String, default: '' },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  description: { type: String, default: '' },
  syllabus: { type: String, default: '' },
  color: { type: String, default: '#2563eb' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'classes', timestamps: false });

// 3. Enrollment Schema
const EnrollmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  enrolledAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'enrollments', timestamps: false });

// 4. Note / Study Material Schema
const NoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  teacherId: { type: String, required: true },
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, default: '' },
  cloudinaryId: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/pdf' },
  uploadedAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'notes', timestamps: false });

// 5. Announcement Schema
const AnnouncementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'announcements', timestamps: false });

// 6. Assignment Schema
const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: { type: String, required: true },
  allowReupload: { type: Boolean, default: true },
  totalPoints: { type: Number, default: 100 },
  attachment: {
    originalName: String,
    fileName: String,
    fileUrl: String,
    cloudinaryId: String,
    fileSize: Number,
    mimeType: String
  },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'assignments', timestamps: false });

// 7. Submission Schema
const SubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  assignmentId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, default: '' },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, default: '' },
  cloudinaryId: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/pdf' },
  notes: { type: String, default: '' },
  submittedAt: { type: String, default: () => new Date().toISOString() },
  marks: { type: Number, default: null },
  feedback: { type: String, default: '' },
  gradedAt: { type: String, default: null },
  gradedBy: { type: String, default: null }
}, { collection: 'submissions', timestamps: false });

// 8. Quiz Schema
const QuizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  durationMinutes: { type: Number, default: 0 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  totalPoints: { type: Number, default: 0 },
  questions: { type: Array, default: [] },
  rescheduledAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'quizzes', timestamps: false });

// 9. Quiz Attempt Schema
const QuizAttemptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  quizId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  answers: { type: Array, default: [] },
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  mcqScore: { type: Number, default: 0 },
  paragraphScore: { type: Number, default: 0 },
  isGraded: { type: Boolean, default: false },
  submittedAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'quizAttempts', timestamps: false });

// 10. Question Bank Schema
const QuestionBankSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  type: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: Array, default: [] },
  correctAnswer: { type: Number, default: null },
  correctAnswers: { type: Array, default: [] },
  points: { type: Number, default: 5 },
  explanation: { type: String, default: '' },
  rubric: { type: String, default: '' }
}, { collection: 'questionBank', timestamps: false });

module.exports = {
  User: mongoose.models.User || mongoose.model('User', UserSchema),
  Class: mongoose.models.Class || mongoose.model('Class', ClassSchema),
  Enrollment: mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema),
  Note: mongoose.models.Note || mongoose.model('Note', NoteSchema),
  Announcement: mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema),
  Assignment: mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema),
  Submission: mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema),
  Quiz: mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema),
  QuizAttempt: mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema),
  QuestionBank: mongoose.models.QuestionBank || mongoose.model('QuestionBank', QuestionBankSchema)
};

