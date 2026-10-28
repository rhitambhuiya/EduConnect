import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Megaphone, 
  UploadCloud, 
  Download, 
  Eye, 
  PlusCircle, 
  Calendar, 
  Clock, 
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  UserCheck,
  Trash2,
  X,
  UserMinus,
  Lock,
  Unlock,
  Edit3,
  Award,
  CheckSquare,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { apiRequest, formatDate, formatDateTime, formatFileSize, downloadFile, formatTimeRemaining } from '../../utils/api';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import TeacherSubmissionsModal from './TeacherSubmissionsModal';
import TeacherQuizModal from './TeacherQuizModal';
import TeacherQuizReviewModal from './TeacherQuizReviewModal';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview | notes | announcements | assignments | students
  const [cls, setCls] = useState(null);
  const [notes, setNotes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [uploadingNote, setUploadingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null); // Custom modal confirmation state
  const [isDeleting, setIsDeleting] = useState(false);
  const [noteMsg, setNoteMsg] = useState({ text: '', type: '' });

  // Student Deroll State
  const [studentToDeroll, setStudentToDeroll] = useState(null); // Custom modal confirmation state
  const [isDerolling, setIsDerolling] = useState(false);
  const [studentMsg, setStudentMsg] = useState({ text: '', type: '' });

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [annMsg, setAnnMsg] = useState({ text: '', type: '' });

  // Assignment Modals & Action State
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [rosterAssignment, setRosterAssignment] = useState(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const [assignmentMsg, setAssignmentMsg] = useState({ text: '', type: '' });
  const [togglingId, setTogglingId] = useState(null);

  // Quiz State
  const [quizzes, setQuizzes] = useState([]);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [reviewQuizId, setReviewQuizId] = useState(null);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
  const [quizMsg, setQuizMsg] = useState({ text: '', type: '' });

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const [classData, notesData, annData, studentsData, assignmentsData, quizzesData] = await Promise.all([
        apiRequest(`/api/classes/${id}`),
        apiRequest(`/api/classes/${id}/notes`),
        apiRequest(`/api/classes/${id}/announcements`),
        apiRequest(`/api/classes/${id}/students`),
        apiRequest(`/api/assignments/class/${id}`).catch(() => []),
        apiRequest(`/api/quizzes/class/${id}`).catch(() => []),
      ]);
      setCls(classData);
      setNotes(notesData);
      setAnnouncements(annData);
      setStudents(studentsData);
      setAssignments(assignmentsData || []);
      setQuizzes(quizzesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  // Handle Note Upload
  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteFile) {
      setNoteMsg({ text: 'Please provide both title and a file to upload.', type: 'error' });
      return;
    }

    setUploadingNote(true);
    setNoteMsg({ text: '', type: '' });

    const formData = new FormData();
    formData.append('title', noteTitle.trim());
    formData.append('file', noteFile);

    try {
      const res = await apiRequest(`/api/classes/${id}/notes`, {
        method: 'POST',
        body: formData
      });
      setNotes(prev => [res.note, ...prev]);
      setNoteTitle('');
      setNoteFile(null);
      // Reset input element
      e.target.reset();
      setNoteMsg({ text: 'Study material uploaded successfully!', type: 'success' });
      setTimeout(() => setNoteMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setNoteMsg({ text: err.message || 'Failed to upload note', type: 'error' });
    } finally {
      setUploadingNote(false);
    }
  };

  // Handle Create Announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      setAnnMsg({ text: 'Please fill in both title and announcement message.', type: 'error' });
      return;
    }

    setPostingAnn(true);
    setAnnMsg({ text: '', type: '' });

    try {
      const res = await apiRequest(`/api/classes/${id}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: annTitle.trim(),
          content: annContent.trim()
        })
      });
      setAnnouncements(prev => [res.announcement, ...prev]);
      setAnnTitle('');
      setAnnContent('');
      setAnnMsg({ text: 'Announcement published successfully!', type: 'success' });
      setTimeout(() => setAnnMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setAnnMsg({ text: err.message || 'Failed to post announcement', type: 'error' });
    } finally {
      setPostingAnn(false);
    }
  };

  // Helper for downloading a note
  const handleDownloadNote = (noteId, fileName, inline = false) => {
    const token = localStorage.getItem('cp_token');
    const url = `/api/notes/${noteId}/download${inline ? '?view=inline' : ''}`;
    
    // Create an authenticated download by fetching blob or opening in tab
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
      .catch(err => alert(err.message || 'Error downloading file'));
  };

  // Handle Request Delete Note (Opens special custom modal)
  const handleRequestDeleteNote = (note) => {
    setNoteToDelete(note);
  };

  // Handle Confirm Delete Note (Executes deletion from modal)
  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    setNoteMsg({ text: '', type: '' });

    try {
      await apiRequest(`/api/notes/${noteToDelete.id}`, {
        method: 'DELETE'
      });
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setNoteMsg({ text: `"${noteToDelete.title}" was deleted successfully!`, type: 'success' });
      setNoteToDelete(null);
      setTimeout(() => setNoteMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setNoteMsg({ text: err.message || 'Failed to delete study material', type: 'error' });
      setNoteToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Confirm Deroll Student (Executes unenrollment from modal)
  const handleConfirmDerollStudent = async () => {
    if (!studentToDeroll) return;

    setIsDerolling(true);
    setStudentMsg({ text: '', type: '' });

    try {
      await apiRequest(`/api/classes/${id}/students/${studentToDeroll.id}`, {
        method: 'DELETE'
      });
      setStudents(prev => prev.filter(s => s.id !== studentToDeroll.id));
      setStudentMsg({ text: `${studentToDeroll.name} was successfully derolled from this class.`, type: 'success' });
      setStudentToDeroll(null);
      setTimeout(() => setStudentMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setStudentMsg({ text: err.message || 'Failed to deroll student from class', type: 'error' });
      setStudentToDeroll(null);
    } finally {
      setIsDerolling(false);
    }
  };

  // Handle Toggle Re-upload for assignment
  const handleToggleReupload = async (asgId) => {
    try {
      setTogglingId(asgId);
      const res = await apiRequest(`/api/assignments/${asgId}/toggle-reupload`, {
        method: 'PATCH'
      });
      setAssignments(prev => prev.map(a => a.id === asgId ? { ...a, allowReupload: res.assignment.allowReupload } : a));
      setAssignmentMsg({ text: res.message, type: 'success' });
      setTimeout(() => setAssignmentMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setAssignmentMsg({ text: err.message || 'Failed to toggle re-upload setting', type: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Download/View Attachment
  const handleDownloadAttachment = (asgId, fileName, inline = false) => {
    const url = `/api/assignments/${asgId}/attachment/download${inline ? '?view=inline' : ''}`;
    downloadFile(url, fileName, inline).catch(err => alert(err.message));
  };

  // Handle Confirm Delete Assignment
  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setIsDeletingAssignment(true);
    setAssignmentMsg({ text: '', type: '' });
    try {
      await apiRequest(`/api/assignments/${assignmentToDelete.id}`, {
        method: 'DELETE'
      });
      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      setAssignmentMsg({ text: `Assignment "${assignmentToDelete.title}" was deleted successfully!`, type: 'success' });
      setAssignmentToDelete(null);
      setTimeout(() => setAssignmentMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setAssignmentMsg({ text: err.message || 'Failed to delete assignment', type: 'error' });
      setAssignmentToDelete(null);
    } finally {
      setIsDeletingAssignment(false);
    }
  };

  // Handle Confirm Delete Quiz
  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuiz(true);
    setQuizMsg({ text: '', type: '' });
    try {
      await apiRequest(`/api/quizzes/${quizToDelete.id}`, {
        method: 'DELETE'
      });
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      setQuizMsg({ text: `Quiz "${quizToDelete.title}" was deleted successfully!`, type: 'success' });
      setQuizToDelete(null);
      setTimeout(() => setQuizMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setQuizMsg({ text: err.message || 'Failed to delete quiz', type: 'error' });
      setQuizToDelete(null);
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading course environment...</p>
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Cannot load class</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'Class not found'}</p>
        <Link
          to="/teacher/classes"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to My Classes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/teacher/classes"
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
              <span className="text-xs text-slate-400">Created {formatDate(cls.createdAt)}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{cls.name}</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              {cls.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3.5 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
            <span className="text-xs font-semibold uppercase text-slate-400">Enrolled Students</span>
            <div className="flex items-center gap-1.5 text-xl font-bold text-slate-900">
              <Users className="w-5 h-5 text-blue-600" />
              <span>{students.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-2 sm:gap-4 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: BookOpen },
          { key: 'notes', label: `Notes (${notes.length})`, icon: FileText },
          { key: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone },
          { key: 'assignments', label: `Assignments (${assignments.length})`, icon: Calendar },
          { key: 'quizzes', label: `Quizzes (${quizzes.length})`, icon: CheckSquare },
          { key: 'students', label: `Students (${students.length})`, icon: Users },
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
            {/* Quick stats & summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4">Course Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Course Code</span>
                  <span className="text-sm font-bold text-slate-800">{cls.code}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Instructor</span>
                  <span className="text-sm font-bold text-slate-800">{cls.teacherName} (You)</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Enrolled Count</span>
                  <span className="text-sm font-bold text-slate-800">{students.length} Students</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold uppercase mb-1">Course Materials</span>
                  <span className="text-sm font-bold text-slate-800">{notes.length} Uploaded Files</span>
                </div>
              </div>
            </div>

            {/* Recent announcements preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Latest Announcement</h2>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Manage Announcements
                </button>
              </div>

              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No announcements posted yet.</p>
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

          {/* Quick Upload Sidebar Widget */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>Quick Upload Material</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Upload lecture slides, homework, or syllabus notes directly for this class.
              </p>
              <button
                onClick={() => setActiveTab('notes')}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Go to Notes Section</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Student Roster</span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                {students.length} students currently registered in this class.
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
              >
                View Enrolled Student List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Notes / Study Materials */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Uploaded Study Materials</h3>
                  <p className="text-xs text-slate-500">Accessible only to enrolled students in this class</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {notes.length} {notes.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              {notes.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No study notes uploaded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Use the upload form on the right to post files.</p>
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
                          <span>{formatDateTime(note.uploadedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownloadNote(note.id, note.originalName, true)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
                          title="View inline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadNote(note.id, note.originalName, false)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleRequestDeleteNote(note)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                          title="Delete study material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Form */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-22">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>Upload New Material</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Share files with students enrolled in this course.
              </p>

              {noteMsg.text && (
                <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  noteMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {noteMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{noteMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUploadNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Chapter 4 Slide Deck"
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNoteFile(e.target.files[0] || null)}
                    required
                    className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">PDF, DOCX, PPTX, TXT, images up to 25MB</p>
                </div>

                <button
                  type="submit"
                  disabled={uploadingNote}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingNote ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Material</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Announcements */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Announcements Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Class Announcement Feed</h3>
                  <p className="text-xs text-slate-500">Official broadcasts visible to all enrolled students</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
                </span>
              </div>

              {announcements.length === 0 ? (
                <div className="p-10 text-center">
                  <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No announcements posted for this class yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-5 sm:p-6 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(ann.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>
                      <div className="pt-1 text-[11px] text-slate-400">
                        Posted by <span className="font-semibold text-slate-600">{ann.teacherName || cls.teacherName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* New Announcement Form */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-22">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <span>Post Announcement</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Send an immediate notification and announcement to all enrolled students.
              </p>

              {annMsg.text && (
                <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  annMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {annMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{annMsg.text}</span>
                </div>
              )}

              <form onSubmit={handlePostAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Announcement Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Schedule Change for Lab"
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Announcement Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Write your announcement details here..."
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={postingAnn}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {postingAnn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Publish Announcement</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
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
              <h2 className="text-base font-bold text-slate-900">Timed Assignments & Submissions</h2>
              <p className="text-xs text-slate-500 mt-1">
                Create assignments with strict deadlines, set re-upload policies, and monitor who has submitted or missed.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAssignment(null);
                setAssignmentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>

          {/* Assignments List */}
          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No assignments created yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Schedule assignments with submission deadlines so enrolled students can turn in their work (e.g. PDF reports).
              </p>
              <button
                onClick={() => {
                  setEditingAssignment(null);
                  setAssignmentModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Assignment</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignments.map(asg => {
                const timer = formatTimeRemaining(asg.dueDate);
                const submitted = asg.submittedCount || 0;
                const total = asg.totalEnrolled || students.length;
                const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

                return (
                  <div
                    key={asg.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
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

                        {/* Attached Handout / Prompt File */}
                        {asg.attachment && (
                          <div className="mt-3 inline-flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold text-slate-700 max-w-xs truncate">
                              {asg.attachment.originalName} ({formatFileSize(asg.attachment.fileSize)})
                            </span>
                            <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                              <button
                                onClick={() => handleDownloadAttachment(asg.id, asg.attachment.originalName, true)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                View
                              </button>
                              <span className="text-slate-300">/</span>
                              <button
                                onClick={() => handleDownloadAttachment(asg.id, asg.attachment.originalName, false)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAssignment(asg);
                            setAssignmentModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Assignment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAssignmentToDelete(asg)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                          title="Delete Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Status & Controls Bar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Submission Progress & Deadline */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                            Submissions ({submitted}/{total})
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-800">{pct}%</span>
                          </div>
                        </div>

                        <div className="border-l border-slate-200 pl-4">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                            Deadline
                          </span>
                          <span className="font-semibold text-slate-700 mt-1 block">
                            {formatDateTime(asg.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Re-upload Toggle & View Roster */}
                      <div className="flex items-center gap-3">
                        {/* Instant Re-upload Toggle */}
                        <button
                          onClick={() => handleToggleReupload(asg.id)}
                          disabled={togglingId === asg.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            asg.allowReupload
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle whether students can re-upload their submissions"
                        >
                          {asg.allowReupload ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Re-upload: Allowed</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Re-upload: Locked</span>
                            </>
                          )}
                        </button>

                        {/* View Submissions Roster */}
                        <button
                          onClick={() => setRosterAssignment(asg)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>View Submissions & Roster</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Students */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Enrolled Students Roster</h3>
              <p className="text-xs text-slate-500">Students registered to take this course</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Total: {students.length}
            </span>
          </div>

          {studentMsg.text && (
            <div className={`m-5 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              studentMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {studentMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{studentMsg.text}</span>
            </div>
          )}

          {students.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No students enrolled in this class yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">Students can enrol from the "View Available Classes" portal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Student Name</th>
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-6">Enrolled Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <span>{student.name}</span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">{student.email}</td>
                      <td className="py-3.5 px-6 text-slate-500">{formatDate(student.enrolledAt)}</td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setStudentToDeroll(student)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1.5"
                          title="Deroll student from class"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Deroll</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {quizMsg.text && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              quizMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {quizMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{quizMsg.text}</span>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Scheduled Quizzes & Tests</h2>
              <p className="text-xs text-slate-500 mt-1">
                Create timed quizzes with single-correct MCQs, multi-correct MCQs (auto-graded), and paragraph questions with manual marks allotment.
              </p>
            </div>
            <button
              onClick={() => setQuizModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Quiz</span>
            </button>
          </div>

          {/* Quizzes List */}
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No quizzes scheduled yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Schedule a quiz to evaluate your students with automated MCQ grading and paragraph evaluations.
              </p>
              <button
                onClick={() => setQuizModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Quiz</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quizzes.map(quiz => {
                const totalEnrolled = quiz.totalEnrolled || students.length;
                const attempted = quiz.attemptCount || 0;
                const now = new Date();
                const start = new Date(quiz.startTime);
                const end = new Date(quiz.endTime);
                const isUpcoming = now < start;
                const isExpired = now > end;
                const isActive = !isUpcoming && !isExpired;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                            {cls.code}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{quiz.totalPoints} Points</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{quiz.durationMinutes} Mins</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">
                            {(quiz.questions || []).length} Questions
                          </span>

                          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isExpired
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : isUpcoming
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{isExpired ? 'Closed' : isUpcoming ? 'Upcoming' : 'Active Now'}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}

                        {/* Timeline */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-slate-700">Starts:</span>{' '}
                            {new Date(quiz.startTime).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Deadline:</span>{' '}
                            {new Date(quiz.endTime).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Right: Submissions stats & Actions */}
                      <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[180px]">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Submissions
                          </div>
                          <div className="text-xl font-black text-slate-800 mt-0.5">
                            {attempted} <span className="text-xs font-normal text-slate-400">/ {totalEnrolled} students</span>
                          </div>
                          {quiz.pendingGradingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              {quiz.pendingGradingCount} need paragraph grading
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                              All submissions evaluated
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReviewQuizId(quiz.id)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Review & Grade / Analytics</span>
                          </button>
                          <button
                            onClick={() => setQuizToDelete(quiz)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Special Delete Confirmation Popup Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setNoteToDelete(null)}
          />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden z-10 p-6 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Delete Study Material</h3>
                  <button
                    onClick={() => !isDeleting && setNoteToDelete(null)}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-800 font-semibold">{noteToDelete.title}</strong>?
                </p>

                <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-1">
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">File:</span>
                    <span className="truncate max-w-[240px] text-slate-600 font-mono text-[11px]">{noteToDelete.originalName}</span>
                  </div>
                  <div className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-200/70 mt-2">
                    Enrolled students in <strong>{cls.code}</strong> will immediately lose access. This action cannot be reversed.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteNote}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete Material'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special Deroll Student Popup Modal */}
      {studentToDeroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDerolling && setStudentToDeroll(null)}
          />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden z-10 p-6 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <UserMinus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Deroll Student</h3>
                  <button
                    onClick={() => !isDerolling && setStudentToDeroll(null)}
                    disabled={isDerolling}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to deroll <strong className="text-slate-800 font-semibold">{studentToDeroll.name}</strong> from <strong className="text-slate-800 font-semibold">{cls.code}</strong>?
                </p>

                <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-1">
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Student Email:</span>
                    <span className="text-slate-600 font-medium text-[11px]">{studentToDeroll.email}</span>
                  </div>
                  <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/70 mt-2 leading-relaxed">
                    This student will be removed from the active roster and will immediately lose access to all notes, study files, and announcements in this class.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDerolling}
                onClick={() => setStudentToDeroll(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDerolling}
                onClick={handleConfirmDerollStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDerolling ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserMinus className="w-3.5 h-3.5" />
                )}
                <span>{isDerolling ? 'Derolling...' : 'Deroll Student'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Assignment Modal (Create / Edit) */}
      <TeacherAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false);
          setEditingAssignment(null);
        }}
        classId={id}
        assignment={editingAssignment}
        onSaved={async () => {
          setAssignmentMsg({
            text: editingAssignment ? 'Assignment updated successfully!' : 'Assignment published successfully!',
            type: 'success'
          });
          const updated = await apiRequest(`/api/assignments/class/${id}`).catch(() => []);
          setAssignments(updated);
          setTimeout(() => setAssignmentMsg({ text: '', type: '' }), 4000);
        }}
      />

      {/* Submissions & Attendance Roster Modal */}
      <TeacherSubmissionsModal
        isOpen={!!rosterAssignment}
        onClose={() => setRosterAssignment(null)}
        assignment={rosterAssignment}
        onAssignmentUpdated={(updatedAsg) => {
          setAssignments(prev => prev.map(a => a.id === updatedAsg.id ? { ...a, ...updatedAsg } : a));
        }}
      />

      {/* Assignment Delete Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeletingAssignment && setAssignmentToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Assignment</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800 font-semibold">"{assignmentToDelete.title}"</strong>? All student submissions and uploaded documents associated with this assignment will also be permanently removed.
            </p>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingAssignment}
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAssignment}
                onClick={handleConfirmDeleteAssignment}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingAssignment ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingAssignment ? 'Deleting...' : 'Delete Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Quiz Creation Modal */}
      <TeacherQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        classId={id}
        onQuizCreated={async (newQ) => {
          setQuizMsg({
            text: `Quiz "${newQ.title}" was scheduled and published successfully!`,
            type: 'success'
          });
          const updated = await apiRequest(`/api/quizzes/class/${id}`).catch(() => []);
          setQuizzes(updated);
          setTimeout(() => setQuizMsg({ text: '', type: '' }), 4000);
        }}
      />

      {/* Teacher Quiz Review & Grading Modal */}
      <TeacherQuizReviewModal
        isOpen={!!reviewQuizId}
        onClose={() => setReviewQuizId(null)}
        quizId={reviewQuizId}
        onGradesUpdated={async () => {
          const updated = await apiRequest(`/api/quizzes/class/${id}`).catch(() => []);
          setQuizzes(updated);
        }}
      />

      {/* Quiz Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeletingQuiz && setQuizToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Quiz</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800 font-semibold">"{quizToDelete.title}"</strong>? All student attempts, scores, and analytics for this quiz will be permanently removed.
            </p>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingQuiz}
                onClick={() => setQuizToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingQuiz}
                onClick={handleConfirmDeleteQuiz}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingQuiz ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingQuiz ? 'Deleting...' : 'Delete Quiz'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
