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
  MessageSquare
} from 'lucide-react';
import { apiRequest, formatDateTime, formatFileSize, downloadFile } from '../../utils/api';

export default function TeacherSubmissionsModal({ isOpen, onClose, assignment, onAssignmentUpdated }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | submitted | pending
  const [search, setSearch] = useState('');
  const [togglingReupload, setTogglingReupload] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(assignment);

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

  const roster = report?.roster || [];
  const filteredRoster = roster.filter(item => {
    if (filter === 'submitted' && !item.hasSubmitted) return false;
    if (filter === 'pending' && item.hasSubmitted) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const submittedCount = report?.submittedCount || 0;
  const pendingCount = report?.pendingCount || 0;
  const totalEnrolled = report?.totalEnrolled || 0;
  const submissionRate = totalEnrolled > 0 ? Math.round((submittedCount / totalEnrolled) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Submissions & Attendance
              </span>
              <span className="text-xs text-slate-400">
                Due: {formatDateTime(currentAssignment?.dueDate)}
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
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control & Stat Strip */}
        <div className="p-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Stat 1 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
              Enrolled Students
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">{totalEnrolled}</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block">
              Submitted ({submissionRate}%)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-900">{submittedCount}</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide block">
              Pending / Missing
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xl font-bold text-amber-900">{pendingCount}</span>
            </div>
          </div>

          {/* Quick Toggle for Re-upload */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-center">
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
              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                currentAssignment?.allowReupload
                  ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {currentAssignment?.allowReupload ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Re-uploads</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Allow Re-uploads</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: `All (${totalEnrolled})` },
              { id: 'submitted', label: `Submitted (${submittedCount})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
            <div className="space-y-3">
              {filteredRoster.map(item => {
                const sub = item.submission;
                const isPdf = sub?.originalName?.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={item.studentId}
                    className={`p-4 rounded-xl border transition-all ${
                      item.hasSubmitted
                        ? 'bg-white border-slate-200 shadow-xs hover:border-blue-200'
                        : 'bg-slate-50/70 border-dashed border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          item.hasSubmitted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{item.studentName}</span>
                            {item.hasSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Submitted</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Not Submitted</span>
                              </span>
                            )}
                            {item.hasSubmitted && item.isLate && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View {isPdf ? 'PDF' : 'File'}</span>
                            </button>
                            <button
                              onClick={() => handleDownload(sub.id, sub.originalName, false)}
                              title="Download Submission"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
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
                        <span className="italic">"{sub.notes}"</span>
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
            Showing {filteredRoster.length} of {totalEnrolled} students
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-xs transition-colors"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
}
