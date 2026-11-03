import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Eye, 
  FileText, 
  Search, 
  Lock, 
  Unlock, 
  FileCheck,
  Calendar,
  MessageSquare,
  Award,
  Edit3,
  Save,
  Check,
  Sparkles
} from 'lucide-react';
import { apiRequest, formatDateTime, formatFileSize, downloadFile } from '../../utils/api';

export default function TeacherSubmissionsModal({ isOpen, onClose, assignment, onAssignmentUpdated }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | submitted | graded | pending
  const [search, setSearch] = useState('');
  const [togglingReupload, setTogglingReupload] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(assignment);

  // Grading State
  const [activeGradingId, setActiveGradingId] = useState(null);
  const [gradingInputs, setGradingInputs] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [gradeMsg, setGradeMsg] = useState({ id: null, text: '', isError: false });

  const fetchRoster = async () => {
    if (!assignment) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest(`/api/assignments/${assignment.id}/submissions`);
      setReport(data);
      setCurrentAssignment(data.assignment);
    } catch (err) {
      setError(err.message || 'Failed to load submissions report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assignment) {
      setCurrentAssignment(assignment);
      setActiveGradingId(null);
      setGradeMsg({ id: null, text: '', isError: false });
      fetchRoster();
    }
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  // Handle Quick Toggle Re-upload
  const handleToggleReupload = async () => {
    try {
      setTogglingReupload(true);
      const res = await apiRequest(`/api/assignments/${assignment.id}/toggle-reupload`, {
        method: 'PATCH'
      });
      setCurrentAssignment(res.assignment);
      if (onAssignmentUpdated) {
        onAssignmentUpdated(res.assignment);
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle re-upload setting');
    } finally {
      setTogglingReupload(false);
    }
  };

  const handleDownload = (submissionId, originalName, inline = false) => {
    const url = `/api/assignments/submissions/${submissionId}/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, originalName, inline).catch(err => alert(err.message));
  };

  // Start Grading a Student Submission
  const handleOpenGrading = (sub) => {
    setActiveGradingId(sub.id);
    setGradingInputs(prev => ({
      ...prev,
      [sub.id]: {
        marks: sub.marks !== null && sub.marks !== undefined ? String(sub.marks) : '',
        feedback: sub.feedback || ''
      }
    }));
    setGradeMsg({ id: null, text: '', isError: false });
  };

  // Save Student Grade & Feedback
  const handleSaveGrade = async (subId) => {
    const input = gradingInputs[subId] || { marks: '', feedback: '' };
    const maxPoints = currentAssignment?.totalPoints || 100;

    if (input.marks !== '' && input.marks !== null && input.marks !== undefined) {
      const num = Number(input.marks);
      if (isNaN(num) || num < 0 || num > maxPoints) {
        setGradeMsg({ id: subId, text: `Marks must be between 0 and ${maxPoints}.`, isError: true });
        return;
      }
    }

    setSavingGradeId(subId);
    setGradeMsg({ id: null, text: '', isError: false });

    try {
      const res = await apiRequest(`/api/assignments/submissions/${subId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({
          marks: input.marks !== '' ? Number(input.marks) : null,
          feedback: input.feedback
        })
      });

      // Update local report data immediately
      setReport(prev => {
        if (!prev || !prev.roster) return prev;
        const updatedRoster = prev.roster.map(item => {
          if (item.submission && item.submission.id === subId) {
            return {
              ...item,
              submission: {
                ...item.submission,
                marks: res.submission.marks,
                feedback: res.submission.feedback,
                gradedAt: res.submission.gradedAt,
                gradedBy: res.submission.gradedBy
              }
            };
          }
          return item;
        });

        const newGradedCount = updatedRoster.filter(r => r.submission && r.submission.marks !== null && r.submission.marks !== undefined).length;
        return {
          ...prev,
          gradedCount: newGradedCount,
          roster: updatedRoster
        };
      });

      if (onAssignmentUpdated) {
        onAssignmentUpdated();
      }

      setGradeMsg({ id: subId, text: 'Marks & feedback saved successfully! ✓', isError: false });
      setTimeout(() => {
        setActiveGradingId(null);
        setGradeMsg({ id: null, text: '', isError: false });
      }, 1500);
    } catch (err) {
      setGradeMsg({ id: subId, text: err.message || 'Failed to save grade', isError: true });
    } finally {
      setSavingGradeId(null);
    }
  };

  const roster = report?.roster || [];
  const submittedCount = report?.submittedCount || 0;
  const totalEnrolled = report?.totalEnrolled || 0;
  const pendingCount = report?.pendingCount || 0;
  const gradedCount = report?.gradedCount || roster.filter(r => r.submission && r.submission.marks !== null && r.submission.marks !== undefined).length;
  const maxPoints = currentAssignment?.totalPoints || 100;
  const submissionRate = totalEnrolled > 0 ? Math.round((submittedCount / totalEnrolled) * 100) : 0;

  const filteredRoster = roster.filter(item => {
    if (filter === 'submitted' && !item.hasSubmitted) return false;
    if (filter === 'pending' && item.hasSubmitted) return false;
    if (filter === 'graded' && (!item.submission || item.submission.marks === null || item.submission.marks === undefined)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Assignment Grading & Roster
              </span>
              <span className="text-xs text-slate-400">
                Deadline: {formatDateTime(currentAssignment?.dueDate)} &bull; {maxPoints} Max Points
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {currentAssignment?.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl line-clamp-1">
              {currentAssignment?.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control & Stat Strip */}
        <div className="p-5 border-b border-slate-200 bg-white grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Stat 1: Enrolled */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
              Enrolled Students
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">{totalEnrolled}</span>
            </div>
          </div>

          {/* Stat 2: Submitted */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block">
              Submitted ({submissionRate}%)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-900">{submittedCount}</span>
            </div>
          </div>

          {/* Stat 3: Graded */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/60">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide block">
              Graded Submissions
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Award className="w-4 h-4 text-indigo-600" />
              <span className="text-xl font-bold text-indigo-950">
                {gradedCount} <span className="text-xs font-normal text-slate-500">/ {submittedCount}</span>
              </span>
            </div>
          </div>

          {/* Stat 4: Pending */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide block">
              Pending Submissions
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xl font-bold text-amber-900">{pendingCount}</span>
            </div>
          </div>

          {/* Quick Toggle for Re-upload */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-center col-span-2 md:col-span-1">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Re-upload Rule
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                currentAssignment?.allowReupload
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {currentAssignment?.allowReupload ? 'ALLOWED' : 'LOCKED'}
              </span>
            </div>
            <button
              onClick={handleToggleReupload}
              disabled={togglingReupload}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                currentAssignment?.allowReupload
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {currentAssignment?.allowReupload ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Lock Re-uploads</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  <span>Allow Re-uploads</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
            {[
              { id: 'all', label: `All (${totalEnrolled})` },
              { id: 'submitted', label: `Submitted (${submittedCount})` },
              { id: 'graded', label: `Graded (${gradedCount})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
        </div>

        {/* Roster List / Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading submission records...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-600">
              {error}
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No students found matching your filter</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search keyword or switching tabs.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRoster.map(item => {
                const sub = item.submission;
                const isPdf = sub?.originalName?.toLowerCase().endsWith('.pdf');
                const isGraded = sub && sub.marks !== null && sub.marks !== undefined;
                const isGradingThis = activeGradingId === sub?.id;
                const formInput = (sub && gradingInputs[sub.id]) || { marks: '', feedback: '' };

                return (
                  <div
                    key={item.studentId}
                    className={`p-4 rounded-xl border transition-all ${
                      item.hasSubmitted
                        ? isGraded
                          ? 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                          : 'bg-white border-amber-200 shadow-xs hover:border-amber-300'
                        : 'bg-slate-50/70 border-dashed border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          item.hasSubmitted
                            ? isGraded
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {item.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{item.studentName}</span>
                            {item.hasSubmitted ? (
                              isGraded ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Marks: {sub.marks} / {maxPoints}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Needs Grading</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <Clock className="w-3 h-3" />
                                <span>Not Submitted</span>
                              </span>
                            )}
                            {item.hasSubmitted && item.isLate && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                LATE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block">{item.studentEmail}</span>
                        </div>
                      </div>

                      {/* Submission Details & Actions */}
                      {item.hasSubmitted ? (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="text-right sm:border-r border-slate-200 pr-3 sm:block">
                            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 justify-end">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDateTime(sub.submittedAt)}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {sub.originalName} ({formatFileSize(sub.fileSize)})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownload(sub.id, sub.originalName, true)}
                              title="View Document"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View {isPdf ? 'PDF' : 'File'}</span>
                            </button>
                            <button
                              onClick={() => handleDownload(sub.id, sub.originalName, false)}
                              title="Download Submission"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            
                            {/* MARK / GRADE BUTTON */}
                            <button
                              onClick={() => isGradingThis ? setActiveGradingId(null) : handleOpenGrading(sub)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                isGradingThis
                                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                                  : isGraded
                                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-2xs'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'
                              }`}
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{isGradingThis ? 'Close Grading' : isGraded ? 'Edit Marks' : 'Mark Assignment'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">
                          Awaiting student submission
                        </div>
                      )}
                    </div>

                    {/* Student notes if any */}
                    {item.hasSubmitted && sub?.notes && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50/80 p-2 rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>Student Note: <em className="text-slate-800">"{sub.notes}"</em></span>
                      </div>
                    )}

                    {/* Teacher Feedback Preview (when not in edit mode) */}
                    {item.hasSubmitted && isGraded && !isGradingThis && sub.feedback && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-indigo-900 bg-indigo-50/50 p-2.5 rounded-lg flex items-start justify-between gap-3">
                        <div className="flex items-start gap-1.5">
                          <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-indigo-950 block text-[11px] uppercase tracking-wide">
                              Feedback to Student:
                            </span>
                            <span className="italic">"{sub.feedback}"</span>
                          </div>
                        </div>
                        {sub.gradedAt && (
                          <span className="text-[10px] text-indigo-500 shrink-0">
                            Marked on {new Date(sub.gradedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* INLINE GRADING FORM (When teacher clicks Mark / Edit Marks) */}
                    {isGradingThis && (
                      <div className="mt-3 pt-3 border-t border-indigo-100 bg-linear-to-r from-indigo-50/70 to-blue-50/70 p-4 rounded-xl border border-indigo-200 animate-in fade-in space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-indigo-600" />
                            Grade Submission for {item.studentName}
                          </h4>
                          <span className="text-xs font-semibold text-slate-500">
                            Assignment Max: <strong className="text-slate-800">{maxPoints} pts</strong>
                          </span>
                        </div>

                        {gradeMsg.id === sub.id && gradeMsg.text && (
                          <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                            gradeMsg.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {gradeMsg.isError ? <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            <span>{gradeMsg.text}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Marks Input */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                              Marks Awarded <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max={maxPoints}
                                step="any"
                                value={formInput.marks}
                                onChange={(e) => setGradingInputs(prev => ({
                                  ...prev,
                                  [sub.id]: {
                                    ...formInput,
                                    marks: e.target.value
                                  }
                                }))}
                                placeholder={`0 - ${maxPoints}`}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                                / {maxPoints}
                              </span>
                            </div>

                            {/* Quick score presets */}
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setGradingInputs(prev => ({ ...prev, [sub.id]: { ...formInput, marks: String(maxPoints) } }))}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200 cursor-pointer"
                              >
                                Full ({maxPoints})
                              </button>
                              <button
                                type="button"
                                onClick={() => setGradingInputs(prev => ({ ...prev, [sub.id]: { ...formInput, marks: String(Math.round(maxPoints * 0.9)) } }))}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200 cursor-pointer"
                              >
                                90% ({Math.round(maxPoints * 0.9)})
                              </button>
                              <button
                                type="button"
                                onClick={() => setGradingInputs(prev => ({ ...prev, [sub.id]: { ...formInput, marks: String(Math.round(maxPoints * 0.75)) } }))}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200 cursor-pointer"
                              >
                                75% ({Math.round(maxPoints * 0.75)})
                              </button>
                            </div>
                          </div>

                          {/* Feedback / Remarks */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                              Feedback & Remarks for Student (Optional)
                            </label>
                            <textarea
                              rows={2}
                              value={formInput.feedback}
                              onChange={(e) => setGradingInputs(prev => ({
                                ...prev,
                                [sub.id]: {
                                  ...formInput,
                                  feedback: e.target.value
                                }
                              }))}
                              placeholder="e.g. Excellent pseudo-code analysis and clear explanation of asymptotic bounds."
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                        </div>

                        {/* Grading Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
                          <button
                            type="button"
                            onClick={() => setActiveGradingId(null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingGradeId === sub.id}
                            onClick={() => handleSaveGrade(sub.id)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingGradeId === sub.id ? 'Saving Grade...' : 'Save Marks & Feedback'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredRoster.length} of {totalEnrolled} students ({gradedCount} graded)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
}
