import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  HelpCircle, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  FileText, 
  AlertCircle,
  CheckSquare,
  AlignLeft,
  ListOrdered
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import QuestionBankPickerModal from './QuestionBankPickerModal';

export default function TeacherQuizModal({ isOpen, onClose, classId, onQuizCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Set default start time to now and end time to 3 days later
  const now = new Date();
  const defaultStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const end3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(end3Days);

  const [questions, setQuestions] = useState([
    {
      id: 'q_1',
      type: 'single',
      question: '',
      points: 5,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 0,
      correctAnswers: [],
      explanation: ''
    }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bankModalOpen, setBankModalOpen] = useState(false);

  const handleImportFromBank = (selectedFromBank) => {
    if (!selectedFromBank || selectedFromBank.length === 0) return;

    const formatted = selectedFromBank.map(bq => ({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: bq.type,
      question: bq.question,
      points: bq.points || (bq.type === 'paragraph' ? 10 : 5),
      options: bq.type !== 'paragraph' 
        ? (bq.options || []).map(opt => (typeof opt === 'string' ? opt : opt.text || ''))
        : [],
      correctAnswer: bq.type === 'single' ? bq.correctAnswer : null,
      correctAnswers: bq.type === 'multiple' ? (bq.correctAnswers || []) : [],
      explanation: bq.explanation || ''
    }));

    const hasOnlyInitialBlank = questions.length === 1 && !questions[0].question.trim();
    if (hasOnlyInitialBlank) {
      setQuestions(formatted);
    } else {
      setQuestions([...questions, ...formatted]);
    }
  };

  if (!isOpen) return null;

  const handleAddQuestion = (type = 'single') => {
    const newQ = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      question: '',
      points: type === 'paragraph' ? 10 : 5,
      options: type !== 'paragraph' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : [],
      correctAnswer: type === 'single' ? 0 : null,
      correctAnswers: type === 'multiple' ? [0] : [],
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      setError('A quiz must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const handleAddOption = (qIdx) => {
    const updated = [...questions];
    updated[qIdx].options.push(`Option ${updated[qIdx].options.length + 1}`);
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) {
      setError('MCQs must have at least 2 options.');
      return;
    }
    updated[qIdx].options.splice(optIdx, 1);
    // Adjust single correct answer index
    if (updated[qIdx].type === 'single') {
      if (updated[qIdx].correctAnswer >= updated[qIdx].options.length) {
        updated[qIdx].correctAnswer = 0;
      }
    } else if (updated[qIdx].type === 'multiple') {
      updated[qIdx].correctAnswers = updated[qIdx].correctAnswers
        .filter(ansIdx => ansIdx !== optIdx)
        .map(ansIdx => (ansIdx > optIdx ? ansIdx - 1 : ansIdx));
      if (updated[qIdx].correctAnswers.length === 0) {
        updated[qIdx].correctAnswers = [0];
      }
    }
    setQuestions(updated);
  };

  const handleToggleMultipleCorrect = (qIdx, optIdx) => {
    const updated = [...questions];
    const current = updated[qIdx].correctAnswers || [];
    if (current.includes(optIdx)) {
      if (current.length === 1) {
        setError('At least one correct answer must be selected for multiple-correct MCQ.');
        return;
      }
      updated[qIdx].correctAnswers = current.filter(i => i !== optIdx);
    } else {
      updated[qIdx].correctAnswers = [...current, optIdx].sort((a, b) => a - b);
    }
    setQuestions(updated);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a quiz title.');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please provide valid start and end dates.');
      return;
    }
    if (start >= end) {
      setError('Quiz end time must be after start time.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Question #${i + 1} has empty question text.`);
        return;
      }
      if (q.type === 'single') {
        for (let o = 0; o < q.options.length; o++) {
          if (!q.options[o].trim()) {
            setError(`Question #${i + 1} Option #${o + 1} cannot be empty.`);
            return;
          }
        }
        if (q.correctAnswer === null || q.correctAnswer === undefined) {
          setError(`Question #${i + 1} must have a correct answer selected.`);
          return;
        }
      } else if (q.type === 'multiple') {
        for (let o = 0; o < q.options.length; o++) {
          if (!q.options[o].trim()) {
            setError(`Question #${i + 1} Option #${o + 1} cannot be empty.`);
            return;
          }
        }
        if (!q.correctAnswers || q.correctAnswers.length === 0) {
          setError(`Question #${i + 1} must have at least one correct answer selected.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const data = await apiRequest(`/api/quizzes/class/${classId}`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60))),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          questions
        })
      });

      onQuizCreated && onQuizCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create & Schedule Quiz</h2>
              <p className="text-xs text-slate-500">Configure quiz timeline, MCQs with auto-grading, and paragraph questions</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Quiz Details */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Quiz Information & Timeline
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Quiz Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 3 Assessment: Algorithms & Data Structures"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Instructions / Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide guidelines for students (e.g. MCQs are auto-evaluated, paragraph questions will be graded by the instructor)."
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Available From (Start Time) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Deadline (End Time) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Question Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-blue-600" />
                  Quiz Questions ({questions.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Total Marks: <span className="font-bold text-blue-600">{totalPoints} pts</span>
                </p>
              </div>

              {/* Add Question dropdown / buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Pick curated questions with verified answer keys for DBMS, OS, Computer Networks, and Java"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Pick from Question Bank (200)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddQuestion('single')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Single MCQ
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('multiple')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Multi MCQ
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('paragraph')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Paragraph
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div 
                  key={q.id || qIdx} 
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        Q{qIdx + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          handleQuestionChange(qIdx, 'type', newType);
                          if (newType === 'paragraph') {
                            handleQuestionChange(qIdx, 'options', []);
                          } else if (!q.options || q.options.length === 0) {
                            handleQuestionChange(qIdx, 'options', ['Option 1', 'Option 2', 'Option 3', 'Option 4']);
                            if (newType === 'single') handleQuestionChange(qIdx, 'correctAnswer', 0);
                            if (newType === 'multiple') handleQuestionChange(qIdx, 'correctAnswers', [0]);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 border border-slate-200 text-slate-700 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="single">MCQ (Single Correct - Auto Graded)</option>
                        <option value="multiple">MCQ (Multiple Correct - Auto Graded)</option>
                        <option value="paragraph">Paragraph / Descriptive (Teacher Graded)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-500 font-medium">Marks:</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={q.points}
                          onChange={(e) => handleQuestionChange(qIdx, 'points', Number(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs text-center font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                      placeholder={
                        q.type === 'paragraph'
                          ? 'e.g. Explain Dijkstra’s shortest path algorithm with an example and its time complexity.'
                          : 'e.g. What is the time complexity of searching in a Balanced Binary Search Tree (AVL Tree)?'
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Single Choice MCQ Options */}
                  {q.type === 'single' && (
                    <div className="space-y-2 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                          Answer Options (Select the correct answer preset)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          + Add Option
                        </button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${q.id || qIdx}`}
                              checked={q.correctAnswer === optIdx}
                              onChange={() => handleQuestionChange(qIdx, 'correctAnswer', optIdx)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className={`flex-1 px-3 py-1.5 bg-white border text-sm rounded-lg ${
                                q.correctAnswer === optIdx 
                                  ? 'border-emerald-500 ring-1 ring-emerald-500 font-medium' 
                                  : 'border-slate-200'
                              }`}
                            />
                            {q.correctAnswer === optIdx && (
                              <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">
                                Correct Answer
                              </span>
                            )}
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(qIdx, optIdx)}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice MCQ Options */}
                  {q.type === 'multiple' && (
                    <div className="space-y-2 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                          Answer Options (Check all correct answers)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          + Add Option
                        </button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isChecked = (q.correctAnswers || []).includes(optIdx);
                          return (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleMultipleCorrect(qIdx, optIdx)}
                                className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                                title="Mark as one of correct answers"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className={`flex-1 px-3 py-1.5 bg-white border text-sm rounded-lg ${
                                  isChecked 
                                    ? 'border-emerald-500 ring-1 ring-emerald-500 font-medium' 
                                    : 'border-slate-200'
                                }`}
                              />
                              {isChecked && (
                                <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">
                                  Correct Option
                                </span>
                              )}
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIdx, optIdx)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paragraph Guide Info */}
                  {q.type === 'paragraph' && (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex items-start gap-3">
                      <AlignLeft className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-purple-900">
                        <span className="font-bold block mb-0.5">Teacher Evaluation Required</span>
                        Students will be provided with an open essay/paragraph text box to formulate their answer.
                        After submission, you will be able to review their written response, allot marks (0 to {q.points} pts), and provide detailed feedback remarks.
                      </div>
                    </div>
                  )}

                  {/* Explanation (Shown to students in review after attempt) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Explanation / Grading Notes (Optional, shown in review after attempt)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                      placeholder="e.g. Balanced trees guarantee O(log n) height, preventing worst-case linear O(n) degeneration."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {questions.length} questions &bull; {totalPoints} total marks
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                {submitting ? 'Publishing Quiz...' : 'Publish & Schedule Quiz'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Question Bank Picker Modal */}
      <QuestionBankPickerModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSelectQuestions={handleImportFromBank}
      />
    </div>
  );
}
