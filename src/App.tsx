import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/Auth/AuthPage';
import { MainLayout } from './components/Layout/MainLayout';
import { LandingPage } from './components/Landing/LandingPage';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#1f1f1f] border-t-white rounded-full animate-spin" />
          <p className="text-[13px] text-[#444444]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <MainLayout />;
  }

  if (showAuth) {
    return <AuthPage />;
  }

  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}

export default App;
