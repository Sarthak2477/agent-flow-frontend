import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Activity, AlertCircle, Cpu, Hammer, MessageSquare, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Agent } from '../../types/database';
import { api } from '../../services/api';

// ─── API shapes ───────────────────────────────────────────────────────────────

/** Stub shape returned inside each trace's `spans[]` array */
interface TraceSpanStub {
  id: string;
  span_id: string;
  parent_id: string | null;
  name: string;
  span_kind: string;
  status_code: string;
  start_time: string;
  end_time: string;
}

/** Full shape returned by the /spans endpoint — superset of the stub */
interface FullSpan extends TraceSpanStub {
  attributes?: Record<string, any>;
  events?: any[];
  links?: any[];
  context?: Record<string, any>;
}

interface ApiTrace {
  id: string;
  trace_id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  spans: TraceSpanStub[];
}

// ─── Tree node (stub + optional enriched detail) ──────────────────────────────

interface SpanNode extends TraceSpanStub {
  depth: number;
  _children: SpanNode[];
  // Merged in from /spans after click
  attributes?: Record<string, any>;
  events?: any[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const elapsed = (start: string, end: string) =>
  new Date(end).getTime() - new Date(start).getTime();

/**
 * Returns every possible identifier string for a span so we can
 * cross-match between the two endpoints without assuming field names.
 */
function spanIds(s: TraceSpanStub | FullSpan | SpanNode): string[] {
  return [s.span_id, s.id].filter(Boolean) as string[];
}

function resolveParentId(s: TraceSpanStub): string | null {
  const raw = s.parent_id ?? (s as any).context?.parent_id ?? null;
  if (!raw || /^0+$/.test(raw)) return null;
  return raw;
}

/**
 * Build a depth-annotated flat list from the stub spans embedded in a trace.
 * Uses parent_id for hierarchy — this is the ONLY place hierarchy is built.
 */
function buildTree(stubs: TraceSpanStub[]): SpanNode[] {
  const sorted = [...stubs].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Index by every possible id field
  const map = new Map<string, SpanNode>();
  sorted.forEach(s => {
    const node: SpanNode = { ...s, depth: 0, _children: [] };
    spanIds(s).forEach(id => map.set(id, node));
  });

  const roots: SpanNode[] = [];
  const seen = new Set<SpanNode>();

  sorted.forEach(s => {
    const node = map.get(s.span_id) ?? map.get(s.id);
    if (!node || seen.has(node)) return;
    seen.add(node);

    const parentId = resolveParentId(s);
    const parent = parentId ? map.get(parentId) : null;

    if (parent && parent !== node) {
      parent._children.push(node);
    } else {
      roots.push(node);
    }
  });

  const flat: SpanNode[] = [];
  const traverse = (node: SpanNode, depth: number) => {
    flat.push({ ...node, depth });
    node._children
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .forEach(c => traverse(c, depth + 1));
  };
  roots.forEach(r => traverse(r, 0));
  return flat;
}

/**
 * Given the full /spans response and a clicked node, find the best match.
 * Tries span_id, then id, then falls back to name+time proximity.
 */
function findMatchingFullSpan(allSpans: FullSpan[], node: SpanNode): FullSpan | null {
  const nodeIds = new Set(spanIds(node));

  // Exact id match
  const exact = allSpans.find(s => spanIds(s).some(id => nodeIds.has(id)));
  if (exact) return exact;

  // Fuzzy: same name + start_time within 10ms
  const nodeTime = new Date(node.start_time).getTime();
  const fuzzy = allSpans.find(s =>
    s.name === node.name &&
    Math.abs(new Date(s.start_time).getTime() - nodeTime) < 10
  );
  if (fuzzy) return fuzzy;

  console.warn('[TracesDrawer] No match for span', node.name, node.span_id,
    '\nAvailable span_ids:', allSpans.map(s => s.span_id));
  return null;
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

function getStyle(kind: string, name: string) {
  const n = (name || '').toLowerCase();
  if (kind === 'LLM' || n.includes('chat') || n.includes('model') || n.includes('llm'))
    return { bg: 'bg-[#0f1f0f]', border: 'border-[#1a3a1a]', text: 'text-[#22c55e]', icon: MessageSquare };
  if (kind === 'TOOL' || n.includes('tool') || n.includes('func'))
    return { bg: 'bg-[#130f1f]', border: 'border-[#2a1a3a]', text: 'text-[#a78bfa]', icon: Hammer };
  return { bg: 'bg-[#0f151f]', border: 'border-[#1a2a3a]', text: 'text-[#60a5fa]', icon: Cpu };
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  node,
  richSpan,
  loading,
}: {
  node: SpanNode | null;
  richSpan: FullSpan | null;
  loading: boolean;
}) {
  if (!node && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
        <div className="w-12 h-12 bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#333333]" />
        </div>
        <p className="text-[12px] text-[#444444]">Select a span to inspect</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-5 h-5 text-[#888888] animate-spin" />
        <p className="text-[12px] text-[#444444]">Loading detail…</p>
      </div>
    );
  }

  // Merge: richSpan has attributes, node has hierarchy context
  const span = richSpan ?? node!;
  const attrs = (richSpan ?? (node as any))?.attributes ?? {};
  const style = getStyle(span.span_kind, span.name);

  const parsePayload = (v: any) => {
    if (!v) return null;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
    return v;
  };

  // Try all common attribute key variants for input/output
  const rawInput = attrs['input.value'] ?? attrs['input'] ?? attrs['llm.input'] ?? null;
  const rawOutput = attrs['output.value'] ?? attrs['output'] ?? attrs['llm.output'] ?? null;
  const inputData = parsePayload(rawInput);
  const outputData = parsePayload(rawOutput);

  const metaEntries = Object.entries(attrs).filter(([k]) =>
    !k.includes('input') && !k.includes('output')
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b border-[#111111] flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg flex-shrink-0 ${style.bg} ${style.text} border ${style.border}`}>
            <style.icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-white truncate">{span.name}</h3>
            <p className="text-[11px] text-[#555555] font-mono mt-0.5">{span.span_kind} · {span.status_code || 'OK'}</p>
          </div>
          {span.status_code === 'ERROR' && (
            <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 ml-auto" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Duration" value={`${elapsed(span.start_time, span.end_time)}ms`} color="text-white" />
          <Stat label="Start" value={new Date(span.start_time).toLocaleTimeString()} color="text-[#888888]" />
          <Stat label="Span ID" value={span.span_id?.slice(0, 16) + '…'} color="text-[#555555]" />
          {node?.parent_id && (
            <Stat label="Parent ID" value={node.parent_id.slice(0, 16) + '…'} color="text-[#555555]" />
          )}
        </div>

        {!richSpan && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#f59e0b] bg-[#1a1200] border border-[#2a2000] rounded-md px-3 py-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Showing stub data — full detail not found
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-5">
        {inputData ? (
          <Payload title="Input" dot="bg-sky-500" data={inputData} color="text-sky-300" />
        ) : richSpan && !inputData ? (
          <EmptySection label="No input data" />
        ) : null}

        {outputData ? (
          <Payload title="Output" dot="bg-emerald-500" data={outputData} color="text-emerald-300" />
        ) : richSpan && !outputData ? (
          <EmptySection label="No output data" />
        ) : null}

        {metaEntries.length > 0 && (
          <div className="space-y-2">
            <SectionLabel text="Attributes" />
            <div className="flex flex-wrap gap-1.5">
              {metaEntries.map(([key, val]) => (
                <div key={key} className="bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.07] flex flex-col gap-0.5">
                  <span className="text-[8px] text-gray-600 uppercase font-bold tracking-tighter">{key}</span>
                  <span className="text-[10px] text-gray-300 font-mono truncate max-w-[200px]">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw dump when nothing structured was parsed — always useful for debugging */}
        {richSpan && !inputData && !outputData && metaEntries.length === 0 && (
          <div className="space-y-2">
            <SectionLabel text="Raw Span" />
            <div className="bg-black/40 rounded-xl border border-white/[0.06] p-4 overflow-auto max-h-80 custom-scrollbar">
              <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap">
                {JSON.stringify(richSpan, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0a0a0a] rounded-lg p-2.5 border border-[#1f1f1f]">
      <div className="text-[10px] text-[#444444] uppercase font-medium tracking-wider mb-1">{label}</div>
      <div className={`text-[11px] font-mono truncate ${color}`}>{value}</div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <h4 className="text-[11px] font-semibold text-[#555555] uppercase tracking-wider">{text}</h4>;
}

function EmptySection({ label }: { label: string }) {
  return <p className="text-[12px] text-[#333333] italic">{label}</p>;
}

function Payload({ title, dot, data, color }: { title: string; dot: string; data: any; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <SectionLabel text={title} />
      </div>
      <div className="bg-[#050505] rounded-lg border border-[#1f1f1f] p-4 max-h-72 overflow-auto scrollbar-hide">
        {data?.messages && Array.isArray(data.messages) ? (
          <div className="space-y-3">
            {data.messages.map((msg: any, i: number) => (
              <div key={i} className="space-y-1">
                <span className="text-[10px] font-medium text-[#555555] uppercase">{msg.role || msg.type || 'message'}</span>
                <p className="text-[12px] text-[#cccccc] leading-relaxed bg-[#0a0a0a] p-3 rounded-md border border-[#1a1a1a] whitespace-pre-wrap font-mono">
                  {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
                </p>
              </div>
            ))}
          </div>
        ) : typeof data === 'string' ? (
          <p className="text-[12px] text-[#cccccc] leading-relaxed whitespace-pre-wrap font-mono">{data}</p>
        ) : (
          <pre className={`text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${color}`}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function TracesDrawer({ agent, onClose }: any) {
  const [traces, setTraces] = useState<ApiTrace[]>([]);
  const [tracesLoading, setTL] = useState(true);
  const [tracesError, setTE] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const autoExpandedRef = useRef(false);

  const [selectedNode, setSelectedNode] = useState<SpanNode | null>(null);
  const [richSpan, setRichSpan] = useState<FullSpan | null>(null);
  const [detailLoading, setDL] = useState(false);

  // Cache full /spans response to avoid refetching on every click
  const spansCache = useRef<FullSpan[] | null>(null);

  // ── Load traces (used for hierarchy via spans[].parent_id) ────────────────
  const loadTraces = useCallback(async () => {
    try {
      const resp = await api.observability.getTraces(agent.id);
      const data: ApiTrace[] = Array.isArray(resp) ? resp : (resp.data ?? []);

      const sorted = [...data].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      setTraces(sorted);
      setTE('');

      if (!autoExpandedRef.current && sorted.length > 0) {
        setExpandedId(sorted[0].trace_id ?? sorted[0].id);
        autoExpandedRef.current = true;
      }
    } catch (err: any) {
      setTE(err.message || 'Failed to load traces');
    } finally {
      setTL(false);
    }
  }, [agent.id]);

  // ── Load detail for a clicked span from /spans ────────────────────────────
  const loadDetail = useCallback(async (node: SpanNode) => {
    setSelectedNode(node);
    setRichSpan(null);
    setDL(true);

    try {
      // Use cached spans if available; otherwise fetch and cache
      if (!spansCache.current) {
        const resp = await api.observability.getSpans(agent.id);
        const all: FullSpan[] = Array.isArray(resp) ? resp : (resp.data ?? []);
        spansCache.current = all;
        console.log('[TracesDrawer] /spans loaded:', all.length, 'spans');
        console.log('[TracesDrawer] sample span keys:', all[0] ? Object.keys(all[0]) : 'empty');
        console.log('[TracesDrawer] sample span:', JSON.stringify(all[0], null, 2));
      }

      const match = findMatchingFullSpan(spansCache.current, node);
      setRichSpan(match);
    } catch (err) {
      console.error('[TracesDrawer] Failed to load span detail:', err);
      setRichSpan(null);
    } finally {
      setDL(false);
    }
  }, [agent.id]);

  useEffect(() => {
    loadTraces();
    const id = setInterval(loadTraces, 5000);
    return () => clearInterval(id);
  }, [loadTraces]);

  // Invalidate spans cache on refresh so new data is picked up
  const forceRefresh = () => {
    spansCache.current = null;
    loadTraces();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl h-full bg-[#000000] border border-[#1f1f1f] rounded-xl flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#888888]" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-white">Traces</h2>
              <p className="text-[11px] text-[#444444] font-mono">{agent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={forceRefresh}
              className="flex items-center gap-1.5 text-[12px] text-[#555555] hover:text-white transition-colors px-3 py-1.5 rounded-md border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#111111]"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <button onClick={onClose} className="p-1.5 text-[#555555] hover:text-white hover:bg-[#111111] rounded-md transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Trace + Span tree */}
          <div className="w-[42%] border-r border-[#111111] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#111111] flex-shrink-0 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#555555]">
                {traces.length} Trace{traces.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full status-dot-success" />
                <span className="text-[11px] text-[#444444]">Live</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-hide p-3 space-y-1.5">
              {tracesLoading && traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                  <Loader2 className="w-5 h-5 text-[#888888] animate-spin" />
                  <p className="text-[12px] text-[#444444]">Fetching traces…</p>
                </div>
              ) : tracesError ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
                  <AlertCircle className="w-8 h-8 text-[#444444]" />
                  <p className="text-[12px] text-[#555555]">{tracesError}</p>
                </div>
              ) : traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <p className="text-[12px] text-[#444444]">No traces recorded yet</p>
                </div>
              ) : (
                traces.map(trace => {
                  const key = trace.trace_id ?? trace.id;
                  const isExpanded = expandedId === key;
                  const flat = isExpanded ? buildTree(trace.spans ?? []) : [];

                  return (
                    <div key={key} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg overflow-hidden">
                      {/* Trace header row */}
                      <button
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#0f0f0f] transition-colors text-left"
                        onClick={() => setExpandedId(isExpanded ? null : key)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90 text-white' : 'text-[#444444]'}`} />
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#cccccc] font-mono truncate">{key.slice(0, 14)}…</p>
                            <p className="text-[11px] text-[#444444] font-mono mt-0.5">
                              {new Date(trace.start_time).toLocaleTimeString()} · {elapsed(trace.start_time, trace.end_time)}ms
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] bg-[#111111] text-[#555555] px-2 py-0.5 rounded border border-[#1f1f1f] flex-shrink-0">
                          {(trace.spans ?? []).length} spans
                        </span>
                      </button>

                      {/* Span tree */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-1 border-t border-[#111111] pt-2">
                          {flat.length === 0 ? (
                            <p className="text-[12px] text-[#444444] text-center py-3">No spans</p>
                          ) : flat.map((node, idx) => {
                            const style = getStyle(node.span_kind, node.name);
                            const isSelected = selectedNode &&
                              (selectedNode.span_id === node.span_id || selectedNode.id === node.id);
                            const indent = node.depth * 14;

                            return (
                              <div
                                key={(node.span_id || node.id) + idx}
                                className="relative"
                                style={{ paddingLeft: `${indent + 6}px` }}
                              >
                                {node.depth > 0 && (
                                  <>
                                    <div
                                      className="absolute w-px bg-[#1f1f1f] top-0 bottom-0"
                                      style={{ left: `${indent - 2}px` }}
                                    />
                                    <div
                                      className="absolute h-px bg-[#2a2a2a] w-3"
                                      style={{ left: `${indent - 2}px`, top: '50%' }}
                                    />
                                  </>
                                )}
                                <button
                                  onClick={() => loadDetail(node)}
                                  className={`w-full text-left mt-0.5 px-3 py-2 rounded-md border flex items-center gap-2.5 transition-all ${isSelected
                                    ? `${style.bg} ${style.border}`
                                    : 'bg-transparent border-transparent hover:bg-[#0f0f0f] hover:border-[#1f1f1f]'
                                    }`}
                                >
                                  <div className={`p-1 rounded flex-shrink-0 ${style.bg} ${style.text}`}>
                                    <style.icon className="w-3 h-3" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-medium text-[#cccccc] truncate">{node.name}</p>
                                    <p className="text-[11px] text-[#444444] font-mono">{elapsed(node.start_time, node.end_time)}ms</p>
                                  </div>
                                  {node.status_code === 'ERROR' && (
                                    <AlertCircle className="w-3 h-3 text-[#ef4444] flex-shrink-0" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="flex-1 overflow-hidden bg-[#030303]">
            <DetailPanel node={selectedNode} richSpan={richSpan} loading={detailLoading} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#111111] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full status-dot-success" />
            <span className="text-[11px] text-[#444444]">Polling every 5s</span>
          </div>
          <span className="text-[11px] text-[#333333] font-mono">
            {traces.length} traces · {traces.reduce((n, t) => n + (t.spans?.length ?? 0), 0)} spans
          </span>
        </div>
      </div>
    </div>
  );
}