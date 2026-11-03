import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, PlusCircle, Search, ArrowRight, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import CreateClassModal from './CreateClassModal';

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Delete state
  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [bannerMsg, setBannerMsg] = useState({ text: '', type: '' });

  const showBanner = (text, type = 'success') => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg({ text: '', type: '' }), 4000);
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/classes/my');
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await apiRequest(`/api/classes/${classToDelete.id}`, {
        method: 'DELETE'
      });
      setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
      showBanner(res.message || `Class "${classToDelete.name}" deleted successfully.`, 'success');
      setClassToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete class');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = classes.filter(cls =>
    cls.name.toLowerCase().includes(search.toLowerCase()) ||
    cls.code.toLowerCase().includes(search.toLowerCase()) ||
    cls.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {bannerMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
          bannerMsg.type === 'error' 
            ? 'bg-red-50 text-red-700 border-red-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
            <span>{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg({ text: '', type: '' })} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Classes</h1>
          <p className="text-sm text-slate-500">
            All classes and course modules created and managed by you
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Class</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by class name or course code..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-xs"
        />
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading your courses...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {search ? 'No matching classes found' : 'No classes created yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search ? 'Try adjusting your search terms.' : 'Create your first course to begin interacting with students.'}
          </p>
          {!search && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cls) => (
            <div
              key={cls.id}
              onClick={() => navigate(`/teacher/classes/${cls.id}`)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                    {cls.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3" />
                      <span>{cls.enrollmentCount || 0}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError('');
                        setClassToDelete(cls);
                      }}
                      className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs hover:shadow-xs"
                      title="Delete Class"
                      aria-label="Delete Class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {cls.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                  <span>Manage Class</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteError('');
                    setClassToDelete(cls);
                  }}
                  className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs text-[11px] font-bold flex items-center gap-1"
                  title="Delete Class"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

            <div className="p-3 bg-red-50/70 border border-red-200/70 rounded-xl space-y-2">
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
