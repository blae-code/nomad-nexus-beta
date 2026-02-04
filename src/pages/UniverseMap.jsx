import React from 'react';
import { Map } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import TacticalMap from '@/components/tactical/TacticalMap';

export default function UniverseMap() {
  const activeOp = useActiveOp();
  const { user } = useAuth();
  const member = user?.member_profile_data || user;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Universe Map</h1>
        <p className="text-zinc-400 text-sm">Tactical overview</p>
      </div>

      {!member ? (
        <div className="bg-zinc-900/50 border-2 border-zinc-800 p-12 h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Map className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Tactical Map System</h3>
            <p className="text-zinc-400">Authenticate to access tactical overlays.</p>
          </div>
        </div>
      ) : (
        <TacticalMap eventId={activeOp?.activeEventId || null} activeEvent={activeOp?.activeEvent || null} />
      )}
    </div>
  );
}
