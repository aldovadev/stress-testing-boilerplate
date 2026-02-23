import { NavLink } from 'react-router-dom';
import { BarChart3, FileText, History, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Live Dashboard' },
  { to: '/summary', icon: BarChart3, label: 'Summary' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-gray-800 bg-gray-950 flex flex-col h-full">
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-800/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
          <FileText className="w-3 h-3" />
          <span>k6 Stress Testing</span>
        </div>
      </div>
    </aside>
  );
}
