import React from 'react';
import { Map } from 'lucide-react';
import AuthGuard from '@/components/common/AuthGuard';
import PageHeader from '@/components/common/PageHeader';

export default function UniverseMap() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <PageHeader 
            title="Universe Map" 
            description="Tactical overview"
          />

          <div className="bg-zinc-900/50 border-2 border-zinc-800 p-12 h-[600px] flex items-center justify-center">
            <div className="text-center">
              <Map className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Tactical Map System</h3>
              <p className="text-zinc-400">Interactive map visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}