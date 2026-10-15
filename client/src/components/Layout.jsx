import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Megaphone, 
  Compass, 
  LogOut, 
  Menu, 
  X, 
  User, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CreateClassModal from '../pages/teacher/CreateClassModal';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isTeacher = user?.role === 'teacher';

  const teacherNavItems = [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'My Classes', to: '/teacher/classes', icon: BookOpen },
    { 
      label: 'Create Class', 
      onClick: () => {
        setMobileMenuOpen(false);
        setCreateModalOpen(true);
      }, 
      icon: PlusCircle,
      isAction: true
    },
    { label: 'Announcements', to: '/teacher/announcements', icon: Megaphone },
  ];

  const studentNavItems = [
    { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Classes', to: '/student/classes', icon: BookOpen },
    { label: 'View Available Classes', to: '/student/browse', icon: Compass },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <NavLink to={isTeacher ? '/teacher/dashboard' : '/student/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs group-hover:bg-blue-700 transition-colors">
                E
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">Edu<span className="text-blue-600">Connect</span></span>
                <span className="text-[11px] text-slate-400 font-medium block -mt-1">Connect. Learn. Stay Updated.</span>
              </div>
            </NavLink>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Action for Teacher */}
            {isTeacher && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Class</span>
              </button>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                  <span className="capitalize font-medium">{user?.role}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-22 bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-6">
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isTeacher ? 'Teacher Portal' : 'Student Portal'}
              </div>
              <nav className="space-y-1">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  if (item.isAction) {
                    return (
                      <button
                        key={idx}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        <span>{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs text-slate-500">
              <span className="font-semibold text-slate-700 block mb-0.5">Role: {user?.role === 'teacher' ? 'Faculty / Instructor' : 'Enrolled Student'}</span>
              <span>{user?.email}</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col p-5 z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    E
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-slate-900">Edu<span className="text-blue-600">Connect</span></span>
                    <span className="text-[10px] text-slate-400 block -mt-1 font-medium capitalize">{user?.role} Portal</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>

              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  if (item.isAction) {
                    return (
                      <button
                        key={idx}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Panel */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Teacher Create Class Modal */}
      {isTeacher && (
        <CreateClassModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreated={() => {
            // Trigger custom event or redirect to classes
            window.dispatchEvent(new Event('classCreated'));
            navigate('/teacher/classes');
          }}
        />
      )}
    </div>
  );
}
