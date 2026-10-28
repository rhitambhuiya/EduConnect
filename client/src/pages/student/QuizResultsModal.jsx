import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Award, 
  BarChart3, 
  TrendingUp, 
  HelpCircle, 
  AlertCircle, 
  AlignLeft, 
  CheckSquare, 
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function QuizResultsModal({ isOpen, onClose, quizId }) {
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'summary'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (isOpen && quizId) {
      loadData();
    }
  }, [isOpen, quizId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reviewJson, summaryJson] = await Promise.all([
        apiRequest(`/api/quizzes/${quizId}/review`),
        apiRequest(`/api/quizzes/${quizId}/summary`)
      ]);

      setReviewData(reviewJson);
      setSummaryData(summaryJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const attempt = reviewData?.attempt;
  const questions = reviewData?.questions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {reviewData?.quiz?.title || 'Quiz Results & Verification'}
              </h2>
              <p className="text-xs text-slate-500">
                Verify MCQ answer key, inspect teacher remarks for paragraph answers, and view class summary analytics
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

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6">
          <button
            onClick={() => setActiveTab('review')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'review'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            My Answers & Verification
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Overall Quiz Summary & Analytics
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading results and analytics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ANSWER VERIFICATION & TEACHER REMARKS */}
              {activeTab === 'review' && (
                <div className="space-y-6">
                  {/* Score & Status Banner */}
                  <div className="p-5 bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-100 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Your Score</div>
                      <div className="text-3xl font-black text-slate-900 mt-0.5">
                        {attempt?.totalScore} <span className="text-sm font-medium text-slate-500">/ {attempt?.maxScore} pts</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                        <span>Auto-Graded MCQs: <strong>{attempt?.mcqScore} pts</strong></span>
                        <span>&bull;</span>
                        <span>Paragraph Answers: <strong>{attempt?.paragraphScore} pts</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      {attempt?.isGraded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Fully Graded by Instructor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Paragraph Answers Awaiting Teacher Review
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        Submitted: {new Date(attempt?.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Question by question verification list */}
                  <div className="space-y-5">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                      Detailed Question Breakdown & Verification
                    </h3>

                    {questions.map((q, qIdx) => {
                      const ans = q.studentAnswer;
                      const isParagraph = q.type === 'paragraph';

                      return (
                        <div
                          key={q.questionId}
                          className={`p-5 rounded-2xl border transition-all ${
                            isParagraph
                              ? 'bg-purple-50/20 border-purple-200'
                              : ans?.isCorrect
                              ? 'bg-emerald-50/20 border-emerald-200'
                              : 'bg-red-50/20 border-red-200'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                                Q{qIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 uppercase">
                                {q.type === 'single'
                                  ? 'Single Choice MCQ'
                                  : q.type === 'multiple'
                                  ? 'Multiple Choice MCQ'
                                  : 'Paragraph Answer'}
                              </span>
                            </div>

                            <div className="text-xs font-bold">
                              {isParagraph ? (
                                <span className="text-purple-700">
                                  {ans?.gradedByTeacher
                                    ? `${ans.pointsEarned} / ${q.points} marks awarded`
                                    : `Pending evaluation (Max: ${q.points} pts)`}
                                </span>
                              ) : ans?.isCorrect ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  +{ans.pointsEarned} / {q.points} pts (Correct)
                                </span>
                              ) : (
                                <span className="text-red-600 flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" />
                                  0 / {q.points} pts (Incorrect)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Question text */}
                          <div className="py-3 text-sm font-semibold text-slate-900 leading-relaxed">
                            {q.question}
                          </div>

                          {/* Single Choice MCQ Verification */}
                          {q.type === 'single' && (
                            <div className="space-y-2 mt-1">
                              {q.options.map((opt, optIdx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const isMyPick = Number(ans?.selectedOption) === optIdx;
                                const isCorrect = Number(q.correctAnswer) === optIdx;

                                return (
                                  <div
                                    key={optIdx}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between border ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                        : isMyPick
                                        ? 'bg-red-50 border-red-300 text-red-950 font-medium'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                      <span>{optText}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isMyPick && (
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                          isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                          Your Answer
                                        </span>
                                      )}
                                      {isCorrect && !isMyPick && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                          Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Multiple Choice MCQ Verification */}
                          {q.type === 'multiple' && (
                            <div className="space-y-2 mt-1">
                              {q.options.map((opt, optIdx) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const isMyPick = (ans?.selectedOptions || []).includes(optIdx);
                                const isCorrect = (q.correctAnswers || []).includes(optIdx);

                                return (
                                  <div
                                    key={optIdx}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between border ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                        : isMyPick
                                        ? 'bg-red-50 border-red-300 text-red-950 font-medium'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                      <span>{optText}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isMyPick && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                          Selected
                                        </span>
                                      )}
                                      {isCorrect && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                          Correct Option
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation if available */}
                          {q.explanation && (
                            <div className="mt-3 p-3 bg-slate-100 rounded-xl text-xs text-slate-700 flex items-start gap-2 border border-slate-200">
                              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900">Explanation: </span>
                                {q.explanation}
                              </div>
                            </div>
                          )}

                          {/* Paragraph Response & Teacher Remarks */}
                          {isParagraph && (
                            <div className="space-y-3 mt-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                  Your Submitted Response
                                </label>
                                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm whitespace-pre-wrap font-serif">
                                  {ans?.answerText || <span className="italic text-slate-400">No response submitted.</span>}
                                </div>
                              </div>

                              {/* Teacher Remarks Box */}
                              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1.5">
                                    <AlignLeft className="w-3.5 h-3.5 text-purple-700" />
                                    Teacher Evaluation & Remarks
                                  </span>
                                  <span className="text-xs font-bold text-purple-800">
                                    {ans?.gradedByTeacher 
                                      ? `${ans.pointsEarned} / ${q.points} Marks` 
                                      : 'Evaluation in progress'}
                                  </span>
                                </div>
                                <div className="text-xs text-purple-950 font-medium whitespace-pre-wrap">
                                  {ans?.teacherRemarks ? (
                                    ans.teacherRemarks
                                  ) : (
                                    <span className="italic text-purple-500">
                                      Your teacher has not provided remarks yet. Check back soon.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: OVERALL QUIZ SUMMARY & ANALYTICS */}
              {activeTab === 'summary' && summaryData && (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Students Attempted
                      </div>
                      <div className="text-2xl font-black text-blue-950">
                        {summaryData.totalAttempted} <span className="text-sm font-medium text-slate-500">/ {summaryData.totalEnrolled}</span>
                      </div>
                      <div className="text-xs text-blue-700 mt-1 font-medium">
                        {summaryData.attemptRate}% class participation
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl">
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Highest Marks
                      </div>
                      <div className="text-2xl font-black text-amber-950">
                        {summaryData.highestScore} <span className="text-sm font-medium text-slate-500">/ {summaryData.quiz?.totalPoints}</span>
                      </div>
                      <div className="text-xs text-amber-800 mt-1 font-medium truncate">
                        {summaryData.topScorers && summaryData.topScorers.length > 0
                          ? `Scored by ${summaryData.topScorers.map(s => s.studentName).join(', ')}`
                          : 'No attempts yet'}
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                      <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Average Marks
                      </div>
                      <div className="text-2xl font-black text-emerald-950">
                        {summaryData.averageScore} <span className="text-sm font-medium text-slate-500">pts</span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1 font-medium">
                        Class average score
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Median Marks
                      </div>
                      <div className="text-2xl font-black text-purple-950">
                        {summaryData.medianScore} <span className="text-sm font-medium text-slate-500">pts</span>
                      </div>
                      <div className="text-xs text-purple-700 mt-1 font-medium">
                        Lowest score: {summaryData.lowestScore} pts
                      </div>
                    </div>
                  </div>

                  {/* Top Scorers Spotlight Banner */}
                  {summaryData.topScorers && summaryData.topScorers.length > 0 && (
                    <div className="p-5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Top Scorers</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {summaryData.topScorers.map(s => s.studentName).join(', ')}
                        </div>
                        <div className="text-xs text-slate-600">
                          Secured highest score of <strong className="text-amber-800">{summaryData.highestScore} / {summaryData.quiz?.totalPoints} pts</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Class Leaderboard / Overview */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Class Roster Summary</h3>
                      <span className="text-xs text-slate-500">
                        {summaryData.totalAttempted} submitted &bull; {summaryData.pendingAttempts} pending
                      </span>
                    </div>

                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(summaryData.rosterStatus || []).map((student, idx) => (
                          <tr 
                            key={idx} 
                            className={`transition-colors ${student.isMe ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50/60'}`}
                          >
                            <td className="py-3 px-4 flex items-center gap-2">
                              <span>{student.studentName}</span>
                              {student.isMe && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                                  You
                                </span>
                              )}
                              {student.totalScore === summaryData.highestScore && summaryData.highestScore > 0 && (
                                <Award className="w-3.5 h-3.5 text-amber-500 inline" title="Top Scorer" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {student.hasAttempted ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                                  <CheckCircle className="w-3.5 h-3.5" /> Attempted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
                                  <Clock className="w-3.5 h-3.5" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-800">
                              {student.hasAttempted && student.totalScore !== null
                                ? `${student.totalScore} / ${summaryData.quiz?.totalPoints} pts`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
