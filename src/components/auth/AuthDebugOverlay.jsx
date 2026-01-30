import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AuthDebugOverlay() {
  const [isEnabled, setIsEnabled] = useState(false);
  const { user, loading, initialized, disclaimersCompleted, onboardingCompleted, error } = useAuth();
  const [currentPage, setCurrentPage] = useState('');

  useEffect(() => {
    // Check if debug_auth=true in URL
    const params = new URLSearchParams(window.location.search);
    setIsEnabled(params.get('debug_auth') === 'true');

    // Track current page from URL or pathname
    const path = window.location.pathname;
    const pageName = path.split('/').pop() || 'index';
    setCurrentPage(pageName);
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-[9999] bg-black/90 border-2 border-cyan-500 rounded p-3 font-mono text-xs text-cyan-300 space-y-1 max-w-xs">
      <div className="font-bold text-cyan-400 mb-2">🔍 AUTH DEBUG</div>
      
      <div className="space-y-0.5">
        <div><span className="text-zinc-500">initialized:</span> <span className={initialized ? 'text-green-400' : 'text-red-400'}>{String(initialized)}</span></div>
        <div><span className="text-zinc-500">loading:</span> <span className={loading ? 'text-yellow-400' : 'text-green-400'}>{String(loading)}</span></div>
        
        {error && (
          <div className="mt-1 p-1.5 bg-red-950/50 border border-red-500/50 rounded text-red-300">
            <div className="font-bold">Error:</div>
            <div className="text-[10px] break-words">{error.message}</div>
          </div>
        )}

        {user ? (
          <div className="space-y-0.5 mt-1 pt-1 border-t border-cyan-500/30">
            <div><span className="text-zinc-500">user.id:</span> <span className="text-blue-300">{user.id}</span></div>
            <div><span className="text-zinc-500">user.role:</span> <span className="text-orange-300">{user.role}</span></div>
            <div><span className="text-zinc-500">user.email:</span> <span className="text-blue-300 text-[10px] break-all">{user.email}</span></div>
          </div>
        ) : (
          <div className="mt-1 pt-1 border-t border-cyan-500/30 text-zinc-400">user: null</div>
        )}

        <div className="space-y-0.5 mt-1 pt-1 border-t border-cyan-500/30">
          <div><span className="text-zinc-500">disclaimersCompleted:</span> <span className={disclaimersCompleted ? 'text-green-400' : 'text-red-400'}>{String(disclaimersCompleted)}</span></div>
          <div><span className="text-zinc-500">onboardingCompleted:</span> <span className={onboardingCompleted ? 'text-green-400' : 'text-red-400'}>{String(onboardingCompleted)}</span></div>
        </div>

        <div className="mt-1 pt-1 border-t border-cyan-500/30">
          <div><span className="text-zinc-500">page:</span> <span className="text-purple-300">{currentPage}</span></div>
        </div>
      </div>
    </div>
  );
}