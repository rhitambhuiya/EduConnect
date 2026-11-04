import React, { useState, useEffect } from 'react';
import { 
  FileText, 
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
  Eye, 
  Download,
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { apiRequest, formatDateTime, formatTimeRemaining, downloadFile } from '../../utils/api';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import TeacherSubmissionsModal from './TeacherSubmissionsModal';

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | expired

  // Modal states
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [rosterAssignment, setRosterAssignment] = useState(null);

  // Delete modal state
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerMsg, setBannerMsg] = useState({ text: '', type: '' });

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [asgData, classData] = await Promise.all([
        apiRequest('/api/assignments/teacher/all'),
        apiRequest('/api/classes')
      ]);
      setAssignments(asgData || []);
      setClasses(classData || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load assignments');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showBanner = (text, type = 'success') => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg({ text: '', type: '' }), 4000);
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      setIsDeleting(true);
      await apiRequest(`/api/assignments/${assignmentToDelete.id}`, { method: 'DELETE' });
      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      showBanner(`Assignment "${assignmentToDelete.title}" deleted successfully.`, 'success');
      setAssignmentToDelete(null);
    } catch (err) {
      showBanner(err.message || 'Failed to delete assignment', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadAttachment = (asgId, fileName) => {
    const url = `/api/assignments/${asgId}/attachment/download?view=inline`;
    downloadFile(url, fileName, true).catch(err => alert(err.message));
  };

  // Stats calculation
  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter(a => !a.isExpired).length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (Number(a.submittedCount ?? a.submissionCount) || 0), 0);
  const totalGraded = assignments.reduce((acc, a) => acc + (Number(a.gradedCount) || 0), 0);

  // Filtered assignments
  const filteredAssignments = assignments.filter(a => {
    if (selectedClassFilter !== 'all' && a.classId !== selectedClassFilter) {
      return false;
    }
    if (statusFilter === 'active' && a.isExpired) return false;
    if (statusFilter === 'expired' && !a.isExpired) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchDesc = (a.description || '').toLowerCase().includes(q);
      const matchClass = (a.className || '').toLowerCase().includes(q) || (a.classCode || '').toLowerCase().includes(q);
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
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Assignments</h1>
              <p className="text-sm text-slate-500">
                Schedule new assignments for any of your classes, review submissions, and enter grades.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingAssignment(null);
            setAssignmentModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule Assignment
        </button>
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

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assignments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalAssignments}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open / Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeAssignments}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalSubmissions}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Graded</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalGraded}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, instruction, or course..."
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
              <option value="active">Active / Due Soon</option>
              <option value="expired">Closed / Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Listing */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500">Loading assignments across your classes...</p>
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
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No assignments found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || selectedClassFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or class filters.'
              : 'You haven\'t scheduled any assignments yet. Click "+ Schedule Assignment" to get started.'}
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
                setEditingAssignment(null);
                setAssignmentModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Schedule Your First Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((assignment) => {
            const submittedCount = Number(assignment.submittedCount ?? assignment.submissionCount) || 0;
            const totalEnrolled = Number(assignment.totalEnrolled) || 0;
            const isDueSoon = !assignment.isExpired && (new Date(assignment.dueDate) - new Date()) < 24 * 60 * 60 * 1000;
            const submissionPercent = totalEnrolled > 0 
              ? Math.min(100, Math.round((submittedCount / totalEnrolled) * 100))
              : 0;

            return (
              <div 
                key={assignment.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3.5">
                  {/* Card Header: Class Badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100 max-w-[200px] truncate">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{assignment.classCode ? `${assignment.classCode} • ` : ''}{assignment.className}</span>
                    </span>

                    {assignment.isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Closed
                      </span>
                    ) : isDueSoon ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        Due Soon
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {assignment.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {assignment.description || 'No additional instructions provided.'}
                    </p>
                  </div>

                  {/* Attachment indicator if present */}
                  {assignment.fileUrl && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleDownloadAttachment(assignment.id, assignment.fileName || 'Assignment-Attachment.pdf')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate max-w-[170px]">{assignment.fileName || 'Attachment.pdf'}</span>
                        <Download className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  )}

                  {/* Due Date & Points Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(assignment.dueDate)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-slate-600">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-slate-800">{assignment.totalPoints || 100} Points</span>
                    </div>
                  </div>

                  {/* Submission Progress bar */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Submissions
                      </span>
                      <span className="font-bold text-slate-900">
                        {submittedCount} / {totalEnrolled}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${submissionPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Graded: <strong className="text-indigo-600 font-semibold">{assignment.gradedCount || 0}</strong></span>
                      <span>{submissionPercent}% submitted</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setRosterAssignment(assignment)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Review & Grade
                  </button>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                    <button
                      onClick={() => {
                        setEditingAssignment(assignment);
                        setAssignmentModalOpen(true);
                      }}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-2xs hover:shadow-xs"
                      title="Edit Assignment"
                      aria-label="Edit Assignment"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAssignmentToDelete(assignment)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 shadow-2xs hover:shadow-xs"
                      title="Delete Assignment"
                      aria-label="Delete Assignment"
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

      {/* Schedule / Edit Assignment Modal */}
      <TeacherAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false);
          setEditingAssignment(null);
        }}
        classId={editingAssignment ? editingAssignment.classId : null}
        assignment={editingAssignment}
        classes={classes}
        onSaved={async () => {
          showBanner(
            editingAssignment 
              ? 'Assignment updated successfully!' 
              : 'Assignment scheduled and published successfully!',
            'success'
          );
          await loadData();
        }}
      />

      {/* Submissions & Grading Roster Modal */}
      {rosterAssignment && (
        <TeacherSubmissionsModal
          isOpen={!!rosterAssignment}
          onClose={() => setRosterAssignment(null)}
          assignment={rosterAssignment}
          onAssignmentUpdated={async () => {
            await loadData(true);
          }}
        />
      )}

      {/* Delete Assignment Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Delete Assignment</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{assignmentToDelete.title}"</span>? All student submissions and associated marks will be permanently removed.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteAssignment}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

