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
  Plus
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function QuestionBankPickerModal({ isOpen, onClose, onSelectQuestions }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedSubject, setSelectedSubject] = useState('all'); // 'all' | 'DBMS' | 'OS' | 'Computer Networks' | 'Java'
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'single' | 'multiple' | 'paragraph'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected question IDs for importing
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      loadQuestionBank();
      setSelectedIds(new Set());
    }
  }, [isOpen]);

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

  // Filtered list
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Subject filter
      if (selectedSubject !== 'all' && q.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      // Type filter
      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesQ = q.question.toLowerCase().includes(query);
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
      const allFilteredSelected = filteredQuestions.every(q => next.has(q.id));
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
    onSelectQuestions(toAdd);
    onClose();
  };

  if (!isOpen) return null;

  const subjects = [
    { key: 'all', label: 'All Subjects', count: questions.length },
    { key: 'DBMS', label: 'DBMS', count: questions.filter(q => q.subject === 'DBMS').length },
    { key: 'OS', label: 'Operating Systems', count: questions.filter(q => q.subject === 'OS').length },
    { key: 'Computer Networks', label: 'Computer Networks', count: questions.filter(q => q.subject === 'Computer Networks').length },
    { key: 'Java', label: 'Java', count: questions.filter(q => q.subject === 'Java').length }
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Question Bank Database
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {questions.length} Verified Questions
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Teacher Only
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Select pre-configured questions with answer keys for DBMS, OS, Computer Networks, and Java
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white space-y-3">
          {/* Subject Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {subjects.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedSubject(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedSubject === s.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSubject === s.key ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {/* Type filters & Search input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {types.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedType(t.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedType === t.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question, keyword, or topic..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Quick Selection Helper */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                {allFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}
              </button>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Showing <strong>{filteredQuestions.length}</strong> questions
              </span>
            </div>

            <span className="font-bold text-indigo-700">
              {selectedIds.size} question{selectedIds.size === 1 ? '' : 's'} selected
            </span>
          </div>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/50">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading Question Bank Database...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No questions match your criteria</h4>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching subject tabs.</p>
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
                  onClick={() => toggleSelect(q.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {q.subject}
                        </span>
                        {q.topic && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            • {q.topic}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isSingle
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isMultiple
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isSingle ? 'Single MCQ' : isMultiple ? 'Multi MCQ' : 'Paragraph'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 ml-auto">
                          {q.points} Points
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
            <strong>{selectedIds.size}</strong> of {filteredQuestions.length} questions ready to insert
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Selected Questions ({selectedIds.size})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

