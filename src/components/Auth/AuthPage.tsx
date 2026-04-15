import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Rocket } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="w-full max-w-sm relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl mb-5">
            <Rocket className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight mb-1.5">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-[14px] text-[#666666]">
            {isLogin ? 'Log in to your Agentic Cloud account' : 'Start deploying AI agents today'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          {/* Tab toggle */}
          <div className="flex bg-[#111111] rounded-lg p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 px-3 rounded-md text-[13px] font-medium transition-all ${isLogin
                ? 'bg-[#1f1f1f] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#999999]'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 px-3 rounded-md text-[13px] font-medium transition-all ${!isLogin
                ? 'bg-[#1f1f1f] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#999999]'
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-[#888888] mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-[#888888] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#1a0a0a] border border-[#3a1515] rounded-lg p-3 text-[#f87171] text-[13px] flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00000030] border-t-[#000000] rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? 'Continue' : 'Create Account'}</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-[#444444] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
