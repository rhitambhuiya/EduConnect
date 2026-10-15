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
  Calendar
} from 'lucide-react';
import { apiRequest, formatDate, formatDateTime, formatFileSize } from '../../utils/api';

export default function StudentClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview | notes | announcements
  const [cls, setCls] = useState(null);
  const [notes, setNotes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [classData, notesData, annData] = await Promise.all([
          apiRequest(`/api/classes/${id}`),
          apiRequest(`/api/classes/${id}/notes`),
          apiRequest(`/api/classes/${id}/announcements`),
        ]);
        setCls(classData);
        setNotes(notesData);
        setAnnouncements(annData);
      } catch (err) {
        setError(err.message || 'Failed to load class details');
      } finally {
        setLoading(false);
      }
    }
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
    </div>
  );
}
