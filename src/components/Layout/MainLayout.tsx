import { useState } from 'react';
import { Rocket, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Agent } from '../../types/database';
import { AgentsDashboard } from '../Dashboard/AgentsDashboard';
import { AgentWorkspace } from '../Dashboard/AgentWorkspace';
import { SettingsView } from '../Views/SettingsView';
import { PendingApprovalsBanner } from '../Views/ApprovalsView';

export function MainLayout() {
  const { signOut, user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // If an agent is selected, show its workspace
  if (selectedAgent && !showSettings) {
    return (
      <AgentWorkspace
        agent={selectedAgent}
        onBack={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {/* Global top nav bar */}
      <header className="border-b border-[#1f1f1f] bg-[#000000] flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 h-12 flex items-center justify-between">
          {/* Brand */}
          <button
            onClick={() => { setSelectedAgent(null); setShowSettings(false); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <Rocket className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-[13px] font-semibold text-white">Agentic Cloud</span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <PendingApprovalsBanner />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-colors ${showSettings ? 'text-white bg-[#1a1a1a]' : 'text-[#555555] hover:text-white hover:bg-[#111111]'
                }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <div className="w-px h-4 bg-[#1f1f1f]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#1f1f1f] border border-[#2a2a2a] rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white uppercase">{user?.email?.[0]}</span>
              </div>
              <span className="text-[12px] text-[#666666] max-w-[140px] truncate hidden sm:block">{user?.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-[#444444] hover:text-[#ef4444] hover:bg-[#1a0a0a] rounded-md transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {showSettings ? (
          <SettingsView />
        ) : (
          <AgentsDashboard onSelectAgent={(agent) => { setSelectedAgent(agent); setShowSettings(false); }} />
        )}
      </main>
    </div>
  );
}

