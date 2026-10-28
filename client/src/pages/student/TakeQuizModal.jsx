import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  AlertCircle, 
  CheckSquare, 
  CheckCircle2, 
  HelpCircle, 
  AlignLeft, 
  ListOrdered,
  Send,
  Award
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function TakeQuizModal({ isOpen, onClose, quizId, onQuizSubmitted }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);

  // Answers state: { [questionId]: { selectedOption, selectedOptions: [], answerText: '' } }
  const [answers, setAnswers] = useState({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  useEffect(() => {
    if (isOpen && quizId) {
      loadQuiz();
    }
  }, [isOpen, quizId]);

  const loadQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/quizzes/${quizId}`);

      if (data.hasAttempted) {
        throw new Error('You have already submitted an attempt for this quiz.');
      }

      setQuiz(data);

      // Initialize answers object
      const initialAnswers = {};
      (data.questions || []).forEach(q => {
        initialAnswers[q.id] = {
          questionId: q.id,
          type: q.type,
          selectedOption: null,
          selectedOptions: [],
          answerText: ''
        };
      });
      setAnswers(initialAnswers);

      // Calculate time limit (min between durationMinutes and end time)
      const durationSeconds = (data.durationMinutes || 30) * 60;
      const endMs = new Date(data.endTime).getTime();
      const nowMs = Date.now();
      const secondsUntilDeadline = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const effectiveSeconds = Math.min(durationSeconds, secondsUntilDeadline);

      setTimeLeftSeconds(effectiveSeconds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isOpen || loading || !quiz || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit on time expiry!
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, loading, quiz, timeLeftSeconds]);

  const handleSingleSelect = (questionId, optIdx) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOption: optIdx
      }
    }));
  };

  const handleMultiSelect = (questionId, optIdx) => {
    setAnswers(prev => {
      const current = prev[questionId]?.selectedOptions || [];
      const updated = current.includes(optIdx)
        ? current.filter(i => i !== optIdx)
        : [...current, optIdx].sort((a, b) => a - b);
      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selectedOptions: updated
        }
      };
    });
  };

  const handleParagraphChange = (questionId, text) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answerText: text
      }
    }));
  };

  const calculateAnsweredCount = () => {
    if (!quiz || !quiz.questions) return 0;
    let count = 0;
    quiz.questions.forEach(q => {
      const ans = answers[q.id];
      if (!ans) return;
      if (q.type === 'single' && ans.selectedOption !== null && ans.selectedOption !== undefined) count++;
      else if (q.type === 'multiple' && ans.selectedOptions && ans.selectedOptions.length > 0) count++;
      else if (q.type === 'paragraph' && ans.answerText && ans.answerText.trim().length > 0) count++;
    });
    return count;
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const answersPayload = Object.values(answers);
      const data = await apiRequest(`/api/quizzes/${quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersPayload })
      });

      onQuizSubmitted && onQuizSubmitted(data.attempt);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isTimeUrgent = timeLeftSeconds <= 300; // Under 5 mins
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = calculateAnsweredCount();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header with sticky timer */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold uppercase">
                {quiz?.className || 'Timed Assessment'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {totalQuestions} Questions &bull; {quiz?.totalPoints || 0} Points
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              {quiz?.title || 'Taking Quiz'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live countdown timer badge */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors ${
              isTimeUrgent 
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              <Clock className={`w-4 h-4 ${isTimeUrgent ? 'text-red-600' : 'text-slate-500'}`} />
              <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button 
              onClick={() => {
                if (answeredCount > 0) {
                  setConfirmSubmitOpen(true);
                } else {
                  onClose();
                }
              }} 
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading quiz questions...</p>
            </div>
          ) : quiz ? (
            <div className="space-y-6">
              {/* Instructions Callout */}
              {quiz.description && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold block mb-1">Instructions:</span>
                  {quiz.description}
                </div>
              )}

              {/* Questions list */}
              <div className="space-y-6">
                {quiz.questions.map((q, idx) => {
                  const ans = answers[q.id] || {};
                  return (
                    <div 
                      key={q.id} 
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4"
                    >
                      {/* Question meta bar */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {q.type === 'single' 
                              ? 'Single Choice MCQ' 
                              : q.type === 'multiple' 
                              ? 'Multiple Choice MCQ' 
                              : 'Paragraph Question'}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {q.points} {q.points === 1 ? 'Point' : 'Points'}
                        </span>
                      </div>

                      {/* Question text */}
                      <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.question}
                      </div>

                      {/* Question options / input */}
                      {q.type === 'single' && (
                        <div className="space-y-2.5">
                          {(q.options || []).map((opt, optIdx) => {
                            const optText = typeof opt === 'object' ? opt.text : opt;
                            const isSelected = ans.selectedOption === optIdx;
                            return (
                              <label
                                key={optIdx}
                                onClick={() => handleSingleSelect(q.id, optIdx)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 font-medium text-blue-950' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${q.id}`}
                                  checked={isSelected}
                                  onChange={() => handleSingleSelect(q.id, optIdx)}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="font-bold text-xs text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{optText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'multiple' && (
                        <div className="space-y-2.5">
                          <div className="text-xs text-slate-500 italic">
                            * Select all that apply (multiple answers possible)
                          </div>
                          {(q.options || []).map((opt, optIdx) => {
                            const optText = typeof opt === 'object' ? opt.text : opt;
                            const isSelected = (ans.selectedOptions || []).includes(optIdx);
                            return (
                              <label
                                key={optIdx}
                                onClick={() => handleMultiSelect(q.id, optIdx)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 font-medium text-indigo-950' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleMultiSelect(q.id, optIdx)}
                                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="font-bold text-xs text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{optText}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'paragraph' && (
                        <div className="space-y-2">
                          <textarea
                            rows={5}
                            value={ans.answerText || ''}
                            onChange={(e) => handleParagraphChange(q.id, e.target.value)}
                            placeholder="Write your comprehensive paragraph answer here. Your teacher will evaluate and provide remarks upon review."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans leading-relaxed"
                          />
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>Evaluated by teacher with custom marks & remarks</span>
                            <span>{(ans.answerText || '').length} characters</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Footer Bar with progress & submit */}
        {quiz && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                />
              </div>
              <span className="font-semibold text-slate-800">
                {answeredCount} of {totalQuestions} answered
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting Attempt...' : 'Submit Quiz'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmSubmitOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Quiz Attempt?</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  You have answered <strong className="text-slate-800 font-bold">{answeredCount} of {totalQuestions}</strong> questions. Once submitted, your MCQs will be graded automatically and your responses cannot be modified.
                </p>
                {answeredCount < totalQuestions && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>You have {totalQuestions - answeredCount} unanswered question(s).</span>
                  </div>
                )}
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmSubmitOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Continue Test
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setConfirmSubmitOpen(false);
                    handleSubmitQuiz(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
