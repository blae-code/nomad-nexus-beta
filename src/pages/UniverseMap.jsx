import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Map, MapPin } from 'lucide-react';

export default function UniverseMap() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }
        setLoading(false);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <a href={createPageUrl('Hub')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </a>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">Universe Map</h1>
            <p className="text-zinc-400 text-sm">Tactical overview</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border-2 border-zinc-800 p-12 h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Map className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Tactical Map System</h3>
            <p className="text-zinc-400">Interactive map visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}