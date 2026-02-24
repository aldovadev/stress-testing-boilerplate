import { Routes, Route } from 'react-router-dom';
import { useMetricsStream } from './hooks/useMetricsStream';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LiveDashboard from './pages/LiveDashboard';
import SummaryDashboard from './pages/SummaryDashboard';
import HistoryPage from './pages/HistoryPage';
import TestConfigPage from './pages/TestConfigPage';

export default function App() {
  const { isConnected, reconnect } = useMetricsStream();

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Top Header */}
      <Header isConnected={isConnected} onReset={reconnect} />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
          <Routes>
            <Route path="/" element={<LiveDashboard />} />
            <Route path="/config" element={<TestConfigPage />} />
            <Route path="/summary" element={<SummaryDashboard />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
