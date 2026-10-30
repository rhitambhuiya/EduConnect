import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  CheckSquare, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Sparkles,
  Filter,
  Check,
  Plus,
  FolderPlus,
  PlusCircle,
  AlertCircle,
  FileText,
  AlignLeft,
  ListOrdered,
  Trash2
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function QuestionBankPickerModal({ 
  isOpen, 
  onClose, 
  onSelectQuestions,
  defaultSubject = 'all'
}) {
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedSubject, setSelectedSubject] = useState(defaultSubject);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected question IDs for importing into active quiz
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Create Section Modal State
  const [newSectionModalOpen, setNewSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionMsg, setSectionMsg] = useState('');

  // Add Question to Bank Modal State
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionFormError, setQuestionFormError] = useState('');
  const [newQ, setNewQ] = useState({
    subject: '',
    type: 'single',
    question: '',
    points: 5,
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    correctAnswer: 0,
    correctAnswers: [0],
    explanation: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadQuestionBank();
      loadSections();
      setSelectedIds(new Set());
      setSelectedSubject(defaultSubject || 'all');
    }
  }, [isOpen, defaultSubject]);

  const loadQuestionBank = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/quizzes/question-bank');
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    try {
      const res = await apiRequest('/api/quizzes/question-bank/sections');
      if (res && Array.isArray(res.sections)) {
        setSections(res.sections);
      }
    } catch (err) {
      // Fallback defaults
      setSections(['DBMS', 'Operating Systems', 'Computer Networks', 'Java']);
    }
  };

  // Filtered list
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Subject filter
      if (selectedSubject !== 'all') {
        const qSub = (q.subject || '').toLowerCase();
        const selSub = selectedSubject.toLowerCase();
        const isMatch = qSub === selSub || 
          (selSub === 'operating systems' && qSub === 'os') ||
          (selSub === 'os' && qSub === 'operating systems');
        if (!isMatch) return false;
      }
      // Type filter
      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesQ = (q.question || '').toLowerCase().includes(query);
        const matchesTopic = (q.topic || '').toLowerCase().includes(query);
        const matchesOptions = (q.options || []).some(opt => 
          (typeof opt === 'string' ? opt : opt.text || '').toLowerCase().includes(query)
        );
        return matchesQ || matchesTopic || matchesOptions;
      }
      return true;
    });
  }, [questions, selectedSubject, selectedType, searchQuery]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => next.has(q.id));
      if (allFilteredSelected) {
        filteredQuestions.forEach(q => next.delete(q.id));
      } else {
        filteredQuestions.forEach(q => next.add(q.id));
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    const toAdd = questions.filter(q => selectedIds.has(q.id));
    onSelectQuestions && onSelectQuestions(toAdd);
    onClose();
  };

  // Create New Section Handler
  const handleCreateSectionSubmit = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    setCreatingSection(true);
    setSectionMsg('');
    try {
      const res = await apiRequest('/api/quizzes/question-bank/sections', {
        method: 'POST',
        body: JSON.stringify({ name: newSectionName.trim() })
      });

      if (res && res.sections) {
        setSections(res.sections);
      } else {
        setSections(prev => Array.from(new Set([...prev, newSectionName.trim()])));
      }

      setSelectedSubject(newSectionName.trim());
      setNewSectionName('');
      setNewSectionModalOpen(false);
    } catch (err) {
      setSectionMsg(err.message || 'Failed to create section');
    } finally {
      setCreatingSection(false);
    }
  };

  // Open Add Question Form
  const handleOpenAddQuestion = () => {
    const defaultSec = selectedSubject !== 'all' ? selectedSubject : (sections[0] || 'DBMS');
    setNewQ({
      subject: defaultSec,
      type: 'single',
      question: '',
      points: 5,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 0,
      correctAnswers: [0],
      explanation: ''
    });
    setQuestionFormError('');
    setAddQuestionModalOpen(true);
  };

  // Add Question to Bank Handler
  const handleSaveQuestionToBank = async (e) => {
    e.preventDefault();
    setQuestionFormError('');

    if (!newQ.subject.trim()) {
      setQuestionFormError('Please select or specify a section/subject.');
      return;
    }
    if (!newQ.question.trim()) {
      setQuestionFormError('Question text cannot be empty.');
      return;
    }

    if (newQ.type === 'single') {
      for (let o = 0; o < newQ.options.length; o++) {
        if (!newQ.options[o].trim()) {
          setQuestionFormError(`Option #${o + 1} cannot be empty.`);
          return;
        }
      }
      if (newQ.correctAnswer === null || newQ.correctAnswer === undefined) {
        setQuestionFormError('Please select a correct answer option.');
        return;
      }
    } else if (newQ.type === 'multiple') {
      for (let o = 0; o < newQ.options.length; o++) {
        if (!newQ.options[o].trim()) {
          setQuestionFormError(`Option #${o + 1} cannot be empty.`);
          return;
        }
      }
      if (!newQ.correctAnswers || newQ.correctAnswers.length === 0) {
        setQuestionFormError('Please select at least one correct answer option.');
        return;
      }
    }

    setSavingQuestion(true);
    try {
      const res = await apiRequest('/api/quizzes/question-bank', {
        method: 'POST',
        body: JSON.stringify(newQ)
      });

      if (res && res.question) {
        // Prepend to questions list
        setQuestions(prev => [res.question, ...prev]);
        // Auto-select in picker mode
        if (onSelectQuestions) {
          setSelectedIds(prev => new Set([...prev, res.question.id]));
        }
        // Switch filter to this subject so the user immediately sees it
        setSelectedSubject(res.question.subject);
      }

      setAddQuestionModalOpen(false);
    } catch (err) {
      setQuestionFormError(err.message || 'Failed to save question to bank');
    } finally {
      setSavingQuestion(false);
    }
  };

  if (!isOpen) return null;

  // Build subject tabs with counts
  const allSectionTabs = [
    { key: 'all', label: 'All Questions', count: questions.length },
    ...sections.map(sec => {
      const secCount = questions.filter(q => {
        const qSub = (q.subject || '').toLowerCase();
        const target = sec.toLowerCase();
        return qSub === target || 
          (target === 'operating systems' && qSub === 'os') ||
          (target === 'os' && qSub === 'operating systems');
      }).length;
      return { key: sec, label: sec, count: secCount };
    })
  ];

  const types = [
    { key: 'all', label: 'All Types' },
    { key: 'single', label: 'Single Choice MCQ' },
    { key: 'multiple', label: 'Multiple Choice MCQ' },
    { key: 'paragraph', label: 'Paragraph' }
  ];

  const allFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Question Bank & Section Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {questions.length} Questions
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {sections.length} Sections
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse questions by section, create custom sections, or add new questions directly into the database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Section Button */}
            <button
              type="button"
              onClick={() => setNewSectionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
              title="Create a new question bank section"
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ New Section</span>
            </button>

            {/* Add Question to Bank Button */}
            <button
              type="button"
              onClick={handleOpenAddQuestion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title="Add a custom question to this section in the question bank"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Question</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white space-y-3">
          {/* Section Tabs with Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {allSectionTabs.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedSubject(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedSubject.toLowerCase() === s.key.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSubject.toLowerCase() === s.key.toLowerCase() 
                    ? 'bg-blue-700 text-white' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {s.count}
                </span>
              </button>
            ))}

            {/* Inline Quick Add Section button */}
            <button
              type="button"
              onClick={() => setNewSectionModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-200 shrink-0 cursor-pointer transition-colors"
            >
              + Add Section
            </button>
          </div>

          {/* Type Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Type:</span>
              </span>
              {types.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedType(t.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    selectedType === t.key
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, keyword, topic..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selection Bar (Shown when in picker mode) */}
        {onSelectQuestions && (
          <div className="px-6 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{allFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}</span>
              </button>
              <span className="text-slate-300">|</span>
              <span>Showing <strong>{filteredQuestions.length}</strong> matching questions</span>
            </div>

            <div className="font-semibold text-slate-700">
              Selected: <strong className="text-blue-600">{selectedIds.size}</strong>
            </div>
          </div>
        )}

        {/* Questions List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading Question Bank Database...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No questions found in this section</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No questions match your current filters. You can add a new question to this section right now!
              </p>
              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add First Question to {selectedSubject === 'all' ? 'Section' : selectedSubject}</span>
              </button>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const isSelected = selectedIds.has(q.id);
              const isSingle = q.type === 'single';
              const isMultiple = q.type === 'multiple';
              const isParagraph = q.type === 'paragraph';

              return (
                <div
                  key={q.id}
                  onClick={() => onSelectQuestions && toggleSelect(q.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    onSelectQuestions ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-400 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox (if in picker mode) */}
                    {onSelectQuestions && (
                      <div className="pt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white hover:border-blue-400'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                          {q.subject}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isSingle
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isMultiple
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isSingle ? 'Single MCQ' : isMultiple ? 'Multi MCQ' : 'Paragraph'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 ml-auto">
                          {q.points || (isParagraph ? 10 : 5)} Points
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                        {q.question}
                      </div>

                      {/* Options Preview for MCQs */}
                      {!isParagraph && q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const optText = typeof opt === 'object' ? opt.text : opt;
                            const isCorrect = isSingle 
                              ? Number(q.correctAnswer) === optIdx 
                              : (q.correctAnswers || []).includes(optIdx);

                            return (
                              <div
                                key={optIdx}
                                className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                                  isCorrect
                                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-semibold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {isCorrect ? '✓' : String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="truncate">{optText}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation preview */}
                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic line-clamp-1 pt-0.5">
                          <strong className="text-slate-600 not-italic">Key: </strong>{q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {onSelectQuestions ? (
              <span><strong>{selectedIds.size}</strong> of {filteredQuestions.length} questions selected for quiz</span>
            ) : (
              <span><strong>{filteredQuestions.length}</strong> questions in current view</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {onSelectQuestions ? 'Cancel' : 'Close'}
            </button>
            {onSelectQuestions && (
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={selectedIds.size === 0}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Selected Questions ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* CREATE NEW SECTION MODAL */}
      {newSectionModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create New Section</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create a custom section/subject in the Question Bank (e.g. Data Structures, Cloud Computing, Artificial Intelligence).
            </p>

            <form onSubmit={handleCreateSectionSubmit} className="space-y-4">
              {sectionMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {sectionMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section / Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewSectionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSection || !newSectionName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {creatingSection ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD QUESTION TO BANK MODAL */}
      {addQuestionModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-6 max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 sticky top-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Question to Question Bank</h3>
                  <p className="text-xs text-slate-500">Permanently save to MongoDB Atlas Question Bank</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionToBank} className="flex-1 overflow-y-auto p-6 space-y-4">
              {questionFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{questionFormError}</span>
                </div>
              )}

              {/* Section / Subject Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Section / Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newQ.subject}
                    onChange={(e) => setNewQ({ ...newQ, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {sections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newQ.type}
                    onChange={(e) => setNewQ({ 
                      ...newQ, 
                      type: e.target.value,
                      points: e.target.value === 'paragraph' ? 10 : 5
                    })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="single">Single Choice MCQ</option>
                    <option value="multiple">Multiple Choice MCQ</option>
                    <option value="paragraph">Paragraph (Descriptive)</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newQ.question}
                  onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                  placeholder="Enter the question text clearly..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Options Builder for MCQs */}
              {newQ.type !== 'paragraph' && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Options & Correct Answer ({newQ.type === 'single' ? 'Pick 1' : 'Pick multiple'})
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewQ({ ...newQ, options: [...newQ.options, `Option ${newQ.options.length + 1}`] })}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {newQ.options.map((opt, oIdx) => {
                      const isCorrect = newQ.type === 'single' 
                        ? newQ.correctAnswer === oIdx 
                        : (newQ.correctAnswers || []).includes(oIdx);

                      return (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (newQ.type === 'single') {
                                setNewQ({ ...newQ, correctAnswer: oIdx });
                              } else {
                                const curr = newQ.correctAnswers || [];
                                const updated = curr.includes(oIdx) 
                                  ? curr.filter(i => i !== oIdx) 
                                  : [...curr, oIdx].sort((a,b)=>a-b);
                                setNewQ({ ...newQ, correctAnswers: updated.length ? updated : [oIdx] });
                              }
                            }}
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border cursor-pointer shrink-0 ${
                              isCorrect 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                            title="Click to toggle as correct answer"
                          >
                            {isCorrect ? '✓' : String.fromCharCode(65 + oIdx)}
                          </button>

                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => {
                              const opts = [...newQ.options];
                              opts[oIdx] = e.target.value;
                              setNewQ({ ...newQ, options: opts });
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />

                          {newQ.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const opts = newQ.options.filter((_, i) => i !== oIdx);
                                setNewQ({ 
                                  ...newQ, 
                                  options: opts,
                                  correctAnswer: newQ.correctAnswer >= opts.length ? 0 : newQ.correctAnswer,
                                  correctAnswers: (newQ.correctAnswers || []).filter(i => i !== oIdx).map(i => i > oIdx ? i - 1 : i)
                                });
                              }}
                              className="text-slate-400 hover:text-red-500 p-1"
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

              {/* Points & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marks / Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQ.points}
                    onChange={(e) => setNewQ({ ...newQ, points: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Explanation / Answer Key Notes
                  </label>
                  <input
                    type="text"
                    value={newQ.explanation}
                    onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                    placeholder="Brief rationale shown after grading..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddQuestionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {savingQuestion ? 'Saving to Bank...' : 'Save Question to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
