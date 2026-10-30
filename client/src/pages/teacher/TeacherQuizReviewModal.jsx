import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  BarChart3, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Save, 
  ChevronRight,
  TrendingUp,
  Percent,
  CheckSquare,
  HelpCircle,
  FileText,
  UserCheck,
  UserX
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function TeacherQuizReviewModal({ isOpen, onClose, quizId, initialTab = 'summary', onGradesUpdated }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'summary' | 'roster' | 'grade' | 'keys'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentReview, setStudentReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Grading form state: { [questionId]: { pointsEarned: number, teacherRemarks: string } }
  const [gradingInputs, setGradingInputs] = useState({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [keyQuestions, setKeyQuestions] = useState([]);
  const [savingKey, setSavingKey] = useState(false);
  const [keySuccessMsg, setKeySuccessMsg] = useState('');
  const [keyErrorMsg, setKeyErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && quizId) {
      if (initialTab) setActiveTab(initialTab);
      loadAnalytics();
      loadQuizQuestions();
    }
  }, [isOpen, quizId, initialTab]);

  const loadQuizQuestions = async () => {
    try {
      const qData = await apiRequest(`/api/quizzes/${quizId}`);
      if (qData && qData.questions) {
        setKeyQuestions(qData.questions);
      }
    } catch (err) {
      console.error('Failed to load quiz questions:', err);
    }
  };

  const handleSetSingleCorrect = (qIndex, optionIndex) => {
    const updated = [...keyQuestions];
    updated[qIndex] = { ...updated[qIndex], correctAnswer: optionIndex };
    setKeyQuestions(updated);
    setKeySuccessMsg('');
    setKeyErrorMsg('');
  };

  const handleToggleMultipleCorrect = (qIndex, optionIndex) => {
    const updated = [...keyQuestions];
    const current = updated[qIndex].correctAnswers || [];
    let next;
    if (current.includes(optionIndex)) {
      if (current.length === 1) {
        setKeyErrorMsg('At least one correct answer must remain selected for multiple-choice questions.');
        return;
      }
      next = current.filter(i => i !== optionIndex);
    } else {
      next = [...current, optionIndex].sort((a, b) => a - b);
    }
    updated[qIndex] = { ...updated[qIndex], correctAnswers: next };
    setKeyQuestions(updated);
    setKeySuccessMsg('');
    setKeyErrorMsg('');
  };

  const handleExplanationChange = (qIndex, text) => {
    const updated = [...keyQuestions];
    updated[qIndex] = { ...updated[qIndex], explanation: text };
    setKeyQuestions(updated);
    setKeySuccessMsg('');
  };

  const handleSaveAnswerKey = async () => {
    setSavingKey(true);
    setKeyErrorMsg('');
    setKeySuccessMsg('');
    try {
      const res = await apiRequest(`/api/quizzes/${quizId}/answer-key`, {
        method: 'PUT',
        body: JSON.stringify({ questions: keyQuestions })
      });
      setKeySuccessMsg(res.message || 'Answer key updated and student marks re-evaluated successfully!');
      await loadAnalytics();
      if (selectedStudentId) {
        await handleOpenStudentAttempt(selectedStudentId);
      }
      onGradesUpdated && onGradesUpdated();
    } catch (err) {
      setKeyErrorMsg(err.message || 'Failed to update answer key');
    } finally {
      setSavingKey(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/quizzes/${quizId}/summary`);
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStudentAttempt = async (studentId) => {
    setSelectedStudentId(studentId);
    setActiveTab('grade');
    setLoadingReview(true);
    setError('');
    setSaveSuccessMsg('');
    try {
      const data = await apiRequest(`/api/quizzes/${quizId}/review?studentId=${studentId}`);
      setStudentReview(data);

      // Pre-fill grading inputs for paragraph questions
      const initialGrades = {};
      (data.questions || []).forEach(q => {
        if (q.type === 'paragraph' && q.studentAnswer) {
          initialGrades[q.questionId] = {
            pointsEarned: q.studentAnswer.pointsEarned !== undefined ? q.studentAnswer.pointsEarned : 0,
            teacherRemarks: q.studentAnswer.teacherRemarks || ''
          };
        }
      });
      setGradingInputs(initialGrades);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReview(false);
    }
  };

  const handleGradeChange = (questionId, field, value) => {
    setGradingInputs(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { pointsEarned: 0, teacherRemarks: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveGrades = async () => {
    if (!studentReview?.attempt?.id) return;
    setSavingGrades(true);
    setError('');
    setSaveSuccessMsg('');
    try {
      const gradesArray = Object.entries(gradingInputs).map(([qId, val]) => ({
        questionId: qId,
        pointsEarned: Number(val.pointsEarned) || 0,
        teacherRemarks: val.teacherRemarks || ''
      }));

      await apiRequest(`/api/quizzes/attempts/${studentReview.attempt.id}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ grades: gradesArray })
      });

      setSaveSuccessMsg('Grades and teacher remarks saved successfully!');
      // Reload attempt review and summary
      handleOpenStudentAttempt(selectedStudentId);
      loadAnalytics();
      onGradesUpdated && onGradesUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGrades(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-5xl w-full my-8 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {analytics?.quiz?.title || 'Quiz Performance & Grading'}
              </h2>
              <p className="text-xs text-slate-500">
                Overall summary, statistical analytics, student submissions, and paragraph grading
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Overall Summary & Analytics
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Student Submissions Roster ({analytics?.totalAttempted || 0}/{analytics?.totalEnrolled || 0})
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'keys'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Answer Key & Re-grading
          </button>
          {selectedStudentId && (
            <button
              onClick={() => setActiveTab('grade')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'grade'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Student Review & Grading
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading quiz analytics and submissions...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: SUMMARY & ANALYTICS */}
              {activeTab === 'summary' && analytics && (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                      <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Attempts
                      </div>
                      <div className="text-2xl font-black text-indigo-950">
                        {analytics.totalAttempted} <span className="text-sm font-medium text-slate-500">/ {analytics.totalEnrolled}</span>
                      </div>
                      <div className="text-xs text-indigo-700 mt-1 font-medium">
                        {analytics.attemptRate}% completion rate
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                      <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Highest Marks
                      </div>
                      <div className="text-2xl font-black text-emerald-950">
                        {analytics.highestScore} <span className="text-sm font-medium text-slate-500">/ {analytics.quiz?.totalPoints}</span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1 font-medium truncate">
                        {analytics.topScorers && analytics.topScorers.length > 0 
                          ? `Top: ${analytics.topScorers.map(s => s.studentName).join(', ')}`
                          : 'No attempts yet'}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Average Marks
                      </div>
                      <div className="text-2xl font-black text-blue-950">
                        {analytics.averageScore} <span className="text-sm font-medium text-slate-500">pts</span>
                      </div>
                      <div className="text-xs text-blue-700 mt-1 font-medium">
                        Class average score
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Median Marks
                      </div>
                      <div className="text-2xl font-black text-purple-950">
                        {analytics.medianScore} <span className="text-sm font-medium text-slate-500">pts</span>
                      </div>
                      <div className="text-xs text-purple-700 mt-1 font-medium">
                        Lowest: {analytics.lowestScore} pts
                      </div>
                    </div>
                  </div>

                  {/* Top Scorers Showcase */}
                  {analytics.topScorers && analytics.topScorers.length > 0 && (
                    <div className="p-5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Top Performing Students</div>
                          <div className="text-base font-bold text-slate-900 mt-0.5">
                            {analytics.topScorers.map(s => s.studentName).join(', ')}
                          </div>
                          <div className="text-xs text-slate-600">
                            Achieved highest score of <span className="font-bold text-amber-800">{analytics.highestScore} / {analytics.quiz?.totalPoints} pts</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('roster')}
                        className="px-4 py-2 bg-white text-slate-800 text-xs font-semibold rounded-xl border border-amber-300 shadow-xs hover:bg-amber-50 transition-colors"
                      >
                        View Full Roster
                      </button>
                    </div>
                  )}

                  {/* Performance Breakdown Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Class Submissions Overview</h3>
                      <span className="text-xs text-slate-500">
                        {analytics.pendingAttempts} student(s) yet to submit
                      </span>
                    </div>

                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">MCQ Score</th>
                          <th className="py-3 px-4">Paragraph Score</th>
                          <th className="py-3 px-4">Total Score</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(analytics.rosterStatus || []).map((student) => (
                          <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{student.studentName}</div>
                              <div className="text-xs text-slate-400">{student.studentEmail}</div>
                            </td>
                            <td className="py-3 px-4">
                              {student.hasAttempted ? (
                                student.attempt?.isGraded ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle className="w-3 h-3" /> Fully Graded
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3 h-3" /> Needs Paragraph Grading
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                  <Clock className="w-3 h-3" /> Pending Attempt
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {student.attempt ? `${student.attempt.mcqScore} pts` : '-'}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {student.attempt ? `${student.attempt.paragraphScore} pts` : '-'}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {student.attempt ? (
                                <span className={student.attempt.totalScore === analytics.highestScore && analytics.highestScore > 0 ? 'text-amber-600' : 'text-slate-900'}>
                                  {student.attempt.totalScore} / {analytics.quiz?.totalPoints} pts
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {student.hasAttempted ? (
                                <button
                                  onClick={() => handleOpenStudentAttempt(student.studentId)}
                                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200 inline-flex items-center gap-1"
                                >
                                  {student.attempt?.isGraded ? 'Review Answers' : 'Grade Paragraphs'}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Not attempted</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: ROSTER LIST */}
              {activeTab === 'roster' && analytics && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Enrolled Students Roster</h3>
                      <p className="text-xs text-slate-500">Click on any attempted student to inspect answers, allot marks for paragraphs, and provide remarks</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(analytics.rosterStatus || []).map((student) => (
                      <div 
                        key={student.studentId}
                        className={`p-4 rounded-xl border transition-all ${
                          student.hasAttempted 
                            ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs' 
                            : 'bg-slate-50/60 border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              student.hasAttempted ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {student.studentName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{student.studentName}</div>
                              <div className="text-xs text-slate-400">{student.studentEmail}</div>
                            </div>
                          </div>

                          {student.hasAttempted ? (
                            student.attempt?.isGraded ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md">
                                Graded
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md">
                                Needs Grading
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-md">
                              Pending
                            </span>
                          )}
                        </div>

                        {student.hasAttempted && student.attempt && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="text-slate-600">
                              Score: <span className="font-bold text-slate-900">{student.attempt.totalScore} / {analytics.quiz?.totalPoints} pts</span>
                              <span className="text-slate-400 ml-2">(MCQ: {student.attempt.mcqScore}, Para: {student.attempt.paragraphScore})</span>
                            </div>
                            <button
                              onClick={() => handleOpenStudentAttempt(student.studentId)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                            >
                              Review & Grade <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: STUDENT ATTEMPT REVIEW & PARAGRAPH GRADING */}
              {activeTab === 'grade' && (
                <div>
                  {loadingReview ? (
                    <div className="py-20 text-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Loading student's answers...</p>
                    </div>
                  ) : studentReview ? (
                    <div className="space-y-6">
                      {/* Student info banner */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-500 uppercase font-semibold">Reviewing Submission</div>
                          <div className="text-lg font-bold text-slate-900">{studentReview.attempt?.studentName}</div>
                          <div className="text-xs text-slate-500">
                            Submitted on {new Date(studentReview.attempt?.submittedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Current Score</div>
                            <div className="text-xl font-black text-indigo-600">
                              {studentReview.attempt?.totalScore} <span className="text-xs font-normal text-slate-400">/ {studentReview.attempt?.maxScore} pts</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              MCQ: {studentReview.attempt?.mcqScore} pts | Paragraph: {studentReview.attempt?.paragraphScore} pts
                            </div>
                          </div>

                          <button
                            onClick={handleSaveGrades}
                            disabled={savingGrades}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            {savingGrades ? 'Saving...' : 'Save & Publish Grades'}
                          </button>
                        </div>
                      </div>

                      {saveSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{saveSuccessMsg}</span>
                        </div>
                      )}

                      {/* Question by question answers */}
                      <div className="space-y-5">
                        {(studentReview.questions || []).map((q, qIdx) => {
                          const ans = q.studentAnswer;
                          const isParagraph = q.type === 'paragraph';

                          return (
                            <div
                              key={q.questionId}
                              className={`p-5 rounded-xl border transition-all ${
                                isParagraph 
                                  ? 'bg-purple-50/20 border-purple-200' 
                                  : ans?.isCorrect 
                                    ? 'bg-emerald-50/15 border-emerald-200' 
                                    : 'bg-red-50/15 border-red-200'
                              }`}
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                                    Q{qIdx + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500 uppercase">
                                    {q.type === 'single' ? 'MCQ (Single Correct)' : q.type === 'multiple' ? 'MCQ (Multiple Correct)' : 'Paragraph / Essay'}
                                  </span>
                                </div>

                                <div className="text-xs font-bold">
                                  {isParagraph ? (
                                    <span className="text-purple-700">Max Marks: {q.points} pts</span>
                                  ) : ans?.isCorrect ? (
                                    <span className="text-emerald-600">+{ans.pointsEarned} / {q.points} pts (Correct)</span>
                                  ) : (
                                    <span className="text-red-600">0 / {q.points} pts (Incorrect)</span>
                                  )}
                                </div>
                              </div>

                              {/* Question prompt */}
                              <div className="py-3 text-sm font-semibold text-slate-900">
                                {q.question}
                              </div>

                              {/* MCQ Single Choice breakdown */}
                              {q.type === 'single' && (
                                <div className="space-y-2 mt-1">
                                  {q.options.map((opt, optIdx) => {
                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                    const isStudentChoice = Number(ans?.selectedOption) === optIdx;
                                    const isCorrect = Number(q.correctAnswer) === optIdx;

                                    return (
                                      <div
                                        key={optIdx}
                                        className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                                          isCorrect
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                            : isStudentChoice
                                              ? 'bg-red-50 border-red-300 text-red-900'
                                              : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                          <span>{optText}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isStudentChoice && (
                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                              Student's Choice
                                            </span>
                                          )}
                                          {isCorrect && (
                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                              Correct Answer
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* MCQ Multiple Choice breakdown */}
                              {q.type === 'multiple' && (
                                <div className="space-y-2 mt-1">
                                  {q.options.map((opt, optIdx) => {
                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                    const isStudentChoice = (ans?.selectedOptions || []).includes(optIdx);
                                    const isCorrect = (q.correctAnswers || []).includes(optIdx);

                                    return (
                                      <div
                                        key={optIdx}
                                        className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                                          isCorrect
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                            : isStudentChoice
                                              ? 'bg-red-50 border-red-300 text-red-900'
                                              : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                          <span>{optText}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isStudentChoice && (
                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                              Selected
                                            </span>
                                          )}
                                          {isCorrect && (
                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                              Correct Option
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Explanation for MCQs if present */}
                              {q.explanation && (
                                <div className="mt-3 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Explanation: </span>
                                    {q.explanation}
                                  </div>
                                </div>
                              )}

                              {/* PARAGRAPH QUESTION: STUDENT ANSWER + TEACHER ALLOT MARKS & REMARKS */}
                              {isParagraph && (
                                <div className="space-y-4 mt-2">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                      Student's Submitted Response
                                    </label>
                                    <div className="p-3.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm whitespace-pre-wrap font-serif">
                                      {ans?.answerText || <span className="italic text-slate-400">No response provided by student.</span>}
                                    </div>
                                  </div>

                                  {/* Teacher Grading Inputs */}
                                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1.5">
                                        <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                                        Teacher Marks Allotment & Remarks
                                      </label>
                                      <div className="text-xs text-purple-700 font-semibold">
                                        Max: {q.points} marks
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                                          Allotted Marks (0 - {q.points})
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max={q.points}
                                          value={gradingInputs[q.questionId]?.pointsEarned ?? 0}
                                          onChange={(e) => handleGradeChange(q.questionId, 'pointsEarned', e.target.value)}
                                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-bold text-purple-950 focus:ring-2 focus:ring-purple-500"
                                        />
                                      </div>

                                      <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                                          Teacher Remarks / Feedback
                                        </label>
                                        <input
                                          type="text"
                                          value={gradingInputs[q.questionId]?.teacherRemarks ?? ''}
                                          onChange={(e) => handleGradeChange(q.questionId, 'teacherRemarks', e.target.value)}
                                          placeholder="e.g. Excellent explanation of time complexity, but missing graph representation details."
                                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom action save button */}
                      <div className="pt-4 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={handleSaveGrades}
                          disabled={savingGrades}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {savingGrades ? 'Saving & Publishing...' : 'Save & Publish Grades'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 4: EDIT ANSWER KEY & RE-GRADE */}
              {activeTab === 'keys' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Quiz Questions & Answer Key</h3>
                      <p className="text-xs text-slate-500">Click any option to set the correct answer</p>
                    </div>
                    <button
                      onClick={handleSaveAnswerKey}
                      disabled={savingKey}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingKey ? 'Saving...' : 'Save & Re-evaluate Marks'}</span>
                    </button>
                  </div>

                  {keySuccessMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>{keySuccessMsg}</span>
                      </div>
                      <button onClick={() => setKeySuccessMsg('')} className="text-emerald-700 hover:opacity-75">✕</button>
                    </div>
                  )}

                  {keyErrorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>{keyErrorMsg}</span>
                    </div>
                  )}

                  {/* Question List */}
                  <div className="space-y-4">
                    {keyQuestions.map((q, qIdx) => {
                      const isSingle = q.type === 'single';
                      const isMultiple = q.type === 'multiple';
                      const isParagraph = q.type === 'paragraph';

                      return (
                        <div
                          key={q.id || qIdx}
                          className="p-5 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-xs"
                        >
                          {/* Question Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                                {qIdx + 1}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                isSingle 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : isMultiple 
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isSingle ? 'Single Choice MCQ' : isMultiple ? 'Multiple Choice MCQ' : 'Paragraph Response'}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {q.points || 0} Points
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {q.question}
                          </div>

                          {/* MCQ Options */}
                          {isSingle && (
                            <div className="space-y-2 pt-1">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Click an option below to set it as the correct answer:
                              </div>
                              {(q.options || []).map((opt, optIdx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const isCorrect = Number(q.correctAnswer) === optIdx;

                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => handleSetSingleCorrect(qIdx, optIdx)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 text-emerald-950 font-semibold'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                                        isCorrect
                                          ? 'border-emerald-600 bg-emerald-600 text-white'
                                          : 'border-slate-300 text-slate-400 bg-white'
                                      }`}>
                                        {isCorrect ? '✓' : String.fromCharCode(65 + optIdx)}
                                      </div>
                                      <span className="text-xs sm:text-sm">{optText}</span>
                                    </div>

                                    {isCorrect ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Correct Answer</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 font-medium hover:text-indigo-600">
                                        Click to set as correct
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isMultiple && (
                            <div className="space-y-2 pt-1">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Select all correct options (Multiple allowed):
                              </div>
                              {(q.options || []).map((opt, optIdx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const isCorrect = Array.isArray(q.correctAnswers) && q.correctAnswers.includes(optIdx);

                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => handleToggleMultipleCorrect(qIdx, optIdx)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 text-emerald-950 font-semibold'
                                        : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${
                                        isCorrect
                                          ? 'border-emerald-600 bg-emerald-600 text-white'
                                          : 'border-slate-300 text-slate-400 bg-white'
                                      }`}>
                                        {isCorrect ? '✓' : ''}
                                      </div>
                                      <span className="text-xs sm:text-sm">{optText}</span>
                                    </div>

                                    {isCorrect ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Correct Option</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        Click to select
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isParagraph && (
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
                              <span className="font-semibold">Subjective Question:</span> Paragraph responses are evaluated individually. You can review submissions and assign customized marks and remarks in the <strong>Student Review & Grading</strong> tab.
                            </div>
                          )}

                          {/* Explanation field */}
                          <div className="pt-2 border-t border-slate-100">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                              Answer Explanation (Visible to students during review)
                            </label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                              placeholder="Explain why this option is correct..."
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Save Bar */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Saving will immediately re-evaluate all {analytics?.totalAttempted || 0} student attempt(s) and update their scores.
                    </p>
                    <button
                      onClick={handleSaveAnswerKey}
                      disabled={savingKey}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingKey ? 'Re-evaluating Submissions...' : 'Save & Re-evaluate Marks'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
