import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Calendar, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  BarChart2, 
  ChevronRight, 
  HelpCircle,
  FileQuestion,
  BookOpen
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import TakeQuizModal from './TakeQuizModal';
import QuizResultsModal from './QuizResultsModal';

export default function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('pending'); // 'pending' | 'completed' | 'all'

  // Modal states
  const [takingQuizId, setTakingQuizId] = useState(null);
  const [reviewingQuizId, setReviewingQuizId] = useState(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/quizzes/my-all');
      setQuizzes(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const pendingQuizzes = quizzes.filter(q => q.status === 'pending');
  const completedQuizzes = quizzes.filter(q => q.status === 'attempted');
  const overdueQuizzes = quizzes.filter(q => q.status === 'overdue');
  const upcomingQuizzes = quizzes.filter(q => q.status === 'upcoming');

  const displayedQuizzes = activeFilter === 'pending'
    ? pendingQuizzes
    : activeFilter === 'completed'
    ? completedQuizzes
    : quizzes;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quizzes & Assessments</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Attempt scheduled class tests with automatic MCQ evaluation, essay grading, and performance summaries
            </p>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700">
            {pendingQuizzes.length} Pending
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
            {completedQuizzes.length} Completed
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-slate-200 flex gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeFilter === 'pending'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Tests ({pendingQuizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeFilter === 'completed'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Attempted Tests ({completedQuizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeFilter === 'all'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>All Quizzes ({quizzes.length})</span>
        </button>
      </div>

      {/* Content Body */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading your quizzes...</p>
        </div>
      ) : displayedQuizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">
            {activeFilter === 'pending'
              ? 'No pending quizzes right now!'
              : activeFilter === 'completed'
              ? 'No attempted quizzes yet'
              : 'No quizzes scheduled in your enrolled classes'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {activeFilter === 'pending'
              ? 'You are all caught up on all tests and assessments across your courses.'
              : 'Your scheduled quizzes and grades will appear here once published by your instructors.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedQuizzes.map(quiz => {
            const hasAttempted = quiz.hasAttempted;
            const now = new Date();
            const start = new Date(quiz.startTime);
            const end = new Date(quiz.endTime);
            const isUpcoming = now < start;
            const isExpired = now > end;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-5"
              >
                {/* Left: Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                      {quiz.classCode || quiz.className}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{quiz.className}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{quiz.totalPoints} Marks</span>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quiz.durationMinutes} Mins</span>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500">
                      {quiz.questionCount} Questions
                    </span>

                    {/* Status pill */}
                    {hasAttempted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attempted
                      </span>
                    ) : isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Closed / Overdue
                      </span>
                    ) : isUpcoming ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Starts Soon
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Active Now
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>
                  )}

                  {/* Schedule Timestamps */}
                  <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">Start Time:</span>{' '}
                      {new Date(quiz.startTime).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Due:</span>{' '}
                      {new Date(quiz.endTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end justify-between gap-3 self-stretch">
                  {hasAttempted && quiz.attempt ? (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-left sm:text-right min-w-[170px]">
                      <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Your Score
                      </div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">
                        {quiz.attempt.totalScore} <span className="text-xs font-normal text-slate-500">/ {quiz.totalPoints} pts</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {quiz.attempt.isGraded ? 'Evaluation Complete' : 'Paragraphs Pending Review'}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    {hasAttempted ? (
                      <button
                        onClick={() => setReviewingQuizId(quiz.id)}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200 inline-flex items-center gap-1.5"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>View Answers & Summary</span>
                      </button>
                    ) : isExpired ? (
                      <button
                        onClick={() => setReviewingQuizId(quiz.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>View Class Summary</span>
                      </button>
                    ) : isUpcoming ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                      >
                        Available at {new Date(quiz.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ) : (
                      <button
                        onClick={() => setTakingQuizId(quiz.id)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Take Quiz</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Take Quiz Modal */}
      <TakeQuizModal
        isOpen={!!takingQuizId}
        onClose={() => setTakingQuizId(null)}
        quizId={takingQuizId}
        onQuizSubmitted={() => {
          loadQuizzes();
          setReviewingQuizId(takingQuizId);
        }}
      />

      {/* Quiz Results & Summary Modal */}
      <QuizResultsModal
        isOpen={!!reviewingQuizId}
        onClose={() => setReviewingQuizId(null)}
        quizId={reviewingQuizId}
      />
    </div>
  );
}
