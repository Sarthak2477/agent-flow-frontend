import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Terminal, Copy, Check } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';
import { TracesDrawer } from '../Observability/TracesDrawer';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-[#444444] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all border border-[#1f1f1f]"
    >
      {copied ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function ObservabilityView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'python' | 'typescript'>('python');

  useEffect(() => {
    loadDeployedAgents();
  }, []);

  const loadDeployedAgents = async () => {
    try {
      const data = await api.agents.list();
      console.log(data)
      setAgents(data.filter((a: Agent) => a.status === 'running') || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const pythonInstall = 'uv add arize-phoenix-otel';
  const typescriptInstall = 'npm install @arizeai/phoenix-otel @arizeai/openinference-core';
  const envVar = `PHOENIX_COLLECTOR_ENDPOINT='http://140.245.17.141'`;

  const pythonCode = `from phoenix.otel import register

tracer_provider = register(
    project_name="default",
)

tracer = tracer_provider.get_tracer(__name__)

@tracer.chain
def my_function(input: str) -> str:
    # Your logic here
    return f"Processed: {input}"

my_function("hello world")`;

  const typescriptCode = `import { register } from "@arizeai/phoenix-otel";
import { traceChain } from "@arizeai/openinference-core";

const provider = register({
  projectName: "default",
});

const myFunction = traceChain(
  (input: string): string => {
    // Your logic here
    return \`Processed: \${input}\`;
  },
  { name: "my-function" }
);

myFunction("hello world");

// Flush pending traces before the process exits
await provider.forceFlush();`;

  const verifyCode = `curl -X POST http://<agent-host>.nip.io/query \\
  -H "Content-Type: application/json" \\
  -d '{"input": "hello world"}'`;

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-white tracking-tight">Observability</h1>
        <p className="text-[13px] text-[#666666] mt-0.5">Monitor agent execution traces with Arize Phoenix</p>
      </div>

      {/* Deployed agents */}
      {loading ? (
        <div className="space-y-2 mb-10">
          {[1, 2].map(i => (
            <div key={i} className="skeleton h-[72px] rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-dashed border-[#1f1f1f] rounded-xl flex flex-col items-center justify-center py-12 px-8 mb-10">
          <div className="w-12 h-12 bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl flex items-center justify-center mb-4">
            <Activity className="w-5 h-5 text-[#444444]" />
          </div>
          <h3 className="text-[15px] font-medium text-white mb-1.5">No running agents</h3>
          <p className="text-[13px] text-[#555555] text-center">Deploy an agent first to view its traces</p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden mb-10">
          {agents.map((agent, index) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full group flex items-center gap-4 px-5 py-4 hover:bg-[#0f0f0f] transition-colors text-left ${index !== agents.length - 1 ? 'border-b border-[#111111]' : ''
                }`}
            >
              <div className="w-2 h-2 rounded-full bg-[#22c55e] status-dot-success flex-shrink-0" />
              <div className="w-9 h-9 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-[#888888]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-white mb-0.5">{agent.name}</h3>
                <p className="text-[12px] text-[#444444] font-mono">{agent.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#555555] group-hover:text-[#888888] transition-colors">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>View Traces</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tracing Guide */}
      <div className="border border-[#1f1f1f] rounded-xl overflow-hidden">
        {/* Guide header */}
        <div className="px-5 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-[#888888]" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-white">Tracing Configuration</h2>
            <p className="text-[12px] text-[#555555]">Integrate Arize Phoenix into your agent code</p>
          </div>
        </div>

        {/* Language tabs */}
        <div className="flex border-b border-[#1f1f1f] bg-[#050505]">
          {['python', 'typescript'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-colors border-b-2 ${activeTab === tab
                ? 'border-white text-white'
                : 'border-transparent text-[#555555] hover:text-[#888888]'
                }`}
            >
              <img
                src={`https://cdn.simpleicons.org/${tab}/white`}
                className="w-3.5 h-3.5 opacity-70"
                alt=""
              />
              {tab === 'python' ? 'Python' : 'TypeScript'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 bg-[#060606]">
          {/* 1. Install */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555]">
                1 — Install Dependencies
              </h4>
            </div>
            <div className="relative group/block">
              <pre className="code-block text-[#60a5fa] text-[13px] pr-10">
                {activeTab === 'python' ? pythonInstall : typescriptInstall}
              </pre>
              <div className="absolute right-3 top-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <CopyButton text={activeTab === 'python' ? pythonInstall : typescriptInstall} />
              </div>
            </div>
          </div>

          {/* 2. Env Vars */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555] mb-3">
              2 — Environment Variables
            </h4>
            <div className="relative group/block">
              <pre className="code-block text-[#22c55e] text-[13px] pr-10">
                {envVar}
              </pre>
              <div className="absolute right-3 top-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <CopyButton text={envVar} />
              </div>
            </div>
          </div>

          {/* 3. Implementation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555]">
                3 — Implementation
              </h4>
            </div>
            <div className="relative group/block">
              <pre className="code-block text-[13px] leading-[1.7] pr-10 overflow-x-auto">
                <code className="text-[#d4d4d4] whitespace-pre">
                  {activeTab === 'python' ? pythonCode : typescriptCode}
                </code>
              </pre>
              <div className="absolute right-3 top-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <CopyButton text={activeTab === 'python' ? pythonCode : typescriptCode} />
              </div>
            </div>
          </div>

          {/* 4. Verify */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555] mb-3">
              4 — Verify &amp; Test
            </h4>
            <div className="relative group/block">
              <pre className="code-block text-[#f59e0b] text-[13px] leading-relaxed pr-10">
                {verifyCode}
              </pre>
              <div className="absolute right-3 top-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <CopyButton text={verifyCode} />
              </div>
            </div>
            <p className="mt-2.5 text-[12px] text-[#444444]">
              Wait a few seconds after the request, then check the agent list above for new traces.
            </p>
          </div>
        </div>
      </div>

      {selectedAgent && (
        <TracesDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
