import { Routes, Route, Outlet } from 'react-router-dom';
import { useMetricsStream } from './hooks/useMetricsStream';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthGuard from './components/AuthGuard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LiveDashboard from './pages/LiveDashboard';
import SummaryDashboard from './pages/SummaryDashboard';
import HistoryPage from './pages/HistoryPage';
import TestConfigPage from './pages/TestConfigPage';

function DashboardLayout({ isConnected, reconnect }: { isConnected: boolean; reconnect: () => void }) {
  return (
    <AuthGuard>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        <Header isConnected={isConnected} onReset={reconnect} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function App() {
  const { isConnected, reconnect } = useMetricsStream();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<DashboardLayout isConnected={isConnected} reconnect={reconnect} />}>
        <Route path="/dashboard" element={<LiveDashboard />} />
        <Route path="/config" element={<TestConfigPage />} />
        <Route path="/summary" element={<SummaryDashboard />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>
    </Routes>
  );
}
