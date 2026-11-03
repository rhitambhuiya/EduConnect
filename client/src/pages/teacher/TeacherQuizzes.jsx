import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  Clock, 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  BookOpen, 
  Layers, 
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { apiRequest, formatDateTime } from '../../utils/api';
import TeacherQuizModal from './TeacherQuizModal';
import TeacherQuizReviewModal from './TeacherQuizReviewModal';
import QuestionBankPickerModal from './QuestionBankPickerModal';

export default function TeacherQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | upcoming | expired

  // Modals
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [reviewQuizId, setReviewQuizId] = useState(null);
  const [bankManagerOpen, setBankManagerOpen] = useState(false);

  // Delete modal
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerMsg, setBannerMsg] = useState({ text: '', type: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [quizData, classData] = await Promise.all([
        apiRequest('/api/quizzes/teacher/all'),
        apiRequest('/api/classes')
      ]);
      setQuizzes(quizData || []);
      setClasses(classData || []);
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showBanner = (text, type = 'success') => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg({ text: '', type: '' }), 4000);
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      setIsDeleting(true);
      await apiRequest(`/api/quizzes/${quizToDelete.id}`, { method: 'DELETE' });
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      showBanner(`Quiz "${quizToDelete.title}" deleted successfully.`, 'success');
      setQuizToDelete(null);
    } catch (err) {
      showBanner(err.message || 'Failed to delete quiz', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const totalQuizzes = quizzes.length;
  const activeQuizzes = quizzes.filter(q => q.status === 'active').length;
  const upcomingQuizzes = quizzes.filter(q => q.status === 'upcoming').length;
  const totalAttempts = quizzes.reduce((acc, q) => acc + (Number(q.attemptCount ?? q.attemptsCount) || 0), 0);

  // Filtered
  const filteredQuizzes = quizzes.filter(q => {
    if (selectedClassFilter !== 'all' && q.classId !== selectedClassFilter) {
      return false;
    }
    if (statusFilter !== 'all' && q.status !== statusFilter) {
      return false;
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchTitle = (q.title || '').toLowerCase().includes(query);
      const matchDesc = (q.description || '').toLowerCase().includes(query);
      const matchClass = (q.className || '').toLowerCase().includes(query) || (q.classCode || '').toLowerCase().includes(query);
      return matchTitle || matchDesc || matchClass;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CheckSquare className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Quizzes & Assessments</h1>
              <p className="text-sm text-slate-500">
                Schedule timed assessments, leverage your Question Bank, and evaluate student attempts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setBankManagerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all border border-slate-200 shadow-2xs"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            Question Bank Manager
          </button>

          <button
            onClick={() => {
              setEditingQuiz(null);
              setQuizModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule Quiz
          </button>
        </div>
      </div>

      {/* Banner Feedback */}
      {bannerMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          bannerMsg.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {bannerMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{bannerMsg.text}</span>
          </div>
          <button 
            onClick={() => setBannerMsg({ text: '', type: '' })}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quizzes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalQuizzes}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live & Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeQuizzes}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{upcomingQuizzes}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Attempts</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalAttempts}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quizzes by title or course name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-slate-800 cursor-pointer"
            >
              <option value="all">All Classes ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} - ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-slate-800 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Live / In Progress</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired / Concluded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quizzes Listing */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500">Loading quizzes across your classes...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold text-sm">{error}</p>
          <button 
            onClick={loadData}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <CheckSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No quizzes scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || selectedClassFilter !== 'all' || statusFilter !== 'all'
              ? 'No quizzes match your filter criteria.'
              : 'You have not scheduled any quizzes yet. Click "+ Schedule Quiz" to build one.'}
          </p>
          {(search || selectedClassFilter !== 'all' || statusFilter !== 'all') ? (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClassFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingQuiz(null);
                setQuizModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Schedule Your First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => {
            const attemptCount = Number(quiz.attemptCount ?? quiz.attemptsCount) || 0;
            const totalEnrolled = Number(quiz.totalEnrolled) || 0;
            const attemptPercent = totalEnrolled > 0
              ? Math.min(100, Math.round((attemptCount / totalEnrolled) * 100))
              : 0;

            return (
              <div 
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3.5">
                  {/* Card Header: Class Badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-100 max-w-[200px] truncate">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{quiz.classCode ? `${quiz.classCode} • ` : ''}{quiz.className}</span>
                    </span>

                    {quiz.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live
                      </span>
                    ) : quiz.status === 'upcoming' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Upcoming
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Expired
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {quiz.description || 'No additional instructions provided.'}
                    </p>
                  </div>

                  {/* Timeline Window */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Start:
                      </span>
                      <span className="font-medium text-slate-800">{formatDateTime(quiz.startTime)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Deadline:
                      </span>
                      <span className="font-medium text-slate-800">{formatDateTime(quiz.endTime)}</span>
                    </div>
                    {quiz.durationMinutes ? (
                      <div className="flex items-center justify-between text-purple-700 pt-1 border-t border-slate-200/60 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-500" /> Attempt Duration:
                        </span>
                        <span className="font-bold text-purple-900">{quiz.durationMinutes} mins</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Question Count & Points */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-800">{quiz.questionCount || 0} Questions</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-slate-600">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-slate-800">{quiz.totalPoints || 0} Points</span>
                    </div>
                  </div>

                  {/* Attempts Progress bar */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Submissions
                      </span>
                      <span className="font-bold text-slate-900">
                        {attemptCount} / {totalEnrolled}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${attemptPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Total attempts: <strong className="text-purple-600 font-semibold">{attemptCount}</strong></span>
                      <span>{attemptPercent}% submitted</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setReviewQuizId(quiz.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Review & Grade
                  </button>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setQuizModalOpen(true);
                      }}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-2xs hover:shadow-xs"
                      title="Edit Quiz"
                      aria-label="Edit Quiz"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setQuizToDelete(quiz)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 shadow-2xs hover:shadow-xs"
                      title="Delete Quiz"
                      aria-label="Delete Quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Quiz Modal */}
      <TeacherQuizModal
        isOpen={quizModalOpen}
        onClose={() => {
          setQuizModalOpen(false);
          setEditingQuiz(null);
        }}
        classId={editingQuiz ? editingQuiz.classId : null}
        quizToEdit={editingQuiz}
        classes={classes}
        onQuizCreated={async (newQ) => {
          showBanner(`Quiz "${newQ.title}" was scheduled and published successfully!`, 'success');
          await loadData();
        }}
        onQuizUpdated={async (upQ) => {
          showBanner(`Quiz "${upQ.title}" was updated successfully!`, 'success');
          await loadData();
        }}
      />

      {/* Review Attempts & Manual Grading Modal */}
      {reviewQuizId && (
        <TeacherQuizReviewModal
          isOpen={!!reviewQuizId}
          onClose={() => setReviewQuizId(null)}
          quizId={reviewQuizId}
          initialTab="roster"
          onGradesUpdated={async () => {
            await loadData();
          }}
        />
      )}

      {/* Question Bank Manager Standalone Modal */}
      <QuestionBankPickerModal
        isOpen={bankManagerOpen}
        onClose={() => setBankManagerOpen(false)}
        mode="manage"
      />

      {/* Delete Quiz Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Delete Quiz</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{quizToDelete.title}"</span>? All student attempts, auto-grading, and manual scores will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setQuizToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteQuiz}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

