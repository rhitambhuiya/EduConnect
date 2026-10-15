import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCircle, 
  School, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [role, setRole] = useState('student'); // 'student' or 'teacher'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleQuickDemo = (demoRole) => {
    setRole(demoRole);
    if (demoRole === 'teacher') {
      setFormData({
        name: 'Dr. Robert Miller',
        email: 'teacher@college.edu',
        password: 'password123'
      });
    } else {
      setFormData({
        name: 'Alice Johnson',
        email: 'student@college.edu',
        password: 'password123'
      });
    }
    setIsLogin(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password, role);
        if (user.role === 'teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        if (!formData.name.trim()) {
          throw new Error('Please enter your full name.');
        }
        const user = await register(formData.name, formData.email, formData.password, role);
        if (user.role === 'teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] flex flex-col justify-between items-center py-4 px-4 sm:px-6 overflow-hidden font-sans">
      {/* Spacer for vertical balance */}
      <div className="hidden sm:block flex-1 max-h-4"></div>

      {/* Main Container */}
      <div className="w-full max-w-md my-auto flex flex-col items-center">
        {/* Top Header: Big Bold EduConnect + Tagline (No Hat Icon) */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Edu<span className="text-blue-600">Connect</span>
          </h1>
          <p className="mt-1 text-sm sm:text-base font-medium text-slate-500 tracking-tight">
            Connect. Learn. Stay Updated.
          </p>
        </div>

        {/* Modern Compact Auth Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-100 p-5 sm:p-6 transition-all">
          {/* Role Selector Tabs */}
          <div className="mb-3.5">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setRole('student'); setError(''); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  role === 'student'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('teacher'); setError(''); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  role === 'teacher'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-4 h-4" />
                <span>Teacher</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher: Sign In vs Sign Up */}
          <div className="flex border-b border-slate-200 mb-3.5">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors ${
                isLogin
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors ${
                !isLogin
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-3 flex items-start gap-2 p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Compact Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={role === 'teacher' ? 'Prof. Eleanor Vance' : 'Emma Watson'}
                    required={!isLogin}
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                College Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={role === 'teacher' ? 'teacher@college.edu' : 'student@college.edu'}
                  required
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? `Sign In as ${role === 'teacher' ? 'Teacher' : 'Student'}` : `Create ${role === 'teacher' ? 'Teacher' : 'Student'} Account`}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Instant Demo Row */}
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Instant Demo Accounts:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('teacher')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 rounded-lg text-left transition-colors group flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-700">Teacher Demo</div>
                  <div className="text-[10px] text-slate-400 truncate">teacher@college.edu</div>
                </div>
                <School className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('student')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 rounded-lg text-left transition-colors group flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-700">Student Demo</div>
                  <div className="text-[10px] text-slate-400 truncate">student@college.edu</div>
                </div>
                <UserCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-1">
        EduConnect &bull; Connect. Learn. Stay Updated.
      </footer>
    </div>
  );
}
