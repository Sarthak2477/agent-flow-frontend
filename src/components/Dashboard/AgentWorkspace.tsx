import { useState, useEffect } from 'react';
import { ArrowLeft, Bot, Rocket, Terminal, Activity, Settings2, Github, Loader2, AlertCircle, Square, Play, Key, Globe, ExternalLink, Check, Copy, ShieldAlert, Upload } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';
import { LogsDrawer } from '../Observability/LogsDrawer';
import { TracesDrawer } from '../Observability/TracesDrawer';
import { EditAgentModal } from '../Modals/EditAgentModal';
import { ApprovalsTab } from '../Views/ApprovalsView';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusDot(status: string) {
    switch (status) {
        case 'deployed': case 'running': return 'bg-[#22c55e] status-dot-success';
        case 'succeeded': return 'bg-[#3b82f6]';
        case 'ready': return 'bg-[#60a5fa]';
        case 'building': return 'bg-[#f59e0b] animate-pulse';
        case 'stopped': return 'bg-[#666666]';
        default: return 'bg-[#333333]';
    }
}

function parseEnvContents(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const [key, ...vals] = line.split('=');
        if (key && vals.length > 0) {
            env[key.trim()] = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    }
    return env;
}

function getBadge(status: string) {
    switch (status) {
        case 'running': case 'deployed': return 'badge badge-success';
        case 'succeeded': return 'badge badge-info text-[#3b82f6] border-[#3b82f6]';
        case 'ready': return 'badge badge-info';
        case 'building': return 'badge badge-warning';
        case 'stopped': case 'draft': return 'badge badge-neutral';
        default: return 'badge badge-neutral';
    }
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ agent, onDeploy, onStop, onLinkRepo, stoppingId }:
    { agent: Agent; onDeploy: () => void; onStop: () => void; onLinkRepo: () => void; stoppingId: boolean }) {
    const isLive = agent.status === 'running' || agent.status === 'deployed' || agent.status === 'succeeded';
    const [deployment, setDeployment] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                // Use the list endpoint — it reliably returns host/namespace
                const all = await api.deploy.list();
                const match = (all || []).find(
                    (d: any) => d.agentId === agent.id || d.name === agent.name
                );
                if (match) setDeployment(match);
            } catch { }
        };
        load();
        const interval = setInterval(load, 8000);
        return () => clearInterval(interval);
    }, [agent.id]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Endpoint card — shown whenever we have a host */}
            {console.log("Deployment: ", deployment)}
            {deployment?.host && (
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" />
                            Endpoint
                        </h3>
                        {deployment.status === "running" && <span className="badge badge-success text-[10px] animate-pulse">LIVE</span>}
                    </div>
                    <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#888888] rounded-lg px-3 py-2.5">
                        <span className="flex-1 text-[13px] text-[#888888] font-mono truncate">
                            http://{deployment.host}
                        </span>
                        <button
                            onClick={() => handleCopy(`http://${deployment.host}`)}
                            className="flex-shrink-0 p-1 text-[#888888]/60 hover:text-[#888888] transition-colors"
                            title="Copy endpoint"
                        >
                            {copied
                                ? <Check className="w-3.5 h-3.5" />
                                : <Copy className="w-3.5 h-3.5" />
                            }
                        </button>
                        <a
                            href={`http://${deployment.host}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-1 text-[#888888]/60 hover:text-[#888888] transition-colors"
                            title="Open in browser"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>

                </div>
            )}
            {console.log(agent)}
            {/* Status card */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider">Status</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(agent.status)}`} />
                        <span className={getBadge(agent.status)}>{isLive ? 'Live' : agent.status}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                        <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Agent ID</p>
                        <p className="text-[12px] text-[#888888] font-mono">{agent.id.slice(0, 12)}</p>
                    </div>
                    <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                        <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Modified</p>
                        <p className="text-[12px] text-[#888888] font-mono">
                            {new Date(agent.updated_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* GitHub repo card */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider mb-4">Source</h3>
                {agent.githubRepo ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
                            <Github className="w-4 h-4 text-[#888888]" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-white font-mono">{agent.githubRepo}</p>
                            <p className="text-[11px] text-[#555555] mt-0.5">Connected GitHub repository</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-[13px] text-[#555555]">No repository connected</p>
                        <button
                            onClick={onLinkRepo}
                            className="text-[12px] text-[#555555] hover:text-[#888888] transition-colors border border-[#1f1f1f] hover:border-[#333333] hover:bg-[#111111] px-3 py-1.5 rounded-md"
                        >
                            Link Repository
                        </button>
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider mb-4">Actions</h3>
                <div className="flex gap-3 flex-wrap">
                    {(agent.status === 'ready' || agent.status === 'deployed' || agent.status === 'running') && (
                        <button
                            onClick={onDeploy}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-[13px] font-medium hover:bg-[#e8e8e8] active:scale-95 transition-all"
                        >
                            <Rocket className="w-3.5 h-3.5" />
                            {isLive ? 'Redeploy' : 'Deploy'}
                        </button>
                    )}
                    {isLive && (
                        <button
                            onClick={onStop}
                            disabled={stoppingId}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1a0a0a] text-[#ef4444] border border-[#3a1515] rounded-lg text-[13px] font-medium hover:bg-[#200e0e] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {stoppingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                            Stop
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Deploy Tab ────────────────────────────────────────────────────────────────

function DeployTab({ agent, onRefresh }: { agent: Agent; onRefresh: (updatedAgent?: Agent) => void }) {
    const [envConfig, setEnvConfig] = useState('{\n  "OPENAI_API_KEY": "sk-...",\n  "MODEL_NAME": "gpt-4-turbo"\n}');
    const [deploying, setDeploying] = useState(false);
    const [deployError, setDeployError] = useState('');
    const [deploySuccess, setDeploySuccess] = useState(false);
    const [stoppingId, setStoppingId] = useState(false);
    const [deployment, setDeployment] = useState<any>(null);
    const [loadingDeploy, setLoadingDeploy] = useState(true);

    const isLive = agent.status === 'running' || agent.status === 'deployed' || agent.status === 'succeeded';
    const isJob = agent.config?.executionMode === 'job';

    const loadDeployment = async () => {
        try {
            const data = await api.deploy.getStatus(agent.id);
            setDeployment(data);
        } catch {
            setDeployment(null);
        } finally {
            setLoadingDeploy(false);
        }
    };

    useEffect(() => {
        loadDeployment();
        const interval = setInterval(loadDeployment, 8000);
        return () => clearInterval(interval);
    }, [agent.id]);

    const handleDeploy = async () => {
        setDeploying(true);
        setDeployError('');
        setDeploySuccess(false);
        try {
            let parsedEnv = {};
            try { parsedEnv = JSON.parse(envConfig); } catch {
                setDeployError('Invalid JSON in configuration');
                setDeploying(false);
                return;
            }
            if (isJob) {
                await api.deploy.run(agent.id, parsedEnv);
            } else {
                await api.deploy.deploy(agent.id, parsedEnv);
            }

            let ready = false;
            for (let i = 0; i < 30; i++) {
                try {
                    const [dStat, aStat] = await Promise.all([
                        api.deploy.getStatus(agent.id),
                        api.agents.get(agent.id),
                    ]);
                    if ((dStat.status === 'healthy' || dStat.status === 'succeeded') &&
                        (aStat.status === 'running' || aStat.status === 'succeeded')) {
                        ready = true;
                        break;
                    }
                } catch { }
                await new Promise(r => setTimeout(r, 1000));
                loadDeployment();
            }
            setDeploySuccess(ready);
            onRefresh();
        } catch (err: any) {
            setDeployError(err.message || 'Deployment failed');
        } finally {
            setDeploying(false);
            loadDeployment();
        }
    };

    const handleStop = async () => {
        setStoppingId(true);
        try {
            await api.deploy.destroy(agent.id);
            await api.agents.update(agent.id, { status: 'ready' });
            onRefresh();
            loadDeployment();
        } catch (e) {
            console.error(e);
        } finally {
            setStoppingId(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Current pod status */}
            {!loadingDeploy && deployment && (
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider">Current Pod</h3>
                        <span className={`badge ${isLive ? 'badge-success' : 'badge-neutral'}`}>
                            {deployment.status || agent.status}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {deployment.host && (
                            <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                                <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Endpoint</p>
                                <a href={`http://${deployment.host}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[12px] text-[#60a5fa] font-mono hover:underline">
                                    <Globe className="w-3 h-3" />
                                    {deployment.host}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </div>
                        )}
                        <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                            <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Namespace</p>
                            <p className="text-[12px] text-[#888888] font-mono">{deployment.namespace || 'default'}</p>
                        </div>
                    </div>
                    {isLive && (
                        <div className="mt-4 pt-4 border-t border-[#111111]">
                            <button onClick={handleStop} disabled={stoppingId}
                                className="flex items-center gap-2 px-4 py-2 text-[#ef4444] border border-[#2a1515] rounded-lg text-[13px] hover:bg-[#1a0a0a] transition-all disabled:opacity-50">
                                {stoppingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                                Stop Deployment
                            </button>
                        </div>
                    )}
                    {deployment.error_message && (
                        <div className="mt-3 flex items-start gap-2 p-3 bg-[#1a0a0a] border border-[#3a1515] rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] mt-0.5 flex-shrink-0" />
                            <p className="text-[12px] text-[#f87171] font-mono">{deployment.error_message}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Deploy form */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        {isJob ? <Play className="w-4 h-4 text-black fill-current" /> : <Rocket className="w-4 h-4 text-black" />}
                    </div>
                    <div>
                        <h3 className="text-[14px] font-semibold text-white">
                            {isJob ? 'Run Job' : (isLive ? 'Redeploy' : 'Deploy')} {isJob ? '' : 'to Kubernetes'}
                        </h3>
                        <p className="text-[11px] text-[#555555]">{isJob ? 'Execute once on' : 'OKE cluster · '} {agent.name}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[12px] font-medium text-[#888888] flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5" />
                            Environment Configuration (JSON)
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-[#60a5fa] hover:text-[#3b82f6] cursor-pointer transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>Upload .env</span>
                            <input
                                type="file"
                                accept=".env"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const text = await file.text();
                                    const parsed = parseEnvContents(text);
                                    setEnvConfig(JSON.stringify(parsed, null, 2));
                                }}
                            />
                        </label>
                    </div>
                    <textarea
                        value={envConfig}
                        onChange={e => setEnvConfig(e.target.value)}
                        rows={8}
                        className="input-base font-mono text-[13px] resize-none"
                    />
                    <p className="text-[11px] text-[#444444] mt-1.5">Provide API keys and environment variables for this deployment. You can also upload an .env file to populate this.</p>
                </div>

                {deployError && (
                    <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{deployError}</span>
                    </div>
                )}

                {deploySuccess && (
                    <div className="bg-[#0f1f0f] border border-[#1a3a1a] rounded-lg p-3 text-[#22c55e] text-[13px]">
                        ✓ Deployment successful — agent is running
                    </div>
                )}

                <button onClick={handleDeploy} disabled={deploying}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-[13px] disabled:opacity-50">
                    {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    {deploying
                        ? (isJob ? 'Starting Job…' : (isLive ? 'Redeploying & Health Check…' : 'Deploying & Health Check…'))
                        : (isJob ? 'Run Now' : (isLive ? 'Redeploy' : 'Deploy to OKE'))
                    }
                </button>
            </div>
        </div>
    );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function AgentSettingsTab({ agent, onRefresh, onDelete }: { agent: Agent; onRefresh: () => void; onDelete: () => void }) {
    const [availableRepos, setAvailableRepos] = useState<string[]>([]);
    const [showRepoSelector, setShowRepoSelector] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [connectingRepo, setConnectingRepo] = useState(false);
    const [editModal, setEditModal] = useState(false);

    useEffect(() => {
        api.github.getRepos().then((repos: any[]) => {
            setAvailableRepos(
                (repos || []).map((r: any) => {
                    if (typeof r === 'string') return r;
                    if (r.fullName) return r.fullName;
                    if (r.full_name) return r.full_name;
                    if (r.owner && r.name) return `${r.owner.login || r.owner.name}/${r.name}`;
                    return r.name || JSON.stringify(r);
                }).filter(Boolean)
            );
        }).catch(() => { });
    }, []);

    const handleConnectRepo = async () => {
        if (!selectedRepo) return;
        setConnectingRepo(true);
        try {
            await api.agents.connectGitHub(agent.id, selectedRepo);
            setShowRepoSelector(false);
            setSelectedRepo('');
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setConnectingRepo(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
        try {
            await api.agents.update(agent.id, { status: 'archived' });
            onDelete();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Edit config */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider mb-4">Configuration</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                        <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Name</p>
                        <p className="text-[13px] text-white font-medium">{agent.name}</p>
                    </div>
                    <div className="bg-[#050505] border border-[#111111] rounded-lg p-3">
                        <p className="text-[11px] text-[#444444] uppercase tracking-wider mb-1">Created</p>
                        <p className="text-[12px] text-[#888888]">{new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <button onClick={() => setEditModal(true)}
                    className="btn-secondary text-[13px] py-2 px-4">
                    Edit Configuration
                </button>
            </div>

            {/* GitHub */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-[#888888] uppercase tracking-wider mb-4">GitHub Repository</h3>
                {agent.githubRepo ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Github className="w-4 h-4 text-[#888888]" />
                            <span className="text-[13px] text-white font-mono">{agent.githubRepo}</span>
                        </div>
                        <button onClick={() => setShowRepoSelector(true)}
                            className="text-[12px] text-[#555555] hover:text-white transition-colors px-3 py-1 rounded border border-[#1f1f1f] hover:border-[#2a2a2a]">
                            Change
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-[13px] text-[#555555] mb-3">No repository linked yet.</p>
                        {!showRepoSelector ? (
                            <button onClick={() => setShowRepoSelector(true)}
                                className="flex items-center gap-2 text-[13px] px-4 py-2 border border-[#2a2a2a] rounded-lg text-[#888888] hover:text-white hover:border-[#444444] hover:bg-[#111111] transition-all">
                                <Github className="w-3.5 h-3.5" />
                                Link Repository
                            </button>
                        ) : null}
                    </div>
                )}

                {showRepoSelector && (
                    <div className="mt-4 flex items-center gap-2">
                        <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}
                            className="input-base text-[13px] flex-1 py-1.5">
                            <option value="">Select repository…</option>
                            {availableRepos.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={handleConnectRepo} disabled={!selectedRepo || connectingRepo}
                            className="btn-primary text-[12px] py-1.5 px-3 disabled:opacity-50">
                            {connectingRepo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                        </button>
                        <button onClick={() => { setShowRepoSelector(false); setSelectedRepo(''); }}
                            className="btn-secondary text-[12px] py-1.5 px-3">Cancel</button>
                    </div>
                )}
            </div>

            {/* Danger zone */}
            <div className="bg-[#0a0a0a] border border-[#2a1515] rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-[#ef4444] uppercase tracking-wider mb-2">Danger Zone</h3>
                <p className="text-[12px] text-[#555555] mb-4">Permanently delete this agent and all its data.</p>
                <button onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#ef4444] border border-[#3a1515] rounded-lg hover:bg-[#1a0a0a] transition-all">
                    Delete Agent
                </button>
            </div>

            {editModal && (
                <EditAgentModal agent={agent} onClose={() => setEditModal(false)} onUpdated={() => { setEditModal(false); onRefresh(); }} />
            )}
        </div>
    );
}

// ── Main Agent Workspace ──────────────────────────────────────────────────────

type Tab = 'overview' | 'deploy' | 'approvals' | 'logs' | 'traces' | 'settings';

interface AgentWorkspaceProps {
    agent: Agent;
    onBack: () => void;
}

export function AgentWorkspace({ agent: initialAgent, onBack }: AgentWorkspaceProps) {
    const [agent, setAgent] = useState(initialAgent);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [showLogs, setShowLogs] = useState(false);
    const [showTraces, setShowTraces] = useState(false);
    const [stoppingId, setStoppingId] = useState(false);

    const refreshAgent = async () => {
        try {
            const updated = await api.agents.get(agent.id);
            setAgent(updated);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const interval = setInterval(refreshAgent, 8000);
        return () => clearInterval(interval);
    }, [agent.id]);

    const isLive = agent.status === 'running' || agent.status === 'deployed' || agent.status === 'succeeded';

    const handleStop = async () => {
        setStoppingId(true);
        try {
            await api.deploy.destroy(agent.id);
            await api.agents.update(agent.id, { status: 'ready' });
            await refreshAgent();
        } catch (e) {
            console.error(e);
        } finally {
            setStoppingId(false);
        }
    };

    const tabs: { id: Tab; label: string; icon: any; disabled?: boolean }[] = [
        { id: 'overview', label: 'Overview', icon: Bot },
        { id: 'deploy', label: 'Deploy', icon: Rocket },
        { id: 'approvals', label: 'Approvals', icon: ShieldAlert },
        { id: 'logs', label: 'Logs', icon: Terminal },
        { id: 'traces', label: 'Traces', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings2 },
    ];

    const renderTab = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        agent={agent}
                        onDeploy={() => setActiveTab('deploy')}
                        onStop={handleStop}
                        onLinkRepo={() => setActiveTab('settings')}
                        stoppingId={stoppingId}
                    />
                );
            case 'deploy':
                return <DeployTab agent={agent} onRefresh={refreshAgent} />;
            case 'approvals':
                return <ApprovalsTab agentId={agent.id} />;
            case 'logs':
                return (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 bg-[#111111] border border-[#1f1f1f] rounded-xl flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-[#555555]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-[15px] font-medium text-white mb-1.5">Container Logs</h3>
                            <p className="text-[13px] text-[#555555] mb-5">View real-time logs from the running pod</p>
                        </div>
                        <button onClick={() => setShowLogs(true)}
                            className="btn-primary flex items-center gap-2 text-[13px]"
                            disabled={!isLive}>
                            <Terminal className="w-4 h-4" />
                            Open Terminal
                        </button>
                        {!isLive && <p className="text-[12px] text-[#444444]">Agent must be running to view logs</p>}
                    </div>
                );
            case 'traces':
                return (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 bg-[#111111] border border-[#1f1f1f] rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5 text-[#555555]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-[15px] font-medium text-white mb-1.5">Observability Traces</h3>
                            <p className="text-[13px] text-[#555555] mb-5">Inspect spans, LLM calls, and tool executions via Arize Phoenix</p>
                        </div>
                        <button onClick={() => setShowTraces(true)}
                            className="btn-primary flex items-center gap-2 text-[13px]">
                            <Activity className="w-4 h-4" />
                            Open Traces
                        </button>
                    </div>
                );
            case 'settings':
                return (
                    <AgentSettingsTab agent={agent} onRefresh={refreshAgent} onDelete={onBack} />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#000000]">
            {/* Top header */}
            <div className="border-b border-[#1f1f1f] bg-[#000000] sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
                    <button onClick={onBack}
                        className="flex items-center gap-1.5 text-[#555555] hover:text-white transition-colors text-[13px]">
                        <ArrowLeft className="w-4 h-4" />
                        Projects
                    </button>
                    <span className="text-[#333333]">/</span>

                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 bg-[#111111] border border-[#1f1f1f] rounded-md flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-[#666666]" />
                        </div>
                        <span className="text-[14px] font-semibold text-white">{agent.name}</span>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(agent.status)}`} />
                            <span className={getBadge(agent.status)}>{agent.status}</span>
                        </div>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="max-w-7xl mx-auto px-6 flex border-t border-[#111111]">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                disabled={tab.disabled}
                                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${isActive
                                    ? 'border-white text-white'
                                    : 'border-transparent text-[#555555] hover:text-[#888888]'
                                    } ${tab.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {renderTab()}
            </div>

            {/* Fullscreen overlays */}
            {showLogs && (
                <LogsDrawer agent={agent} onClose={() => setShowLogs(false)} />
            )}
            {showTraces && (
                <TracesDrawer agent={agent} onClose={() => setShowTraces(false)} />
            )}
        </div>
    );
}
