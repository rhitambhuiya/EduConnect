import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  PlusCircle, 
  ArrowRight, 
  Megaphone, 
  FileText, 
  Clock, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import CreateClassModal from './CreateClassModal';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/classes/my');
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Failed to load teacher classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();

    // Listen to global event when class is created
    const handleClassCreated = () => fetchClasses();
    window.addEventListener('classCreated', handleClassCreated);
    return () => window.removeEventListener('classCreated', handleClassCreated);
  }, []);

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Faculty Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your courses, view enrolled students, publish lecture notes, and broadcast announcements.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Class</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Classes Created
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {loading ? '—' : totalClasses}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Total Student Enrollments
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {loading ? '—' : totalStudents}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Quick Action
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              Add Announcements
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Post an update to your students</p>
          </div>
          <Link
            to="/teacher/announcements"
            className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors"
          >
            <Megaphone className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Classes Overview Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Active Classes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Overview of course sections and current enrollments</p>
          </div>
          <Link
            to="/teacher/classes"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading your courses...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-red-600">{error}</div>
        ) : classes.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No classes created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Get started by creating your first course. You will be able to share study notes and post announcements.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Class</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                className="p-5 sm:px-6 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                      {cls.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {cls.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {cls.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{cls.enrollmentCount || 0} {cls.enrollmentCount === 1 ? 'student' : 'students'} enrolled</span>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateClassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newCls) => {
          setClasses(prev => [newCls, ...prev]);
        }}
      />
    </div>
  );
}
