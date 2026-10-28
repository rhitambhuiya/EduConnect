import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Download, 
  Eye, 
  Trash2, 
  Lock, 
  Unlock, 
  BookOpen, 
  Search, 
  Calendar, 
  Award,
  ArrowRight
} from 'lucide-react';
import { apiRequest, formatDateTime, formatTimeRemaining, formatFileSize, downloadFile } from '../../utils/api';
import StudentSubmitModal from './StudentSubmitModal';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending'); // pending | submitted | all
  const [search, setSearch] = useState('');
  
  // Submit modal state
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  
  // Delete confirm modal state
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/api/assignments/my-all');
      setAssignments(data);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDownloadTeacherFile = (asgId, fileName, inline = false) => {
    const url = `/api/assignments/${asgId}/attachment/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, fileName, inline).catch(err => alert(err.message));
  };

  const handleDownloadSubmissionFile = (subId, fileName, inline = false) => {
    const url = `/api/assignments/submissions/${subId}/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, fileName, inline).catch(err => alert(err.message));
  };

  // Confirm delete submission for re-upload
  const handleConfirmDeleteSubmission = async () => {
    if (!deletingAssignment) return;
    try {
      setIsDeleting(true);
      const res = await apiRequest(`/api/assignments/${deletingAssignment.id}/submission`, {
        method: 'DELETE'
      });
      setActionMsg({ text: res.message || 'Submission deleted. You can now re-upload.', type: 'success' });
      setDeletingAssignment(null);
      await fetchAssignments();
      setTimeout(() => setActionMsg({ text: '', type: '' }), 4500);
    } catch (err) {
      setActionMsg({ text: err.message || 'Failed to delete submission', type: 'error' });
      setDeletingAssignment(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const submittedCount = assignments.filter(a => a.status === 'submitted').length;
  const totalCount = assignments.length;

  const filteredAssignments = assignments.filter(a => {
    if (tab === 'pending' && a.status !== 'pending') return false;
    if (tab === 'submitted' && a.status !== 'submitted') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.className && a.className.toLowerCase().includes(q)) ||
        (a.classCode && a.classCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Academic Workflows</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Assignments & Deadlines
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track pending tasks, submit coursework before the deadline, and re-upload when authorized.
          </p>
        </div>

        {/* Quick count chips */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
              {pendingCount}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide block">Pending</span>
              <span className="text-xs text-amber-900 font-medium">Needs Submission</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              {submittedCount}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide block">Completed</span>
              <span className="text-xs text-emerald-900 font-medium">Turned In</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg({ text: '', type: '' })} className="hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'pending', label: `Pending (${pendingCount})`, icon: Clock },
            { id: 'submitted', label: `Submitted (${submittedCount})`, icon: CheckCircle2 },
            { id: 'all', label: `All (${totalCount})`, icon: FileText },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by assignment or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </div>

      {/* Assignment Cards List */}
      {loading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading your assignments...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center text-xs text-red-600">
          {error}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No assignments found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'pending'
              ? 'Awesome! You have no pending assignments right now.'
              : 'No assignments match the selected category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map(asg => {
            const timer = formatTimeRemaining(asg.dueDate);
            const isSubmitted = asg.status === 'submitted';
            const sub = asg.submission;

            return (
              <div
                key={asg.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${
                  isSubmitted
                    ? 'border-slate-200 hover:border-emerald-300'
                    : timer.isExpired
                    ? 'border-slate-200 opacity-90'
                    : timer.isUrgent
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                        {asg.classCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {asg.className}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-500" />
                        <span>{asg.totalPoints || 100} Points</span>
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {asg.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {asg.description}
                    </p>

                    {/* Teacher attachment if provided */}
                    {asg.attachment && (
                      <div className="mt-3 inline-flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-semibold text-slate-700 max-w-xs truncate">
                          {asg.attachment.originalName} ({formatFileSize(asg.attachment.fileSize)})
                        </span>
                        <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                          <button
                            onClick={() => handleDownloadTeacherFile(asg.id, asg.attachment.originalName, true)}
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            View
                          </button>
                          <span className="text-slate-300">/</span>
                          <button
                            onClick={() => handleDownloadTeacherFile(asg.id, asg.attachment.originalName, false)}
                            className="text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timeline and Policy strip */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Deadline: <strong className="text-slate-800">{formatDateTime(asg.dueDate)}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {asg.allowReupload ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Unlock className="w-3 h-3" />
                            <span>Re-uploads Allowed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <Lock className="w-3 h-3" />
                            <span>Re-uploads Locked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status & Action Button */}
                  <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Status Badge */}
                    <div>
                      {isSubmitted ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </div>
                      ) : timer.isExpired ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Past Due (Closed)</span>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          timer.isUrgent
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timer.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isSubmitted ? (
                      <div className="space-y-2 text-right">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-800 truncate max-w-[220px]">
                            {sub?.originalName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Uploaded {formatDateTime(sub?.submittedAt)}
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownloadSubmissionFile(sub.id, sub.originalName, true)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDownloadSubmissionFile(sub.id, sub.originalName, false)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-slate-500" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>

                        {/* Re-upload button if permitted */}
                        {asg.allowReupload && !timer.isExpired ? (
                          <button
                            onClick={() => setDeletingAssignment(asg)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete & Re-upload</span>
                          </button>
                        ) : !asg.allowReupload ? (
                          <span className="text-[11px] text-slate-400 block italic">
                            Re-upload locked by faculty
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        {!timer.isExpired ? (
                          <button
                            onClick={() => setSubmittingAssignment(asg)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Submit Assignment</span>
                          </button>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">
                            Submissions no longer accepted
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Assignment Modal */}
      <StudentSubmitModal
        isOpen={!!submittingAssignment}
        onClose={() => setSubmittingAssignment(null)}
        assignment={submittingAssignment}
        onSubmitted={async (sub) => {
          setActionMsg({ text: `Assignment "${submittingAssignment?.title}" was submitted successfully!`, type: 'success' });
          await fetchAssignments();
          setTimeout(() => setActionMsg({ text: '', type: '' }), 4500);
        }}
      />

      {/* Delete / Re-upload Confirmation Modal */}
      {deletingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Delete Submission & Re-upload?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to remove your submission for <strong className="text-slate-700">"{deletingAssignment.title}"</strong>? 
              Your current file will be permanently deleted and the assignment status will return to pending so you can upload a new version before the deadline.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAssignment(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubmission}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete & Re-upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
