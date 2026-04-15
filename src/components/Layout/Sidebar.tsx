import { Rocket, Bot, FolderGit2, Activity, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { signOut, user } = useAuth();

  const navItems = [
    { id: 'deployments', icon: Rocket, label: 'Deployments' },
    { id: 'agents', icon: Bot, label: 'Agents' },
    // { id: 'repositories', icon: FolderGit2, label: 'Repositories' },
    { id: 'observability', icon: Activity, label: 'Observability' },
  ];

  const bottomItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-[220px] h-screen bg-[#000000] border-r border-[#1f1f1f] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#111111] transition-colors group">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center flex-shrink-0">
            <Rocket className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight truncate">Agentic Cloud</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#555555] group-hover:text-[#888888] transition-colors flex-shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-[#1f1f1f] space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* User */}
        <div className="pt-2 mt-1 border-t border-[#111111]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-6 h-6 bg-[#1f1f1f] border border-[#2a2a2a] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white uppercase">
                {user?.email?.[0]}
              </span>
            </div>
            <p className="text-[12px] text-[#888888] truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="nav-item text-[#666666] hover:text-[#ff4444]"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
