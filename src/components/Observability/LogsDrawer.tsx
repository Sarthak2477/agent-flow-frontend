import { useState, useEffect, useRef } from 'react';
import { X, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { Agent } from '../../types/database';
import { api } from '../../services/api';

interface LogsDrawerProps {
    agent: Agent;
    onClose: () => void;
}

export function LogsDrawer({ agent, onClose }: LogsDrawerProps) {
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);

    const bottomRef = useRef<HTMLDivElement>(null);

    const loadLogs = async () => {
        try {
            const data = await api.logs.getAgentLogs(agent.id, 1000);
            setLogs(data.logs || '');
            setError('');
        } catch (err: any) {
            if (!logs) {
                setError(err.message || 'Failed to fetch logs');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 3000);
        return () => clearInterval(interval);
    }, [agent.id]);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    const renderLogLine = (line: string, index: number) => {
        let colorClass = 'text-[#cccccc]';

        if (line.includes('ERROR') || line.includes('Failed') || line.includes('Exception') || line.includes('422 U') || line.includes('401 C')) {
            colorClass = 'text-[#f87171]';
        } else if (line.includes('WARNING') || line.includes('WARN')) {
            colorClass = 'text-[#fbbf24]';
        } else if (line.includes('INFO') || line.includes('OK')) {
            colorClass = 'text-[#93c5fd]';
        } else if (line.includes('🔭') || line.includes('OpenTelemetry')) {
            colorClass = 'text-[#a78bfa]';
        }

        return (
            <div key={index} className="flex gap-4 hover:bg-[#0f0f0f] px-2 py-0.5 rounded -mx-2">
                <span className="text-[#333333] select-none w-8 text-right shrink-0 font-mono">{index + 1}</span>
                <span className={`break-all font-mono text-[13px] leading-6 ${colorClass}`}>{line || ' '}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 h-screen w-[100%] bg-[#000000] z-[999] flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 bg-[#000000]">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
                            <Terminal className="w-4.5 h-4.5 text-[#888888]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[13px] font-semibold text-white">Logs</h2>
                                <span className="badge badge-success text-[10px] animate-pulse">LIVE</span>
                            </div>
                            <p className="text-[11px] text-[#444444] font-mono">{agent.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-all ${autoScroll
                                ? 'bg-[#0f1f0f] text-[#22c55e] border-[#1a3a1a]'
                                : 'bg-[#111111] text-[#555555] border-[#1f1f1f] hover:text-white'
                                }`}
                        >
                            {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                        </button>
                        <button
                            onClick={() => { setLoading(true); loadLogs(); }}
                            className="p-1.5 text-[#555555] hover:text-white hover:bg-[#111111] rounded-md transition-all"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-[#555555] hover:text-white hover:bg-[#111111] rounded-md transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Terminal Body */}
                <div
                    className="flex-1 overflow-auto bg-[#000000] scrollbar-hide font-mono"
                    onScroll={() => setAutoScroll(false)}
                >
                    <div className="p-6 min-h-full flex flex-col">
                        {error && !logs ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <AlertCircle className="w-10 h-10 text-[#444444] mb-3" />
                                <h3 className="text-[14px] font-medium text-white mb-1">Connection Error</h3>
                                <p className="text-[13px] text-[#555555]">{error}</p>
                            </div>
                        ) : (
                            <div className="flex-1 w-full space-y-0.5 pb-24">
                                {logs.split('\n').map((line, i) => renderLogLine(line, i))}
                                <div ref={bottomRef} />

                                {loading && !logs && (
                                    <div className="flex items-center gap-2 text-[#444444] mt-4 px-2 font-mono text-[12px]">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-[#444444] rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-[#444444] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <span className="w-1.5 h-1.5 bg-[#444444] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                        Connecting to pod...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
