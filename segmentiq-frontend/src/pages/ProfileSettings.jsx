import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Shield, Database, CheckCircle2, Sliders } from 'lucide-react';
import Navbar from '../Components/Navbar';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { theme, isDarkMode, setTheme } = useTheme();
  const [activeNavTab, setActiveNavTab] = useState('profile'); // Dummy state for Navbar prop
  const [activeSidebarTab, setActiveSidebarTab] = useState('profile');

  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'Harshith N',
    email: 'harshith@segmentiq.local',
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    currency: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    theme,
  });

  const [toast, setToast] = useState('');

  useEffect(() => {
    setPreferences((prev) => ({ ...prev, theme }));
  }, [theme]);

  // Auto-apply theme if they change it here
  useEffect(() => {
    if (preferences.theme === 'dark' || preferences.theme === 'light' || preferences.theme === 'system') {
      setTheme(preferences.theme);
    }
  }, [preferences.theme, setTheme]);

  const handleSave = (e) => {
    e.preventDefault();
    setToast('Settings saved successfully!');
    setTimeout(() => setToast(''), 3000);
  };

  const sidebarTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] text-slate-900 dark:text-slate-200 transition-colors">
      <Navbar activeTab={activeNavTab} setActiveTab={setActiveNavTab} />
      
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account and dashboard preferences.</p>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 dark:bg-teal-900/20 dark:border-teal-500/30 flex items-center gap-3 text-teal-700 dark:text-teal-400 transition-all">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <nav className="flex flex-col gap-1">
              {sidebarTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSidebarTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#12151F] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white dark:bg-[#12151F] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            
            {/* Tab 1: My Profile */}
            {activeSidebarTab === 'profile' && (
              <div>
                <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5">
                  <h2 className="text-lg font-semibold">My Profile</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your personal identifier and login email.</p>
                </div>
                <div className="p-8">
                  <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="shrink-0 flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-3xl font-bold shadow-sm">
                        HN
                      </div>
                      <button className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">Change Avatar</button>
                    </div>
                    
                    <div className="flex-1 w-full space-y-5">
                      <div className="max-w-md">
                        <label htmlFor="fullName" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                        <input 
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={personalInfo.fullName}
                          onChange={e => setPersonalInfo({...personalInfo, fullName: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm shadow-sm"
                        />
                      </div>
                      <div className="max-w-md">
                        <label htmlFor="email" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Email Address</label>
                        <input 
                          type="email"
                          id="email"
                          name="email"
                          value={personalInfo.email}
                          onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A1E2E]/50 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm shadow-sm"
                          disabled
                        />
                        <p className="text-xs text-slate-500 mt-2">Email changes require re-authentication.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-5 bg-slate-50 dark:bg-[#0D1017] border-t border-slate-200 dark:border-white/5 flex justify-end">
                  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">Save Changes</button>
                </div>
              </div>
            )}

            {/* Tab 2: Preferences */}
            {activeSidebarTab === 'preferences' && (
              <div>
                <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5">
                  <h2 className="text-lg font-semibold">Dashboard Preferences</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize how your analytics data is rendered.</p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label htmlFor="currency" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Default Currency</label>
                      <select 
                        id="currency"
                        name="currency"
                        value={preferences.currency}
                        onChange={e => setPreferences({...preferences, currency: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm shadow-sm"
                      >
                        <option value="₹">INR (₹)</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-2">Formats Monetary Value metrics.</p>
                    </div>
                    
                    <div>
                      <label htmlFor="timezone" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Timezone</label>
                      <select 
                        id="timezone"
                        name="timezone"
                        value={preferences.timezone}
                        onChange={e => setPreferences({...preferences, timezone: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm shadow-sm"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-2">Adjusts Recency calculations.</p>
                    </div>

                    <div>
                      <label htmlFor="dateFormat" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Date Format</label>
                      <select 
                        id="dateFormat"
                        name="dateFormat"
                        value={preferences.dateFormat}
                        onChange={e => setPreferences({...preferences, dateFormat: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm shadow-sm"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="theme" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Theme Appearance</label>
                      <select 
                        id="theme"
                        name="theme"
                        value={preferences.theme}
                        onChange={e => setPreferences({...preferences, theme: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm shadow-sm"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System Preference</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-5 bg-slate-50 dark:bg-[#0D1017] border-t border-slate-200 dark:border-white/5 flex justify-end">
                  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">Save Preferences</button>
                </div>
              </div>
            )}

            {/* Tab 3: Security */}
            {activeSidebarTab === 'security' && (
              <div>
                <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5">
                  <h2 className="text-lg font-semibold">Security</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your password to keep your account secure.</p>
                </div>
                <div className="p-8">
                  <div className="max-w-md space-y-5">
                    <div>
                      <label htmlFor="currentPassword" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Current Password</label>
                      <input type="password" id="currentPassword" name="currentPassword" value={security.currentPassword} onChange={e => setSecurity({...security, currentPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">New Password</label>
                      <input type="password" id="newPassword" name="newPassword" value={security.newPassword} onChange={e => setSecurity({...security, newPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm" />
                    </div>
                    <div>
                      <label htmlFor="confirmNewPassword" className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2">Confirm New Password</label>
                      <input type="password" id="confirmNewPassword" name="confirmNewPassword" value={security.confirmPassword} onChange={e => setSecurity({...security, confirmPassword: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2E] focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm" />
                    </div>
                  </div>
                </div>
                <div className="px-8 py-5 bg-slate-50 dark:bg-[#0D1017] border-t border-slate-200 dark:border-white/5 flex justify-end">
                  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">Update Password</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
