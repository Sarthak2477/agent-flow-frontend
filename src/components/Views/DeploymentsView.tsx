import { useState, useEffect } from 'react';
import { Rocket, Activity, Square, Play, X, Terminal, Globe, Key, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { Agent, Deployment } from '../../types/database';
import { LogsDrawer } from '../Observability/LogsDrawer';

function getStatusStyle(status: string) {
  switch (status) {
    case 'running':
      return { badge: 'badge badge-success', dot: 'bg-[#22c55e] status-dot-success', pulse: true };
    case 'pending':
      return { badge: 'badge badge-warning', dot: 'bg-[#f59e0b] animate-pulse', pulse: false };
    case 'failed':
      return { badge: 'badge badge-error', dot: 'bg-[#ef4444]', pulse: false };
    case 'stopped':
      return { badge: 'badge badge-neutral', dot: 'bg-[#333333]', pulse: false };
    default:
      return { badge: 'badge badge-neutral', dot: 'bg-[#333333]', pulse: false };
  }
}

export function DeploymentsView() {
  const [deployments, setDeployments] = useState<(Deployment & { agent: Agent })[]>([]);
  const [readyAgents, setReadyAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [envConfig, setEnvConfig] = useState('{\n  "OPENAI_API_KEY": "sk-...",\n  "MODEL_NAME": "gpt-4-turbo"\n}');
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  // Per-row redeploy
  const [redeployTarget, setRedeployTarget] = useState<(Deployment & { agent: Agent }) | null>(null);
  const [redeployEnvConfig, setRedeployEnvConfig] = useState('{\n  "OPENAI_API_KEY": "sk-...",\n  "MODEL_NAME": "gpt-4-turbo"\n}');
  const [redeploying, setRedeploying] = useState(false);
  const [redeployError, setRedeployError] = useState('');
  const [viewingLogsAgent, setViewingLogsAgent] = useState<Agent | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const deployData = await api.deploy.list();
      const agentsData = await api.agents.list();

      const mergedDeployments = (deployData || []).map((d: Deployment) => ({
        ...d,
        agent: (agentsData || []).find((a: Agent) => a.id === d.agentId) || { name: d.name || 'Unknown Agent', id: d.agentId } as Agent
      }));
      setDeployments(mergedDeployments);
      setReadyAgents((agentsData || []).filter((a: Agent) => a.status === 'ready'));
    } catch (error) {
      console.error('Error loading deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = async () => {
    if (!selectedAgentId) return;
    setDeploying(true);
    setDeployError('');
    try {
      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(envConfig);
      } catch {
        setDeployError('Invalid JSON in configuration');
        setDeploying(false);
        return;
      }
      const agentId = selectedAgentId;
      const agent = readyAgents.find(a => a.id === agentId);
      await api.deploy.deploy(agentId, parsedEnv);

      // Poll for 30 seconds
      let isReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const [dStat, aStat] = await Promise.all([
            api.deploy.getStatus(agentId),
            api.agents.get(agentId)
          ]);
          if (dStat.status === 'healthy' && aStat.status === 'running') {
            isReady = true;
            break;
          }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 1000));
        loadData();
      }

      setShowDeployModal(false);
      if (isReady && agent) {
        setViewingLogsAgent(agent);
      }
    } catch (error: any) {
      setDeployError(error.message || 'Deployment failed');
    } finally {
      setDeploying(false);
      loadData();
    }
  };

  const handleStop = async (id: string) => {
    setStoppingId(id);
    try {
      await api.deploy.destroy(id);
      // Also update agent status to ready
      await api.agents.update(id, { status: 'ready' });
      loadData();
    } catch (error) {
      console.error('Failed to stop deployment:', error);
    } finally {
      setStoppingId(null);
    }
  };

  const handleRedeploy = async () => {
    if (!redeployTarget) return;
    setRedeploying(true);
    setRedeployError('');
    try {
      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(redeployEnvConfig);
      } catch {
        setRedeployError('Invalid JSON in configuration');
        setRedeploying(false);
        return;
      }
      const agentId = redeployTarget.agentId;
      const agent = redeployTarget.agent;
      await api.deploy.deploy(agentId, parsedEnv);

      // Poll for 30 seconds
      let isReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const [dStat, aStat] = await Promise.all([
            api.deploy.getStatus(agentId),
            api.agents.get(agentId)
          ]);
          if (dStat.status === 'healthy' && aStat.status === 'running') {
            isReady = true;
            break;
          }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 1000));
        loadData();
      }

      setRedeployTarget(null);
      if (isReady && agent) {
        setViewingLogsAgent(agent);
      }
    } catch (error: any) {
      setRedeployError(error.message || 'Redeployment failed');
    } finally {
      setRedeploying(false);
      loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Deployments</h1>
          <p className="text-[13px] text-[#666666] mt-0.5">Monitor and manage your Kubernetes pod instances</p>
        </div>
        <button
          onClick={() => setShowDeployModal(true)}
          className="btn-primary flex items-center gap-1.5 text-[13px]"
        >
          <Rocket className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-[80px] rounded-lg" />
          ))}
        </div>
      ) : deployments.length === 0 ? (
        <div className="border border-dashed border-[#1f1f1f] rounded-xl flex flex-col items-center justify-center py-16 px-8">
          <div className="w-12 h-12 bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl flex items-center justify-center mb-4">
            <Rocket className="w-5 h-5 text-[#444444]" />
          </div>
          <h3 className="text-[15px] font-medium text-white mb-1.5">No active deployments</h3>
          <p className="text-[13px] text-[#555555] text-center mb-5 max-w-xs">
            Deploy your agents to the high-performance Kubernetes cluster to go live
          </p>
          <button
            onClick={() => setShowDeployModal(true)}
            className="btn-primary flex items-center gap-1.5 text-[13px]"
          >
            <Rocket className="w-4 h-4" />
            Start Deployment
          </button>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {deployments.map((deployment: any, index: number) => {
            const status = deployment.k8sStatus || deployment.status || 'stopped';
            const statusInfo = getStatusStyle(status);
            const deployId = deployment.agentId || deployment.id || deployment.deploymentName || String(index);
            const deployName = deployment.name || deployment.agent?.name || 'Unknown Agent';

            return (
              <div
                key={deployId}
                className={`group px-5 py-4 hover:bg-[#0f0f0f] transition-colors ${index !== deployments.length - 1 ? 'border-b border-[#111111]' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.dot}`} />

                  {/* Icon */}
                  <div className="w-9 h-9 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-4 h-4 text-[#888888]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[14px] font-medium text-white truncate">{deployName}</h3>
                      <span className={statusInfo.badge}>{status}</span>
                      <span className="badge badge-neutral text-[10px]">OKE Instance</span>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-[#444444]">
                      {deployment.host && (
                        <a
                          href={`http://${deployment.host}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono hover:text-[#888888] transition-colors"
                        >
                          <Globe className="w-3 h-3" />
                          {deployment.host}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {deployment.traceUrl && (
                        <a
                          href={deployment.traceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-[#888888] transition-colors"
                        >
                          <Activity className="w-3 h-3" />
                          Traces
                        </a>
                      )}
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        ns:{deployment.namespace || 'default'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setRedeployTarget(deployment);
                        setRedeployError('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#888888] hover:text-white border border-[#2a2a2a] hover:border-[#444444] hover:bg-[#111111] rounded-md transition-all"
                      title="Redeploy this agent"
                    >
                      <Rocket className="w-3 h-3" />
                      Redeploy
                    </button>
                    <button
                      onClick={() => handleStop(deployId)}
                      disabled={stoppingId === deployId}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#ef4444] border border-[#2a1515] hover:bg-[#1a0a0a] rounded-md transition-all active:scale-95 disabled:opacity-50"
                      title="Stop deployment"
                    >
                      {stoppingId === deployId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Square className="w-3 h-3 fill-current" />
                      )}
                      Stop
                    </button>
                    <button
                      onClick={() => deployment.agent && setViewingLogsAgent(deployment.agent)}
                      className="p-2 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
                      title="View container logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {deployment.error_message && (
                  <div className="mt-3 ml-[52px] flex items-start gap-2 p-3 bg-[#1a0a0a] border border-[#3a1515] rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-[#f87171] font-mono">{deployment.error_message}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Deploy to Kubernetes</h2>
                  <p className="text-[12px] text-[#555555]">Launch agent on OKE cluster</p>
                </div>
              </div>
              <button onClick={() => setShowDeployModal(false)} className="p-1.5 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Agent selection */}
              <div>
                <label className="block text-[13px] font-medium text-[#888888] mb-2">Select Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="input-base text-[14px]"
                >
                  <option value="">— Select a ready agent —</option>
                  {readyAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id.slice(0, 8)})</option>
                  ))}
                </select>
                {readyAgents.length === 0 && (
                  <p className="text-[12px] text-[#f59e0b] mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No agents are ready for deployment. Complete the build process first.
                  </p>
                )}
              </div>

              {/* Config */}
              <div>
                <label className="block text-[13px] font-medium text-[#888888] mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Environment Configuration (JSON)
                </label>
                <textarea
                  value={envConfig}
                  onChange={(e) => setEnvConfig(e.target.value)}
                  rows={7}
                  className="input-base font-mono text-[13px] resize-none"
                />
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
                  onClick={() => setShowDeployModal(false)}
                  className="btn-secondary flex-1 text-[13px] py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!selectedAgentId || deploying}
                  className="btn-primary flex-[2] text-[13px] py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {deploying ? 'Deploying & Healthy Check...' : 'Deploy to OKE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-row Redeploy Modal */}
      {redeployTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          {/* ... modal content same as before but ensured to be correct ... */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-5 py-4 border-b border-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Redeploy Agent</h2>
                  <p className="text-[12px] text-[#555555] mt-0.5 font-mono">
                    {redeployTarget.agent?.name || redeployTarget.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRedeployTarget(null)}
                className="p-1.5 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Environment Configuration (JSON)
                </label>
                <textarea
                  value={redeployEnvConfig}
                  onChange={(e) => setRedeployEnvConfig(e.target.value)}
                  rows={7}
                  className="input-base font-mono text-[13px] resize-none"
                />
                <p className="text-[12px] text-[#444444] mt-1.5">
                  The existing pod will be stopped and a new one launched with these settings.
                </p>
              </div>

              {redeployError && (
                <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{redeployError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setRedeployTarget(null)}
                  className="btn-secondary flex-1 text-[13px] py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeploy}
                  disabled={redeploying}
                  className="btn-primary flex-[2] text-[13px] py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {redeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {redeploying ? 'Redeploying & Healthy Check...' : `Redeploy ${redeployTarget.agent?.name || redeployTarget.name}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingLogsAgent && (
        <LogsDrawer
          agent={viewingLogsAgent}
          onClose={() => setViewingLogsAgent(null)}
        />
      )}
    </div>
  );
}
