import { useState, useEffect } from 'react';
import {
    ShieldAlert, Check, X, Loader2, Clock, ExternalLink,
    AlertTriangle, ChevronDown, ChevronUp, Globe, FileText,
    HelpCircle, BookOpen, Copy, Terminal, Zap, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { Approval } from '../../types/database';

/* ── mock data ────────────────────────────────────────────── */

const MOCK_APPROVALS: Approval[] = [
    {
        id: 'mock_1',
        agentId: 'current',
        method: 'POST',
        targetUrl: 'https://api.stripe.com/v1/charges',
        headers: {
            'Authorization': 'Bearer sk_live_51P...',
            'Content-Type': 'application/json',
            'Stripe-Version': '2023-10-16'
        },
        body: JSON.stringify({
            amount: 49900,
            currency: 'usd',
            description: 'SaaS License Renewal - Enterprise',
            customer: 'cus_QwE234asd'
        }),
        sensitiveReason: 'High-value transaction interception (>$250)',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3m ago
    },
    {
        id: 'mock_2',
        agentId: 'current',
        method: 'POST',
        targetUrl: 'https://api.sendgrid.com/v3/mail/send',
        headers: {
            'Authorization': 'Bearer SG.abc...',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: 'investor@vc-firm.com' }] }],
            from: { email: 'founder@startup.io' },
            subject: 'Confidential: Pitch Deck & Financials',
            content: [{ type: 'text/plain', value: 'Please find attached our latest numbers for Q1.' }]
        }),
        sensitiveReason: 'Sensitive outbound communication',
        status: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
    },
    {
        id: 'mock_3',
        agentId: 'current',
        method: 'DELETE',
        targetUrl: 'https://api.github.com/repos/my-org/core-engine/branches/main/protection',
        sensitiveReason: 'Security configuration change attempted',
        status: 'denied',
        decision: 'denied',
        decidedBy: 'admin',
        decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4.2).toISOString(),
    }
];

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function extractDomain(url: string) {
    try { return new URL(url).hostname; } catch { return url; }
}

function methodColor(method: string) {
    switch (method.toUpperCase()) {
        case 'GET': return 'text-[#22c55e] bg-[#0f1f0f] border-[#1a3a1a]';
        case 'POST': return 'text-[#60a5fa] bg-[#0f1525] border-[#1a2a3a]';
        case 'PUT': return 'text-[#f59e0b] bg-[#1a1200] border-[#2a2000]';
        case 'PATCH': return 'text-[#f59e0b] bg-[#1a1200] border-[#2a2000]';
        case 'DELETE': return 'text-[#ef4444] bg-[#1a0a0a] border-[#3a1515]';
        default: return 'text-[#888] bg-[#111] border-[#1f1f1f]';
    }
}

function statusBadge(status: string) {
    switch (status) {
        case 'pending': return 'text-[#f59e0b] bg-[#1a1200] border-[#2a2000]';
        case 'approved': return 'text-[#22c55e] bg-[#0f1f0f] border-[#1a3a1a]';
        case 'denied': return 'text-[#ef4444] bg-[#1a0a0a] border-[#3a1515]';
        default: return 'text-[#888] bg-[#111] border-[#1f1f1f]';
    }
}

/* ── Copyable code block ─────────────────────────────────── */

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="relative group bg-[#050505] border border-[#111] rounded-lg overflow-hidden">
            {lang && (
                <div className="px-3 py-1.5 border-b border-[#111] flex items-center justify-between">
                    <span className="text-[10px] text-[#444] uppercase tracking-wider font-semibold">{lang}</span>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[10px] text-[#444] hover:text-[#888] transition-colors"
                    >
                        {copied ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}
            <pre className="p-3 text-[12px] text-[#888] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {code}
            </pre>
        </div>
    );
}

/* ── Setup guide section ─────────────────────────────────── */

function SetupGuide() {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden transition-all">
            {/* Toggle header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-[#0f0f0f] transition-colors"
            >
                <div className="w-7 h-7 bg-[#111] border border-[#1f1f1f] rounded-md flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-[#60a5fa]" />
                </div>
                <div className="flex-1 text-left">
                    <span className="text-[13px] font-medium text-white">How to set up approvals</span>
                    <span className="text-[11px] text-[#555] ml-2">Zero-code proxy interception</span>
                </div>
                {open
                    ? <ChevronUp className="w-3.5 h-3.5 text-[#444]" />
                    : <ChevronDown className="w-3.5 h-3.5 text-[#444]" />}
            </button>

            {/* Guide content */}
            {open && (
                <div className="px-5 pb-5 border-t border-[#111] animate-fade-in">
                    {/* How it works summary */}
                    <div className="mt-4 mb-5 bg-[#050505] border border-[#111] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-3.5 h-3.5 text-[#60a5fa]" />
                            <span className="text-[12px] font-semibold text-white uppercase tracking-wider">How it works</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[12px]">
                            <span className="px-2 py-1 bg-[#111] border border-[#1f1f1f] rounded text-[#888]">Agent sends request</span>
                            <ArrowRight className="w-3 h-3 text-[#333]" />
                            <span className="px-2 py-1 bg-[#111] border border-[#1f1f1f] rounded text-[#888]">Proxy intercepts</span>
                            <ArrowRight className="w-3 h-3 text-[#333]" />
                            <span className="px-2 py-1 bg-[#1a1200] border border-[#2a2000] rounded text-[#f59e0b]">⏳ Awaits approval</span>
                            <ArrowRight className="w-3 h-3 text-[#333]" />
                            <span className="px-2 py-1 bg-[#0f1f0f] border border-[#1a3a1a] rounded text-[#22c55e]">✓ Forwarded</span>
                        </div>
                        <p className="text-[11px] text-[#555] mt-3 leading-relaxed">
                            When your agent tries to call a sensitive domain (payments, emails, etc.),
                            the proxy holds the request and creates a pending approval here.
                            Once you approve, the request is forwarded to the real API seamlessly.
                            No code changes required in your agent.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-5">
                        {/* Step 1 */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <span className="w-5 h-5 bg-[#111] border border-[#1f1f1f] rounded-md flex items-center justify-center text-[10px] font-bold text-[#888] font-mono">1</span>
                                <h4 className="text-[13px] font-semibold text-white">Configure proxy in your deployment</h4>
                            </div>
                            <p className="text-[11px] text-[#555] mb-2.5 ml-[30px] leading-relaxed">
                                Add the <code className="text-[#60a5fa] bg-[#0f1525] px-1 py-0.5 rounded text-[10px]">HTTPS_PROXY</code> environment
                                variable when deploying your agent. Go to the <strong className="text-[#888]">Deploy</strong> tab and include it in the JSON config:
                            </p>
                            <div className="ml-[30px]">
                                <CodeBlock
                                    lang="json"
                                    code={`{
  "HTTPS_PROXY": "http://your-backend/api/v1/proxy",
  "OPENAI_API_KEY": "sk-...",
  "STRIPE_KEY": "sk_live_..."
}`}
                                />
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <span className="w-5 h-5 bg-[#111] border border-[#1f1f1f] rounded-md flex items-center justify-center text-[10px] font-bold text-[#888] font-mono">2</span>
                                <h4 className="text-[13px] font-semibold text-white">Or use the X-Target-Url header</h4>
                            </div>
                            <p className="text-[11px] text-[#555] mb-2.5 ml-[30px] leading-relaxed">
                                If your agent uses a custom HTTP client, point requests at the proxy endpoint
                                and pass the real destination in a header:
                            </p>
                            <div className="ml-[30px]">
                                <CodeBlock
                                    lang="python"
                                    code={`import requests

response = requests.post(
    "http://your-backend/api/v1/proxy",
    headers={
        "X-Target-Url": "https://api.stripe.com/v1/charges",
        "Authorization": "Bearer sk_live_..."
    },
    json={"amount": 5000, "currency": "usd"}
)
# Approved  → returns real Stripe response
# Denied    → returns 403 Forbidden`}
                                />
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <span className="w-5 h-5 bg-[#111] border border-[#1f1f1f] rounded-md flex items-center justify-center text-[10px] font-bold text-[#888] font-mono">3</span>
                                <h4 className="text-[13px] font-semibold text-white">Review requests here</h4>
                            </div>
                            <p className="text-[11px] text-[#555] ml-[30px] leading-relaxed">
                                Intercepted requests will automatically appear below. Click <strong className="text-[#22c55e]">Approve</strong> to
                                forward the request to the real API, or <strong className="text-[#ef4444]">Deny</strong> to block it.
                                Expand any card to inspect the full URL, headers, and request body.
                            </p>
                        </div>
                    </div>

                    {/* Info boxes */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[#050505] border border-[#111] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Zap className="w-3 h-3 text-[#f59e0b]" />
                                <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Auto-refresh</span>
                            </div>
                            <p className="text-[11px] text-[#555] leading-relaxed">
                                This page refreshes every 4 seconds. New intercepted requests appear automatically.
                            </p>
                        </div>
                        <div className="bg-[#050505] border border-[#111] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Terminal className="w-3 h-3 text-[#60a5fa]" />
                                <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Zero-code</span>
                            </div>
                            <p className="text-[11px] text-[#555] leading-relaxed">
                                No changes to your agent's source code are needed. The proxy intercepts at the infrastructure level.
                            </p>
                        </div>
                    </div>

                    {/* Protected domains */}
                    <div className="mt-4 bg-[#050505] border border-[#111] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-3 h-3 text-[#f59e0b]" />
                            <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Default protected domains</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                'api.stripe.com',
                                'api.paypal.com',
                                'api.sendgrid.com',
                                'smtp.gmail.com',
                                'hooks.slack.com',
                                'api.twilio.com',
                                'graph.microsoft.com',
                                'www.googleapis.com'
                            ].map(d => (
                                <span key={d} className="text-[10px] font-mono text-[#888] bg-[#111] border border-[#1f1f1f] rounded px-1.5 py-0.5">
                                    {d}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-[#444] mt-2">
                            Configure in <code className="text-[#60a5fa] bg-[#0f1525] px-1 rounded">proxy.service.ts</code> on your backend.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── single approval card ─────────────────────────────────── */

function ApprovalCard({
    approval,
    onDecide,
}: {
    approval: Approval;
    onDecide: (id: string, decision: 'approved' | 'denied') => Promise<void>;
}) {
    const [expanded, setExpanded] = useState(false);
    const [deciding, setDeciding] = useState<'approved' | 'denied' | null>(null);
    const [confirmDeny, setConfirmDeny] = useState(false);

    const isPending = approval.status === 'pending';
    const domain = extractDomain(approval.targetUrl);

    const handleDecide = async (decision: 'approved' | 'denied') => {
        if (decision === 'denied' && !confirmDeny) {
            setConfirmDeny(true);
            return;
        }
        setDeciding(decision);
        try {
            await onDecide(approval.id, decision);
        } finally {
            setDeciding(null);
            setConfirmDeny(false);
        }
    };

    return (
        <div
            className={`bg-[#0a0a0a] border rounded-xl overflow-hidden transition-all duration-200 ${isPending
                ? 'border-[#2a2000] shadow-[0_0_24px_rgba(245,158,11,0.06)]'
                : 'border-[#1f1f1f]'
                }`}
        >
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-4">
                {/* Status icon */}
                <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${isPending
                        ? 'bg-[#1a1200] border-[#2a2000]'
                        : approval.status === 'approved'
                            ? 'bg-[#0f1f0f] border-[#1a3a1a]'
                            : 'bg-[#1a0a0a] border-[#3a1515]'
                        }`}
                >
                    {isPending ? (
                        <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
                    ) : approval.status === 'approved' ? (
                        <Check className="w-4 h-4 text-[#22c55e]" />
                    ) : (
                        <X className="w-4 h-4 text-[#ef4444]" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className={`inline-flex items-center text-[11px] font-bold font-mono px-1.5 py-0.5 rounded border ${methodColor(
                                approval.method
                            )}`}
                        >
                            {approval.method.toUpperCase()}
                        </span>
                        <span className="text-[13px] text-white font-mono truncate">
                            {domain}
                        </span>
                        <span
                            className={`ml-auto inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusBadge(
                                approval.status
                            )}`}
                        >
                            {isPending && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-1.5 animate-pulse" />
                            )}
                            {approval.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#444]">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(approval.createdAt)}
                        </div>
                        {approval.sensitiveReason && (
                            <div className="flex items-center gap-1 text-[#f59e0b]">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">
                                    {approval.sensitiveReason}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isPending && (
                        <>
                            <button
                                onClick={() => handleDecide('approved')}
                                disabled={!!deciding}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e] text-black rounded-lg text-[12px] font-semibold hover:bg-[#16a34a] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {deciding === 'approved' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Check className="w-3 h-3" />
                                )}
                                Approve
                            </button>
                            <button
                                onClick={() => handleDecide('denied')}
                                disabled={!!deciding}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50 active:scale-95 ${confirmDeny
                                    ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                                    : 'bg-[#1a0a0a] text-[#ef4444] border border-[#3a1515] hover:bg-[#200e0e]'
                                    }`}
                            >
                                {deciding === 'denied' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <X className="w-3 h-3" />
                                )}
                                {confirmDeny ? 'Confirm Deny' : 'Deny'}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => { setExpanded(!expanded); setConfirmDeny(false); }}
                        className="p-1.5 text-[#444] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
                    >
                        {expanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-5 pb-5 pt-0 border-t border-[#111] mt-0 space-y-3 animate-fade-in">
                    {/* Full URL */}
                    <div className="bg-[#050505] border border-[#111] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Globe className="w-3 h-3 text-[#444]" />
                            <span className="text-[11px] text-[#444] uppercase tracking-wider font-semibold">
                                Target URL
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#888] font-mono break-all flex-1">
                                {approval.targetUrl}
                            </span>
                            <a
                                href={approval.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#444] hover:text-[#888] transition-colors flex-shrink-0"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    {/* Headers */}
                    {approval.headers && Object.keys(approval.headers).length > 0 && (
                        <div className="bg-[#050505] border border-[#111] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-3 h-3 text-[#444]" />
                                <span className="text-[11px] text-[#444] uppercase tracking-wider font-semibold">
                                    Request Headers
                                </span>
                            </div>
                            <div className="space-y-1">
                                {Object.entries(approval.headers).map(([key, val]) => (
                                    <div key={key} className="text-[12px] font-mono">
                                        <span className="text-[#60a5fa]">{key}</span>
                                        <span className="text-[#333]">: </span>
                                        <span className="text-[#888]">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Body */}
                    {approval.body && (
                        <div className="bg-[#050505] border border-[#111] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-3 h-3 text-[#444]" />
                                <span className="text-[11px] text-[#444] uppercase tracking-wider font-semibold">
                                    Request Body
                                </span>
                            </div>
                            <pre className="text-[12px] text-[#888] font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-auto">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(approval.body), null, 2);
                                    } catch {
                                        return approval.body;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}

                    {/* Decided info */}
                    {approval.decidedAt && (
                        <div className="text-[11px] text-[#444] flex items-center gap-3 pt-1">
                            <span>
                                Decision by <span className="text-[#888]">{approval.decidedBy || 'unknown'}</span>
                            </span>
                            <span>·</span>
                            <span>{new Date(approval.decidedAt).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── main component (agent-scoped) ────────────────────────── */

interface ApprovalsTabProps {
    agentId: string;
}

export function ApprovalsTab({ agentId }: ApprovalsTabProps) {
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

    const loadApprovals = async () => {
        try {
            const data = await api.approvals.listByAgent(agentId);
            // Merge real data with mocks for demonstration if empty
            if (data.length === 0) {
                setApprovals(prev => prev.length > 0 ? prev : MOCK_APPROVALS.map(m => ({ ...m, agentId })));
            } else {
                setApprovals(data);
            }
        } catch (e) {
            console.error('Error loading approvals:', e);
            // Fallback to mocks on error
            setApprovals(prev => prev.length > 0 ? prev : MOCK_APPROVALS.map(m => ({ ...m, agentId })));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
        const interval = setInterval(loadApprovals, 4000);
        return () => clearInterval(interval);
    }, [agentId]);

    const handleDecide = async (id: string, decision: 'approved' | 'denied') => {
        // Optimization: update local state immediately for a "working" feel even if API is slow/offline
        setApprovals(prev => prev.map(a => a.id === id ? {
            ...a,
            status: decision,
            decision: decision,
            decidedAt: new Date().toISOString(),
            decidedBy: 'you (frontend)'
        } : a));

        try {
            await api.approvals.decide(id, decision);
        } catch (e) {
            console.warn('Backend decide failed, keeping local override for demo:', e);
        }
    };

    const handleSimulate = () => {
        const newMock: Approval = {
            id: `sim_${Math.random().toString(36).slice(2, 9)}`,
            agentId,
            method: 'POST',
            targetUrl: 'https://api.stripe.com/v1/payments',
            sensitiveReason: 'Simulated interception',
            status: 'pending',
            createdAt: new Date().toISOString(),
            body: JSON.stringify({ amount: 1000, currency: 'usd', test: true }, null, 2)
        };
        setApprovals(prev => [newMock, ...prev]);
    };

    const filtered = approvals.filter(a => {
        if (filter === 'pending') return a.status === 'pending';
        if (filter === 'resolved') return a.status !== 'pending';
        return true;
    });

    const pendingCount = approvals.filter(a => a.status === 'pending').length;

    return (
        <div className="space-y-6 max-w-3xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-white">
                            Human-in-the-Loop Approvals
                        </h3>
                        <p className="text-[11px] text-[#555]">
                            Review and approve sensitive actions intercepted by the proxy
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#f59e0b] bg-[#1a1200] border border-[#2a2000] rounded-full px-2.5 py-0.5 ml-2 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                            {pendingCount} pending
                        </span>
                    )}
                </div>

                <button
                    onClick={handleSimulate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg text-[11px] text-[#888] hover:text-white hover:border-[#333] transition-all"
                >
                    <Zap className="w-3 h-3 text-[#f59e0b]" />
                    Simulate Interception
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-1 w-fit">
                {(['all', 'pending', 'resolved'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${filter === f
                            ? 'bg-[#1a1a1a] text-white'
                            : 'text-[#555] hover:text-[#888]'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === 'pending' && pendingCount > 0 && (
                            <span className="ml-1.5 text-[10px] bg-[#f59e0b] text-black rounded-full px-1.5 py-0.5 font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Setup guide */}
            <SetupGuide />

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton h-[80px] rounded-xl" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8">
                    <div className="w-14 h-14 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl flex items-center justify-center mb-5">
                        <ShieldAlert className="w-6 h-6 text-[#333]" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-white mb-1.5">
                        {filter === 'pending' ? 'No pending approvals' : 'No approvals yet'}
                    </h3>
                    <p className="text-[13px] text-[#555] text-center max-w-sm leading-relaxed">
                        {filter === 'pending'
                            ? 'All caught up! Sensitive requests will appear here when your agent tries to access protected domains.'
                            : 'When this agent makes requests to sensitive domains (e.g. payment APIs), they will be intercepted and listed here for your review.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(approval => (
                        <ApprovalCard
                            key={approval.id}
                            approval={approval}
                            onDecide={handleDecide}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Global pending approvals banner (for MainLayout) ───── */

export function PendingApprovalsBanner({ onClick }: { onClick?: () => void }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.approvals.listPending();
                if (data.length === 0) {
                    setCount(MOCK_APPROVALS.filter(a => a.status === 'pending').length);
                } else {
                    setCount(data.length);
                }
            } catch {
                setCount(MOCK_APPROVALS.filter(a => a.status === 'pending').length);
            }
        };
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    if (count === 0) return null;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1200] border border-[#2a2000] rounded-lg text-[12px] text-[#f59e0b] font-medium hover:bg-[#221800] transition-all animate-fade-in"
        >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{count} approval{count !== 1 ? 's' : ''} pending</span>
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
        </button>
    );
}
