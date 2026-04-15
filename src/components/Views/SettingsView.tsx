import { useState } from 'react';
import { Github, Database, Loader2, CheckCircle2, Settings2 } from 'lucide-react';
import { api } from '../../services/api';

export function SettingsView() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnectGitHub = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await api.github.getOAuthUrl();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to get OAuth URL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to GitHub');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#666666] mt-0.5">Configure your platform and integrations</p>
      </div>

      {error && (
        <div className="mb-5 bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px] flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* API Configuration */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111111] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-[#888888]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white">API Configuration</h2>
              <p className="text-[12px] text-[#555555]">Configure the backend API endpoint</p>
            </div>
          </div>
          <div className="p-5">
            <div>
              <label htmlFor="apiUrl" className="block text-[13px] font-medium text-[#888888] mb-1.5">
                API Base URL
              </label>
              <input
                id="apiUrl"
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="input-base font-mono text-[13px]"
                placeholder="http://localhost:3000/api/v1"
              />
              <p className="text-[12px] text-[#444444] mt-1.5">
                Base URL for all backend API requests
              </p>
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111111] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
              <Github className="w-3.5 h-3.5 text-[#888888]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white">GitHub Integration</h2>
              <p className="text-[12px] text-[#555555]">Connect your GitHub account for CI/CD pipelines</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-[#666666] mb-4 leading-relaxed">
              GitHub integration allows you to connect repositories to your agents and trigger
              automated builds via webhooks.
            </p>
            <button
              onClick={handleConnectGitHub}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 text-[13px] py-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {loading ? 'Connecting...' : 'Connect GitHub Account'}
            </button>
          </div>
        </div>

        {/* Platform Information */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111111] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111111] border border-[#1f1f1f] rounded-lg flex items-center justify-center">
              <Settings2 className="w-3.5 h-3.5 text-[#888888]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white">Platform Information</h2>
              <p className="text-[12px] text-[#555555]">System details and current status</p>
            </div>
          </div>
          <div className="divide-y divide-[#111111]">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-[#666666]">Version</span>
              <span className="text-[13px] text-white font-mono bg-[#111111] border border-[#1f1f1f] px-2 py-0.5 rounded">v1.0.0</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-[#666666]">Environment</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-dot-success" />
                <span className="text-[13px] text-white">Production</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-[#666666]">API Status</span>
              <div className="flex items-center gap-1.5 text-[#22c55e]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[13px]">Synced</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-[#666666]">Platform</span>
              <span className="text-[13px] text-white">Oracle Kubernetes Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
