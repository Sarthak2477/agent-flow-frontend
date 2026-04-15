import { useState, useEffect } from 'react';
import { Plus, Bot, Eye, Trash2, CreditCard as Edit2, Github, Loader2, Terminal, AlertCircle, ChevronRight, Rocket, X, Key, Play, Square } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';
import { CreateAgentModal } from '../Modals/CreateAgentModal';
import { EditAgentModal } from '../Modals/EditAgentModal';
import { LogsDrawer } from '../Observability/LogsDrawer';

function getStatusBadge(status: string) {
  switch (status) {
    case 'deployed':
    case 'running':
      return 'badge badge-success';
    case 'succeeded':
      return 'badge badge-info text-[#3b82f6] border-[#3b82f6]';
    case 'ready':
      return 'badge badge-info';
    case 'building':
      return 'badge badge-warning';
    case 'stopped':
    case 'draft':
      return 'badge badge-neutral';
    default:
      return 'badge badge-neutral';
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case 'deployed':
    case 'running':
      return 'bg-[#22c55e] status-dot-success';
    case 'succeeded':
      return 'bg-[#3b82f6]';
    case 'ready':
      return 'bg-[#60a5fa]';
    case 'building':
      return 'bg-[#f59e0b] animate-pulse';
    case 'stopped':
      return 'bg-[#666666]';
    default:
      return 'bg-[#444444]';
  }
}

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingLogsAgent, setViewingLogsAgent] = useState<Agent | null>(null);
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [linkingRepoAgentId, setLinkingRepoAgentId] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [connectingRepo, setConnectingRepo] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Per-agent deploy modal
  const [deployingAgent, setDeployingAgent] = useState<Agent | null>(null);
  const [deployEnvConfig, setDeployEnvConfig] = useState('{\n  "OPENAI_API_KEY": "sk-...",\n  "MODEL_NAME": "gpt-4-turbo"\n}');
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [stoppingAgentId, setStoppingAgentId] = useState<string | null>(null);

  const loadAgents = async () => {
    try {
      const data = await api.agents.list();
      setAgents(data.filter((a: Agent) => a.status !== 'archived') || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    try {
      const repos = await api.github.getRepos();
      setAvailableRepos(
        (repos || []).map((r: any) => {
          if (typeof r === 'string') return r;
          if (r.fullName) return r.fullName;
          if (r.full_name) return r.full_name;
          if (r.owner && r.name) return `${r.owner.login || r.owner.name}/${r.name}`;
          const values = Object.values(r);
          const repoString = values.find((v: any) => typeof v === 'string' && v.includes('/'));
          if (repoString) return repoString;
          return r.name || JSON.stringify(r);
        }).filter(Boolean)
      );
    } catch (error) {
      console.error('Error loading repos:', error);
    }
  };

  useEffect(() => {
    loadAgents();
    loadRepos();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectRepo = async (agentId: string) => {
    if (!selectedRepo) return;
    setConnectingRepo(true);
    setConnectError(null);
    try {
      await api.agents.connectGitHub(agentId, selectedRepo);
      setLinkingRepoAgentId(null);
      setSelectedRepo('');
      loadAgents();
    } catch (error: any) {
      let msg = error.message || 'Failed to connect repository';
      if (msg.includes('409')) {
        msg = 'Conflict: A workflow is currently running on GitHub. Wait for it to finish and try again.';
      }
      setConnectError(msg);
    } finally {
      setConnectingRepo(false);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await api.agents.update(id, { status: 'archived' });
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleStop = async (agentId: string) => {
    setStoppingAgentId(agentId);
    try {
      await api.deploy.destroy(agentId);
      await api.agents.update(agentId, { status: 'ready' });
      loadAgents();
    } catch (error) {
      console.error('Error stopping agent:', error);
    } finally {
      setStoppingAgentId(null);
    }
  };

  const handleDeploy = async () => {
    if (!deployingAgent) return;
    setDeploying(true);
    setDeployError('');
    try {
      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(deployEnvConfig);
      } catch {
        setDeployError('Invalid JSON in configuration');
        setDeploying(false);
        return;
      }
      const agent = deployingAgent;
      await api.deploy.deploy(agent.id, parsedEnv);

      // Poll for 30 seconds
      let isReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const [dStat, aStat] = await Promise.all([
            api.deploy.getStatus(agent.id),
            api.agents.get(agent.id)
          ]);
          if (dStat.status === 'healthy' && aStat.status === 'running') {
            isReady = true;
            break;
          }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 1000));
        loadAgents();
      }

      setDeployingAgent(null);
      if (isReady) {
        setViewingLogsAgent(agent);
      }
    } catch (error: any) {
      setDeployError(error.message || 'Deployment failed');
    } finally {
      setDeploying(false);
      loadAgents();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Agents</h1>
          <p className="text-[13px] text-[#666666] mt-0.5">Manage your AI agents and their configurations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-1.5 text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-[72px] rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-dashed border-[#1f1f1f] rounded-xl flex flex-col items-center justify-center py-16 px-8">
          <div className="w-12 h-12 bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl flex items-center justify-center mb-4">
            <Bot className="w-5 h-5 text-[#444444]" />
          </div>
          <h3 className="text-[15px] font-medium text-white mb-1.5">No agents yet</h3>
          <p className="text-[13px] text-[#555555] text-center mb-5 max-w-xs">
            Create your first AI agent to start deploying on your Kubernetes cluster
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-1.5 text-[13px]"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {agents.map((agent, index) => (
            <div
              key={agent.id}
              className={`group flex items-center gap-4 px-5 py-4 hover:bg-[#0f0f0f] transition-colors ${index !== agents.length - 1 ? 'border-b border-[#111111]' : ''
                }`}
            >
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(agent.status)}`} />

              {/* Agent icon */}
              <div className="w-9 h-9 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-[#888888]" />
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[14px] font-medium text-white truncate">{agent.name}</h3>
                  <span className={getStatusBadge(agent.status)}>{agent.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#444444] font-mono">{agent.id.slice(0, 8)}</span>
                  {agent.githubRepo && (
                    <div className="flex items-center gap-1 text-[12px] text-[#555555]">
                      <Github className="w-3 h-3" />
                      <span className="font-mono truncate max-w-[200px]">{agent.githubRepo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Repo linking */}
              {linkingRepoAgentId === agent.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="input-base text-[13px] w-48 py-1.5"
                  >
                    <option value="">Select repository...</option>
                    {availableRepos.map((repo) => (
                      <option key={repo} value={repo}>{repo}</option>
                    ))}
                  </select>
                  {connectError && (
                    <div className="flex items-center gap-1 text-[11px] text-[#f87171] max-w-xs">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{connectError}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleConnectRepo(agent.id)}
                    disabled={!selectedRepo || connectingRepo}
                    className="btn-primary text-[12px] py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {connectingRepo ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {connectingRepo ? 'Linking...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => { setLinkingRepoAgentId(null); setConnectError(null); }}
                    disabled={connectingRepo}
                    className="btn-secondary text-[12px] py-1.5 px-3"
                  >
                    Cancel
                  </button>
                </div>
              ) : !agent.githubRepo ? (
                <button
                  onClick={() => setLinkingRepoAgentId(agent.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[12px] text-[#555555] hover:text-[#888888] transition-colors px-3 py-1.5 rounded-md border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#111111]"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Link Repo</span>
                </button>
              ) : (
                <button
                  onClick={() => setLinkingRepoAgentId(agent.id)}
                  className="flex-shrink-0 text-[12px] text-[#444444] hover:text-[#888888] transition-colors px-2 py-1 rounded hover:bg-[#111111]"
                >
                  Change
                </button>
              )}

              {/* Deploy button — only for ready agents, always visible */}
              {agent.status === 'ready' && linkingRepoAgentId !== agent.id && (
                <button
                  onClick={() => {
                    setDeployingAgent(agent);
                    setDeployError('');
                  }}
                  title="Deploy this agent"
                  className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium text-black bg-white hover:bg-[#e8e8e8] active:scale-95 transition-all px-3 py-1.5 rounded-md"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Deploy
                </button>
              )}

              {/* Redeploy button — for deployed agents */}
              {(agent.status === 'deployed' || agent.status === 'running') && linkingRepoAgentId !== agent.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDeployingAgent(agent);
                      setDeployError('');
                    }}
                    title="Redeploy this agent"
                    className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium text-[#888888] hover:text-white border border-[#2a2a2a] hover:border-[#444444] hover:bg-[#111111] active:scale-95 transition-all px-3 py-1.5 rounded-md"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Redeploy
                  </button>
                  <button
                    onClick={() => handleStop(agent.id)}
                    disabled={stoppingAgentId === agent.id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#ef4444] border border-[#2a1515] hover:bg-[#1a0a0a] rounded-md transition-all active:scale-95"
                    title="Stop deployment"
                  >
                    {stoppingAgentId === agent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    )}
                    Stop
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => setViewingLogsAgent(agent)}
                  title="View Logs"
                  className="p-2 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
                >
                  <Terminal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingAgent(agent)}
                  title="Edit Agent"
                  className="p-2 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={agent.status === 'building'}
                  title="View Agent"
                  className="p-2 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all disabled:opacity-30"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteAgent(agent.id)}
                  title="Delete Agent"
                  className="p-2 text-[#555555] hover:text-[#ef4444] hover:bg-[#1a0a0a] rounded-md transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-[#333333] ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadAgents();
          }}
        />
      )}

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onUpdated={() => {
            setEditingAgent(null);
            loadAgents();
          }}
        />
      )}

      {viewingLogsAgent && (
        <LogsDrawer
          agent={viewingLogsAgent}
          onClose={() => setViewingLogsAgent(null)}
        />
      )}

      {/* Per-agent deploy modal */}
      {deployingAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">
                    {deployingAgent.status === 'deployed' ? 'Redeploy Agent' : 'Deploy Agent'}
                  </h2>
                  <p className="text-[12px] text-[#555555] mt-0.5 font-mono">{deployingAgent.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeployingAgent(null)}
                className="p-1.5 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Config */}
              <div>
                <label className="block text-[13px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Environment Configuration (JSON)
                </label>
                <textarea
                  value={deployEnvConfig}
                  onChange={(e) => setDeployEnvConfig(e.target.value)}
                  rows={7}
                  className="input-base font-mono text-[13px] resize-none"
                />
                <p className="text-[12px] text-[#444444] mt-1.5">
                  Provide API keys and environment variables for this deployment.
                </p>
              </div>

              {deployError && (
                <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{deployError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setDeployingAgent(null)}
                  className="btn-secondary flex-1 text-[13px] py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="btn-primary flex-[2] text-[13px] py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {deploying
                    ? (deployingAgent.status === 'deployed' ? 'Redeploying & Healthy Check...' : 'Deploying & Healthy Check...')
                    : (deployingAgent.status === 'deployed' ? `Redeploy ${deployingAgent.name}` : `Deploy ${deployingAgent.name}`)
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
