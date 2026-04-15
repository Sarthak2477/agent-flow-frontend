import { useState } from 'react';
import { X, Code, Settings } from 'lucide-react';
import { api } from '../../services/api';
import { Agent } from '../../types/database';

interface EditAgentModalProps {
  agent: Agent;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAgentModal({ agent, onClose, onUpdated }: EditAgentModalProps) {
  const [name, setName] = useState(agent.name);
  const [config, setConfig] = useState(JSON.stringify(agent.config || {}, null, 2));
  const [executionMode, setExecutionMode] = useState(agent.config?.executionMode || 'service');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let parsedConfig = agent.config;
      try {
        parsedConfig = JSON.parse(config);
      } catch {
        throw new Error('Invalid JSON configuration');
      }

      parsedConfig = { ...parsedConfig, executionMode };

      await api.agents.update(agent.id, {
        name,
        config: parsedConfig,
      });

      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#111111] flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Edit Agent</h2>
            <p className="text-[12px] text-[#555555] mt-0.5 font-mono">{agent.id.slice(0, 12)}...</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Agent Name */}
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-[#888888] mb-1.5">
              Agent Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-base"
            />
          </div>

          {/* Execution Mode */}
          <div>
            <label htmlFor="mode" className="block text-[13px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Execution Mode
            </label>
            <select
              id="mode"
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value)}
              className="input-base text-[13px] py-2"
            >
              <option value="service">Service (Always On)</option>
              <option value="job">Job (Run Once)</option>
              <option value="cron">Cron (Scheduled)</option>
            </select>
          </div>

          {/* Config */}
          <div>
            <label htmlFor="config" className="block text-[13px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" />
              Configuration (JSON)
            </label>
            <textarea
              id="config"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={12}
              className="input-base font-mono text-[13px] leading-relaxed resize-none"
              placeholder='{"apiKey": "your-key-here"}'
            />
            <p className="text-[12px] text-[#444444] mt-1.5">
              Add API keys, model configs, and other agent settings here
            </p>
          </div>

          {error && (
            <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 text-[13px] py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 text-[13px] py-2.5 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
