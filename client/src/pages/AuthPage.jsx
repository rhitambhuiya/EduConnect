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
  Sparkles,
  BookOpen,
  FileText,
  Megaphone,
  CheckCircle2
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
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-between p-4 sm:p-6 lg:p-8 lg:overflow-hidden font-sans relative">
      {/* Decorative ambient background accents (soft light mode only) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            E
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            Edu<span className="text-blue-600">Connect</span>
          </span>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-7xl w-full mx-auto my-auto py-4 lg:py-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Bold Hero Typography & Feature Highlights */}
        <div className="lg:col-span-7 space-y-5 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>University Academic Network</span>
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              Edu<span className="text-blue-600">Connect</span>
            </h1>
            <p className="mt-2 text-lg sm:text-2xl font-bold text-blue-600 tracking-tight">
              Connect. Learn. Stay Updated.
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
            A unified digital campus platform built for seamless academic collaboration, course resource sharing, and real-time updates:
          </p>

          {/* Feature Showcase Boxes with Bullet Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl pt-1">
            {/* Box 1: For Faculty & Teachers */}
            <div className="bg-white/95 rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all">
              <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">Faculty & Teachers</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Course & Class Administration</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Upload & organize lecture PDFs & study notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Broadcast announcements & class updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Manage student rosters & roll controls</span>
                </li>
              </ul>
            </div>

            {/* Box 2: For Students & Scholars */}
            <div className="bg-white/95 rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all">
              <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <UserCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">Students & Scholars</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Learning & Collaboration Hub</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>Browse catalog & enroll in courses in 1-click</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>Download PDFs & track course materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>Real-time notices, updates & quizzes</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Trust/Metric Badge */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 pt-1">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">M</div>
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">A</div>
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">B</div>
            </div>
            <span>Empowering university faculty & registered scholars</span>
          </div>
        </div>

        {/* Right Column: Sleek Authentication Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-5 sm:p-6 transition-all">
            {/* Role Selector */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100/90 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setRole('student'); setError(''); }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
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
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
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

            {/* Mode Toggle: Sign In vs Create Account */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold border-b-2 text-center transition-colors ${
                  isLogin
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold border-b-2 text-center transition-colors ${
                  !isLogin
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-3.5 flex items-start gap-2 p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={role === 'teacher' ? 'Prof. Eleanor Vance' : 'Emma Watson'}
                      required={!isLogin}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  College Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={role === 'teacher' ? 'teacher@college.edu' : 'student@college.edu'}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
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

            {/* Instant Demo Accounts */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Demo Access</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('teacher')}
                  className="p-2 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 rounded-xl text-left transition-colors group flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Teacher Demo</div>
                    <div className="text-[10px] text-slate-400 truncate">Dr. Robert Miller</div>
                  </div>
                  <School className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className="p-2 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 rounded-xl text-left transition-colors group flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Student Demo</div>
                    <div className="text-[10px] text-slate-400 truncate">Alice Johnson</div>
                  </div>
                  <UserCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
