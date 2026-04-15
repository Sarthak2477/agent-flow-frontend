import { useState, useEffect } from 'react';
import { FolderGit2, Github, ExternalLink, GitBranch, Box } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';

export function RepositoriesView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentsWithRepos();
  }, []);

  const loadAgentsWithRepos = async () => {
    try {
      const data = await api.agents.list();
      setAgents(data.filter((a: Agent) => a.githubRepo !== null) || []);
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Repositories</h1>
          <p className="text-[13px] text-[#666666] mt-0.5">GitHub repositories connected to your agents</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="skeleton h-[72px] rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-dashed border-[#1f1f1f] rounded-xl flex flex-col items-center justify-center py-16 px-8">
          <div className="w-12 h-12 bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl flex items-center justify-center mb-4">
            <FolderGit2 className="w-5 h-5 text-[#444444]" />
          </div>
          <h3 className="text-[15px] font-medium text-white mb-1.5">No repositories connected</h3>
          <p className="text-[13px] text-[#555555] text-center max-w-xs">
            Link a GitHub repository to an agent to enable automated CI/CD pipelines
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {agents.map((agent, index) => (
            <div
              key={agent.id}
              className={`group flex items-center gap-4 px-5 py-4 hover:bg-[#0f0f0f] transition-colors ${index !== agents.length - 1 ? 'border-b border-[#111111]' : ''
                }`}
            >
              {/* Icon */}
              <div className="w-9 h-9 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center flex-shrink-0">
                <Github className="w-4 h-4 text-[#888888]" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-white mb-0.5 truncate">{agent.name}</h3>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://github.com/${agent.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-[#555555] hover:text-[#888888] font-mono transition-colors"
                  >
                    <GitBranch className="w-3 h-3" />
                    {agent.githubRepo}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Image URL */}
              {agent.image_url && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#444444] font-mono max-w-[240px] flex-shrink-0">
                  <Box className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{agent.image_url}</span>
                </div>
              )}

              {/* External link */}
              <a
                href={`https://github.com/${agent.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#333333] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
