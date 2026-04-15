import { useState } from 'react';
import { X, Bot, Github, ArrowRight, Check, Settings } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateAgentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAgentModal({ onClose, onCreated }: CreateAgentModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [executionMode, setExecutionMode] = useState('service');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      await api.agents.create(name, { executionMode });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Agent Setup', icon: Bot },
    { id: 2, name: 'Source Control', icon: Github },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#111111] flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Create Agent</h2>
            <p className="text-[12px] text-[#555555] mt-0.5">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#555555] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-5 py-3 bg-[#050505] border-b border-[#111111]">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;

              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all text-[11px] font-semibold ${isActive
                        ? 'bg-white border-white text-black'
                        : isCompleted
                          ? 'bg-[#22c55e] border-[#22c55e] text-white'
                          : 'bg-transparent border-[#2a2a2a] text-[#555555]'
                        }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : <span>{s.id}</span>}
                    </div>
                    <span className={`text-[12px] font-medium ${isActive ? 'text-white' : isCompleted ? 'text-[#22c55e]' : 'text-[#444444]'
                      }`}>
                      {s.name}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-px bg-[#1f1f1f] mx-2 min-w-[24px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-[13px] font-medium text-[#888888] mb-1.5">
                  Agent Identifier
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="input-base"
                  placeholder="e.g. sales-assistant"
                />
                <p className="text-[12px] text-[#444444] mt-1.5">
                  Use lowercase and hyphens for best compatibility.
                </p>
              </div>

              <div>
                <label htmlFor="mode" className="block text-[13px] font-medium text-[#888888] mb-1.5 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Execution Mode
                </label>
                <select
                  id="mode"
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value)}
                  className="input-base text-[13px] py-2.5"
                >
                  <option value="service">Service (Always On)</option>
                  <option value="job">Job (Run Once)</option>
                  <option value="cron">Cron (Scheduled)</option>
                </select>
                <p className="text-[12px] text-[#444444] mt-1.5">
                  Determine how your agent deployed (continously running vs specific runs).
                </p>
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-[13px]"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-12 h-12 bg-[#111111] border border-[#1f1f1f] rounded-xl flex items-center justify-center mb-4">
                  <Github className="w-5 h-5 text-[#888888]" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">Link a Repository</h3>
                <p className="text-[13px] text-[#555555] leading-relaxed max-w-xs">
                  After creation, you'll select a GitHub repository to automatically inject the CI/CD pipeline.
                </p>
              </div>

              {error && (
                <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px]">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 text-[13px] py-2.5"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit as any}
                  disabled={loading}
                  className="btn-primary flex-1 text-[13px] py-2.5 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
