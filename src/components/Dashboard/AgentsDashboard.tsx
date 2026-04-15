import { useState, useEffect } from 'react';
import { Plus, Bot, Github, Rocket, Activity, Clock, ChevronRight, Search } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';
import { CreateAgentModal } from '../Modals/CreateAgentModal';

interface AgentsDashboardProps {
    onSelectAgent: (agent: Agent) => void;
}

function getStatusDot(status: string) {
    switch (status) {
        case 'deployed':
        case 'running':
        case 'succeeded':
            return 'bg-[#3b82f6]';
        case 'ready':
            return 'bg-[#60a5fa]';
        case 'building':
            return 'bg-[#f59e0b] animate-pulse';
        case 'stopped':
            return 'bg-[#666666]';
        default:
            return 'bg-[#333333]';
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'deployed':
        case 'running': return { text: 'Running', color: 'text-[#22c55e] bg-[#0f1f0f] border-[#1a3a1a]' };
        case 'succeeded': return { text: 'Succeeded', color: 'text-[#3b82f6] bg-[#0f1525] border-[#1a2a3a]' };
        case 'ready': return { text: 'Ready', color: 'text-[#60a5fa] bg-[#0f1525] border-[#1a2a3a]' };
        case 'building': return { text: 'Building', color: 'text-[#f59e0b] bg-[#1a1200] border-[#2a2000]' };
        case 'stopped': return { text: 'Stopped', color: 'text-[#666666] bg-[#111111] border-[#1f1f1f]' };
        default: return { text: status, color: 'text-[#555555] bg-[#111111] border-[#1f1f1f]' };
    }
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
}

export function AgentsDashboard({ onSelectAgent }: AgentsDashboardProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState('');

    const loadAgents = async () => {
        try {
            const data = await api.agents.list();
            setAgents((data || []).filter((a: Agent) => a.status !== 'archived'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
        const interval = setInterval(loadAgents, 10000);
        return () => clearInterval(interval);
    }, []);

    const filtered = agents.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    const runningCount = agents.filter(a => a.status === 'running' || a.status === 'deployed').length;
    const readyCount = agents.filter(a => a.status === 'ready').length;

    return (
        <div className="min-h-screen bg-[#000000]">
            {/* Top bar */}
            <div className="border-b border-[#1f1f1f] bg-[#000000] sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[20px] font-semibold text-white tracking-tight">Projects</h1>
                        <p className="text-[12px] text-[#555555] mt-0.5">
                            {agents.length} agent{agents.length !== 1 ? 's' : ''} · {runningCount} running · {readyCount} ready
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444444]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search agents..."
                                className="input-base text-[13px] pl-8 py-1.5 w-52 border-[#1f1f1f] focus:border-[#333333]"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-1.5 text-[13px] py-1.5 px-4"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Agent
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton h-[152px] rounded-xl" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-8">
                        <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl flex items-center justify-center mb-5">
                            <Bot className="w-7 h-7 text-[#333333]" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-white mb-2">
                            {search ? 'No agents found' : 'No agents yet'}
                        </h3>
                        <p className="text-[13px] text-[#555555] text-center mb-6 max-w-sm leading-relaxed">
                            {search
                                ? `No agents match "${search}". Try a different search.`
                                : 'Create your first AI agent. Each agent is a separate project with its own deployment, logs, and traces.'
                            }
                        </p>
                        {!search && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px]"
                            >
                                <Plus className="w-4 h-4" />
                                Create your first agent
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(agent => {
                            const statusInfo = getStatusLabel(agent.status);
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => onSelectAgent(agent)}
                                    className="group text-left bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 hover:border-[#333333] hover:bg-[#0d0d0d] transition-all duration-150 flex flex-col gap-4"
                                >
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#111111] border border-[#1f1f1f] rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-4.5 h-4.5 text-[#666666]" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[14px] font-semibold text-white truncate group-hover:text-white/90">
                                                    {agent.name}
                                                </h3>
                                                <p className="text-[11px] text-[#444444] font-mono mt-0.5">{agent.id.slice(0, 12)}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#333333] group-hover:text-[#555555] transition-colors mt-0.5 flex-shrink-0" />
                                    </div>

                                    {/* Status + repo */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(agent.status)}`} />
                                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${statusInfo.color}`}>
                                                {statusInfo.text}
                                            </span>
                                        </div>
                                        {agent.githubRepo && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-[#444444]">
                                                <Github className="w-3 h-3 flex-shrink-0" />
                                                <span className="font-mono truncate">{agent.githubRepo}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between border-t border-[#111111] pt-3 mt-auto">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-[11px] text-[#333333]">
                                                <Rocket className="w-3 h-3" />
                                                <span>Deploy</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-[#333333]">
                                                <Activity className="w-3 h-3" />
                                                <span>Traces</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-[#333333]">
                                            <Clock className="w-3 h-3" />
                                            <span>{timeAgo(agent.updated_at)}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateAgentModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadAgents();
                    }}
                />
            )}
        </div>
    );
}
