import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, BookOpen, Clock, PlusCircle, ArrowRight } from 'lucide-react';
import { apiRequest, formatDateTime } from '../../utils/api';

export default function TeacherAnnouncements() {
  const [classes, setClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const myClasses = await apiRequest('/api/classes/my');
        setClasses(myClasses);

        // Fetch announcements for each class
        const allAnnouncementsNested = await Promise.all(
          myClasses.map(async (c) => {
            try {
              const ann = await apiRequest(`/api/classes/${c.id}/announcements`);
              return ann.map(item => ({ ...item, classCode: c.code, className: c.name }));
            } catch (err) {
              return [];
            }
          })
        );

        const flattened = allAnnouncementsNested
          .flat()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnnouncements(flattened);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredAnnouncements = selectedClassId === 'all'
    ? announcements
    : announcements.filter(a => a.classId === selectedClassId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500">
            All broadcast announcements across your taught courses
          </p>
        </div>

        {/* Filter by class */}
        {classes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter by class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            >
              <option value="all">All Courses ({announcements.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No announcements found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Select one of your classes to post an announcement for enrolled students.
          </p>
          {classes.length > 0 && (
            <Link
              to={`/teacher/classes/${classes[0].id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Announcement in {classes[0].code}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                    {ann.classCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDateTime(ann.createdAt)}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line pt-1">
                {ann.content}
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Course: <strong className="text-slate-700">{ann.className}</strong></span>
                <Link
                  to={`/teacher/classes/${ann.classId}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                >
                  <span>Open Class Page</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
