import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Search, 
  BookOpen, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function BrowseClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '', classId: null });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/classes');
      setClasses(data);
    } catch (err) {
      console.error('Failed to load available classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleEnroll = async (cls) => {
    if (cls.isEnrolled) return;

    setEnrollingId(cls.id);
    setFeedback({ text: '', type: '', classId: null });

    try {
      const res = await apiRequest(`/api/classes/${cls.id}/enroll`, {
        method: 'POST'
      });

      // Update state locally: mark class as enrolled and increment enrollment count
      setClasses(prev => prev.map(item => {
        if (item.id === cls.id) {
          return {
            ...item,
            isEnrolled: true,
            enrollmentCount: (item.enrollmentCount || 0) + 1
          };
        }
        return item;
      }));

      setFeedback({
        text: `You have successfully enrolled in ${cls.code}: ${cls.name}!`,
        type: 'success',
        classId: cls.id
      });

      // Clear feedback after 4 seconds
      setTimeout(() => {
        setFeedback({ text: '', type: '', classId: null });
      }, 5000);
    } catch (err) {
      setFeedback({
        text: err.message || 'Failed to enrol in class. Please try again.',
        type: 'error',
        classId: cls.id
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const filtered = classes.filter(cls =>
    cls.name.toLowerCase().includes(search.toLowerCase()) ||
    cls.code.toLowerCase().includes(search.toLowerCase()) ||
    (cls.teacherName && cls.teacherName.toLowerCase().includes(search.toLowerCase())) ||
    cls.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Available Classes</h1>
        <p className="text-sm text-slate-500">
          Browse all university courses currently open for enrollment. Register with one click.
        </p>
      </div>

      {/* Global feedback message if enrollment happened */}
      {feedback.text && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>

          {feedback.type === 'success' && feedback.classId && (
            <button
              onClick={() => navigate(`/student/classes/${feedback.classId}`)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
            >
              Open Class Page
            </button>
          )}
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course name, code, or instructor..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-xs"
        />
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading university course offerings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {search ? 'No matching classes found' : 'No courses currently available'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {search ? 'Try searching with a different term.' : 'Check back later when faculty publish new course sections.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cls) => {
            const isEnrolling = enrollingId === cls.id;
            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                      {cls.code}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cls.enrollmentCount || 0} enrolled</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {cls.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 mb-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{cls.teacherName}</span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {cls.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {cls.isEnrolled ? (
                    <div className="w-full flex items-center justify-between">
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Already Enrolled</span>
                      </button>

                      <button
                        onClick={() => navigate(`/student/classes/${cls.id}`)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                      >
                        <span>View Class</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnroll(cls)}
                      disabled={isEnrolling}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isEnrolling ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{isEnrolling ? 'Enrolling...' : 'Enrol in Class'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
