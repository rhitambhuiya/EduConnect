import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Compass, 
  Megaphone, 
  ArrowRight, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, formatDate, formatDateTime } from '../../utils/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const myClasses = await apiRequest('/api/classes/my');
        setEnrolledClasses(myClasses);

        // Fetch announcements from enrolled classes
        if (myClasses.length > 0) {
          const annPromises = myClasses.map(async (c) => {
            try {
              const anns = await apiRequest(`/api/classes/${c.id}/announcements`);
              return anns.map(a => ({ ...a, classCode: c.code, className: c.name }));
            } catch (err) {
              return [];
            }
          });
          const allAnns = await Promise.all(annPromises);
          const flattened = allAnns.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRecentAnnouncements(flattened.slice(0, 3));
        }
      } catch (err) {
        setError(err.message || 'Failed to load student dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student Academic Space</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your registered courses, download lecture materials, and keep up with professor notices.
          </p>
        </div>

        <Link
          to="/student/browse"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Compass className="w-4 h-4" />
          <span>Browse Available Classes</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Enrolled Classes
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {loading ? '—' : enrolledClasses.length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Enrollment Status
            </div>
            <div className="text-sm font-bold text-emerald-700 mt-1">
              Active Student
            </div>
            <span className="text-[11px] text-slate-400">Standard registration</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Course Catalog
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              Explore More Courses
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Browse offerings to enrol</p>
          </div>
          <Link
            to="/student/browse"
            className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors"
          >
            <Compass className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Classes List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Your Enrolled Classes</h2>
                <p className="text-xs text-slate-500 mt-0.5">Courses you are currently participating in</p>
              </div>
              <Link
                to="/student/classes"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
              >
                <span>View All ({enrolledClasses.length})</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading your enrolled classes...</p>
              </div>
            ) : enrolledClasses.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">You are not enrolled in any classes yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Browse the platform's course catalog to enrol in classes taught by professors.
                </p>
                <Link
                  to="/student/browse"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Browse Available Courses</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrolledClasses.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => navigate(`/student/classes/${cls.id}`)}
                    className="p-5 sm:px-6 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                          {cls.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {cls.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        Instructor: <span className="font-semibold text-slate-700">{cls.teacherName}</span> &bull; {cls.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-blue-600 group-hover:underline">
                        Open Course
                      </span>
                      <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Announcements Feed Widget */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <span>Class Announcements</span>
              </h3>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">Loading notices...</p>
            ) : recentAnnouncements.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No announcements from your classes yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => navigate(`/student/classes/${ann.classId}`)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                        {ann.classCode}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(ann.createdAt)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{ann.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
