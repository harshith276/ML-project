import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Table2, Bot, Settings, Zap, LogOut, User, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'data', label: 'Customer Data', icon: Table2 },
  { id: 'chat', label: 'AI Chat', icon: Bot },
];

// Health indicator — polls GET /api/health every 30 seconds
function HealthDot() {
  const [status, setStatus] = useState('checking'); // 'ok' | 'error' | 'checking'

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('https://segmentiq-api.onrender.com/api/health');
        setStatus(res.ok ? 'ok' : 'error');
      } catch {
        setStatus('error');
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const dot = {
    ok: 'bg-teal-500 animate-pulse',
    error: 'bg-red-500',
    checking: 'bg-slate-300 animate-pulse',
  }[status];

  const label = {
    ok: 'Backend Online',
    error: 'Backend Offline',
    checking: 'Connecting…',
  }[status];

  const textColor = {
    ok: 'text-teal-600',
    error: 'text-red-500',
    checking: 'text-slate-400',
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </div>
  );
}

export default function Navbar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSignOut = () => {
    localStorage.removeItem('segmentiq_token');
    navigate('/auth');
  };

  return (
    <nav className="bg-white dark:bg-[#12151F] border-b border-slate-200 dark:border-white/5 px-6 py-0 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-colors">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 py-3">
        <div className="bg-teal-600 dark:bg-teal-500 rounded-lg p-1.5 flex items-center justify-center">
          <Zap size={16} className="text-white dark:text-[#12151F]" strokeWidth={2.5} />
        </div>
        <span className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight">SegmentIQ</span>
        <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/30">
          AI Powered
        </span>
      </div>

      {/* Center: Tabs */}
      <div className="flex items-stretch h-full gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to="/dashboard"
            state={{ tab: id }}
            onClick={() => {
              if (setActiveTab) setActiveTab(id);
            }}
            className={`
              flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200
              ${activeTab === id
                ? 'text-teal-600 dark:text-teal-400 border-teal-600 dark:border-teal-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }
            `}
          >
            <Icon size={15} strokeWidth={activeTab === id ? 2.5 : 2} />
            {label}
          </Link>
        ))}
      </div>

      {/* Right: Health + Settings + Sign out */}
      <div className="flex items-center gap-3">
        <HealthDot />
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
        >
          <LogOut size={15} />
          Sign out
        </button>
        <button
          onClick={() => toggleTheme()}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-400 dark:text-slate-500" />}
        </button>
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Settings size={18} />
          </button>

          {isSettingsOpen && (
            <>
              {/* Invisible overlay to close dropdown on click outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSettingsOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-56 p-2 bg-white dark:bg-[#1A1E2E] border border-slate-100 dark:border-white/10 rounded-xl shadow-2xl z-50 origin-top-right transition-all">
                <div className="px-2 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Preferences</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <User size={16} className="text-slate-400 dark:text-slate-500" />
                  Profile Settings
                </Link>
                {/* Removed duplicate toggle — use the navbar toggle button instead */}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
