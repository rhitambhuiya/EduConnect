import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BookOpen, 
  User, 
  FileText, 
  Megaphone, 
  Download, 
  Eye, 
  ChevronLeft, 
  AlertCircle, 
  Clock, 
  FileCheck, 
  CheckCircle2,
  Calendar,
  UploadCloud,
  Trash2,
  Lock,
  Award,
  CheckSquare
} from 'lucide-react';
import { apiRequest, formatDate, formatDateTime, formatFileSize, downloadFile, formatTimeRemaining } from '../../utils/api';
import StudentSubmitModal from './StudentSubmitModal';
import TakeQuizModal from './TakeQuizModal';
import QuizResultsModal from './QuizResultsModal';

export default function StudentClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview | notes | assignments | announcements
  const [cls, setCls] = useState(null);
  const [notes, setNotes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submit & Delete assignment state
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [assignmentMsg, setAssignmentMsg] = useState({ text: '', type: '' });

  // Quiz Modal State
  const [takingQuizId, setTakingQuizId] = useState(null);
  const [reviewingQuizId, setReviewingQuizId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [classData, notesData, annData, assignmentsData, quizzesData] = await Promise.all([
        apiRequest(`/api/classes/${id}`),
        apiRequest(`/api/classes/${id}/notes`),
        apiRequest(`/api/classes/${id}/announcements`),
        apiRequest(`/api/assignments/class/${id}`).catch(() => []),
        apiRequest(`/api/quizzes/class/${id}`).catch(() => []),
      ]);
      setCls(classData);
      setNotes(notesData);
      setAnnouncements(annData);
      setAssignments(assignmentsData || []);
      setQuizzes(quizzesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Helper for downloading/viewing a note
  const handleDownloadNote = (noteId, fileName, inline = false) => {
    const token = localStorage.getItem('cp_token');
    const url = `/api/notes/${noteId}/download${inline ? '?view=inline' : ''}`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const objectUrl = window.URL.createObjectURL(blob);
        if (inline) {
          window.open(objectUrl, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      })
      .catch(err => alert(err.message || 'Error downloading study material'));
  };

  const handleDownloadAssignmentAttachment = (asgId, fileName, inline = false) => {
    const url = `/api/assignments/${asgId}/attachment/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, fileName, inline).catch(err => alert(err.message));
  };

  const handleDownloadSubmissionFile = (subId, fileName, inline = false) => {
    const url = `/api/assignments/submissions/${subId}/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, fileName, inline).catch(err => alert(err.message));
  };

  const handleConfirmDeleteSubmission = async () => {
    if (!deletingAssignment) return;
    try {
      setIsDeletingSubmission(true);
      const res = await apiRequest(`/api/assignments/${deletingAssignment.id}/submission`, {
        method: 'DELETE'
      });
      setAssignmentMsg({ text: res.message || 'Submission deleted. You can now re-upload.', type: 'success' });
      setDeletingAssignment(null);
      await loadData();
      setTimeout(() => setAssignmentMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setAssignmentMsg({ text: err.message || 'Failed to delete submission', type: 'error' });
      setDeletingAssignment(null);
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading course materials...</p>
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {error || 'You are not enrolled in this class or it does not exist.'}
        </p>
        <Link
          to="/student/browse"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Browse Available Classes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/student/classes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>My Classes</span>
        </Link>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-xs font-medium text-slate-700 truncate">{cls.name}</span>
      </div>

      {/* Class Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                {cls.code}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enrolled</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{cls.name}</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              {cls.description}
            </p>
          </div>

          {/* Instructor Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Course Instructor</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {cls.teacherName ? cls.teacherName.charAt(0) : 'T'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{cls.teacherName}</div>
                <div className="text-[11px] text-slate-500">Faculty</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Tabs */}
      <div className="border-b border-slate-200 flex gap-2 sm:gap-4 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: BookOpen },
          { key: 'notes', label: `Notes & Study Materials (${notes.length})`, icon: FileText },
          { key: 'assignments', label: `Assignments (${assignments.length})`, icon: Calendar },
          { key: 'quizzes', label: `Quizzes (${quizzes.length})`, icon: CheckSquare },
          { key: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4">Course Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Course Code</span>
                  <span className="text-sm font-bold text-slate-800">{cls.code}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Instructor</span>
                  <span className="text-sm font-bold text-slate-800">{cls.teacherName}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Available Materials</span>
                  <span className="text-sm font-bold text-slate-800">{notes.length} Study Documents</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Announcements</span>
                  <span className="text-sm font-bold text-slate-800">{announcements.length} Published Updates</span>
                </div>
              </div>
            </div>

            {/* Latest Announcement Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Latest Course Notice</h2>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View All Announcements
                </button>
              </div>

              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No announcements from your professor yet.</p>
              ) : (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-slate-900">{announcements[0].title}</h4>
                    <span className="text-[11px] text-slate-400">{formatDate(announcements[0].createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {announcements[0].content}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Side Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Lecture Notes</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Review and download all lecture slides, reading materials, and documents posted by {cls.teacherName}.
              </p>
              <button
                onClick={() => setActiveTab('notes')}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Access Notes ({notes.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Notes / Study Materials (View & Download Only) */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Course Study Materials</h3>
              <p className="text-xs text-slate-500">Materials provided by your instructor for download and study</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {notes.length} {notes.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {notes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No notes uploaded by the instructor yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">Please check back later for class slides and assignments.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map((note) => (
                <div key={note.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <h4 className="text-sm font-bold text-slate-800 truncate">{note.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="truncate max-w-[200px] text-slate-600 font-medium">{note.originalName}</span>
                      <span>&bull;</span>
                      <span>{formatFileSize(note.fileSize)}</span>
                      <span>&bull;</span>
                      <span>Uploaded {formatDate(note.uploadedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadNote(note.id, note.originalName, true)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDownloadNote(note.id, note.originalName, false)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Action Message Banner */}
          {assignmentMsg.text && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
              assignmentMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {assignmentMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{assignmentMsg.text}</span>
              </div>
              <button onClick={() => setAssignmentMsg({ text: '', type: '' })} className="hover:opacity-75">✕</button>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assignments & Problem Sets</h2>
              <p className="text-xs text-slate-500 mt-1">
                View required submissions, monitor deadlines, and upload your PDF coursework.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              {assignments.length} Course {assignments.length === 1 ? 'Assignment' : 'Assignments'}
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No assignments posted for this course</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your professor has not scheduled any assignments for this course yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(asg => {
                const timer = formatTimeRemaining(asg.dueDate);
                const isSubmitted = asg.status === 'submitted';
                const sub = asg.submission;

                return (
                  <div
                    key={asg.id}
                    className={`bg-white rounded-2xl border p-6 transition-all shadow-xs ${
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
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            {cls.code}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{asg.totalPoints || 100} Points</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            timer.isExpired
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : timer.isUrgent
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{timer.text}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {asg.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {asg.description}
                        </p>

                        {/* Teacher Attachment File */}
                        {asg.attachment && (
                          <div className="mt-3 inline-flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold text-slate-700 max-w-xs truncate">
                              {asg.attachment.originalName} ({formatFileSize(asg.attachment.fileSize)})
                            </span>
                            <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                              <button
                                onClick={() => handleDownloadAssignmentAttachment(asg.id, asg.attachment.originalName, true)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                View
                              </button>
                              <span className="text-slate-300">/</span>
                              <button
                                onClick={() => handleDownloadAssignmentAttachment(asg.id, asg.attachment.originalName, false)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        )}

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

                      {/* Right: Submission Status & Action */}
                      <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
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
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Submission</span>
                            </div>
                          )}
                        </div>

                        {/* Submission card info or submit button */}
                        {isSubmitted ? (
                          <div className="space-y-2 text-right">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                              <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                                {sub?.originalName}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Submitted {formatDateTime(sub?.submittedAt)}
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
        </div>
      )}

      {/* Tab 3: Announcements (View Only) */}
      {activeTab === 'announcements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Professor Announcements</h3>
              <p className="text-xs text-slate-500">Official updates for students enrolled in {cls.code}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No announcements posted for this course yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-5 sm:p-6 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(ann.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                  <div className="pt-1 text-[11px] text-slate-400">
                    Posted by Instructor <span className="font-semibold text-slate-700">{ann.teacherName || cls.teacherName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Course Quizzes & Assessments</h2>
              <p className="text-xs text-slate-500 mt-1">
                Complete scheduled quizzes within their designated timelines. MCQs are graded automatically and paragraph questions are reviewed by your instructor.
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
              {quizzes.filter(q => q.hasAttempted).length} / {quizzes.length} Completed
            </div>
          </div>

          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No quizzes scheduled yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Your instructor has not scheduled any quizzes for this course yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quizzes.map(quiz => {
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
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{quiz.totalPoints} Marks</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{quiz.durationMinutes} Mins</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {quiz.questionCount} Questions
                        </span>

                        {quiz.hasAttempted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Attempted
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Closed / Expired
                          </span>
                        ) : isUpcoming ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Starts Soon
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                            Active Now
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

                      <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <div>
                          <span className="font-semibold text-slate-700">Available:</span>{' '}
                          {new Date(quiz.startTime).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Due:</span>{' '}
                          {new Date(quiz.endTime).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end justify-between gap-3 self-stretch">
                      {quiz.hasAttempted && quiz.attempt && (
                        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 min-w-[170px]">
                          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                            Your Score
                          </div>
                          <div className="text-xl font-black text-emerald-950 mt-0.5">
                            {quiz.attempt.totalScore} <span className="text-xs font-normal text-slate-500">/ {quiz.totalPoints} pts</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {quiz.attempt.isGraded ? 'Graded' : 'Pending Paragraph Review'}
                          </div>
                        </div>
                      )}

                      <div>
                        {quiz.hasAttempted ? (
                          <button
                            onClick={() => setReviewingQuizId(quiz.id)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200"
                          >
                            View Answers & Summary
                          </button>
                        ) : isExpired ? (
                          <button
                            onClick={() => setReviewingQuizId(quiz.id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                          >
                            View Summary
                          </button>
                        ) : isUpcoming ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                          >
                            Opens at {new Date(quiz.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ) : (
                          <button
                            onClick={() => setTakingQuizId(quiz.id)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                          >
                            Take Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Student Submit Modal */}
      <StudentSubmitModal
        isOpen={!!submittingAssignment}
        onClose={() => setSubmittingAssignment(null)}
        assignment={submittingAssignment}
        onSubmitted={async () => {
          setAssignmentMsg({ text: 'Assignment submitted successfully!', type: 'success' });
          await loadData();
          setTimeout(() => setAssignmentMsg({ text: '', type: '' }), 4000);
        }}
      />

      {/* Delete Submission Confirm Modal */}
      {deletingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeletingSubmission && setDeletingAssignment(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Submission & Re-upload?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to delete your previous submission for <strong className="text-slate-800 font-semibold">"{deletingAssignment.title}"</strong>? Your file will be removed and you will be able to upload a new version before the deadline.
            </p>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingSubmission}
                onClick={() => setDeletingAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSubmission}
                onClick={handleConfirmDeleteSubmission}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingSubmission ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingSubmission ? 'Deleting...' : 'Yes, Delete & Re-upload'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Take Quiz Modal */}
      <TakeQuizModal
        isOpen={!!takingQuizId}
        onClose={() => setTakingQuizId(null)}
        quizId={takingQuizId}
        onQuizSubmitted={() => {
          loadData();
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
