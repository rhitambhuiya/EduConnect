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
  X
} from 'lucide-react';
import { apiRequest, formatDate, formatDateTime, formatFileSize } from '../../utils/api';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview | notes | announcements | students
  const [cls, setCls] = useState(null);
  const [notes, setNotes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [uploadingNote, setUploadingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null); // Custom modal confirmation state
  const [isDeleting, setIsDeleting] = useState(false);
  const [noteMsg, setNoteMsg] = useState({ text: '', type: '' });

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [annMsg, setAnnMsg] = useState({ text: '', type: '' });

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const [classData, notesData, annData, studentsData] = await Promise.all([
        apiRequest(`/api/classes/${id}`),
        apiRequest(`/api/classes/${id}/notes`),
        apiRequest(`/api/classes/${id}/announcements`),
        apiRequest(`/api/classes/${id}/students`),
      ]);
      setCls(classData);
      setNotes(notesData);
      setAnnouncements(annData);
      setStudents(studentsData);
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
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}
