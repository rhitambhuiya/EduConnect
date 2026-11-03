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
  Sparkles,
  Trash2,
  X,
  AlertCircle
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

  // Delete Class State
  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/api/classes/${classToDelete.id}`, { method: 'DELETE' });
      setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
      setClassToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete class');
    } finally {
      setIsDeleting(false);
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

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{cls.enrollmentCount || 0} {cls.enrollmentCount === 1 ? 'student' : 'students'} enrolled</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteError('');
                      setClassToDelete(cls);
                    }}
                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs hover:shadow-xs"
                    title="Delete Class"
                    aria-label="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

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

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setClassToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden z-10 p-6 transition-all space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Delete Class</h3>
                  <button
                    onClick={() => !isDeleting && setClassToDelete(null)}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this course?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 border border-red-200/70 rounded-xl space-y-2">
              <div className="font-bold text-sm text-red-900">
                {classToDelete.name} ({classToDelete.code})
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                <strong>Warning:</strong> Deleting this class will permanently remove all associated:
              </p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5 ml-1">
                <li>Student enrollments ({classToDelete.enrollmentCount || 0} students)</li>
                <li>Announcements and study materials</li>
                <li>Assignments and student submissions</li>
                <li>Scheduled quizzes and attempt results</li>
              </ul>
              <p className="text-[11px] text-red-800 font-semibold pt-1">
                This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClass}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Class</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
