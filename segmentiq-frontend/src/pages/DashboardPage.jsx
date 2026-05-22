import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar    from '../Components/Navbar';
import Dashboard from '../Components/Dashboard';
import DataTable from '../Components/DataTable';
import AiChat    from '../Components/AiChat';

/** The main dashboard shell — tab navigation wrapping all data components. */
export default function DashboardPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'dashboard');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] transition-colors">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'data'      && <DataTable />}
        {activeTab === 'chat'      && <AiChat    />}
      </main>
    </div>
  );
}
