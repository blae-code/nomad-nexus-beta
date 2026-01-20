import React from 'react';
import VoiceControlToolkit from '@/components/voice/VoiceControlToolkit';
import UserContactBook from '@/components/directory/UserContactBook';

export default function ContextPanel({ currentPage, user }) {
  const renderContent = () => {
    switch (currentPage) {
      case 'hub':
        return (
          <div className="space-y-4">
            <VoiceControlToolkit />
            <div className="pt-4 border-t border-zinc-800">
              <UserContactBook />
            </div>
          </div>
        );
      case 'mission':
        return (
          <div className="space-y-4">
            <div className="text-xs uppercase font-bold text-zinc-500">Quick Stats</div>
            <div className="text-[10px] text-zinc-500 font-mono space-y-1">
              <div>Active Events: —</div>
              <div>Squad Members: —</div>
              <div>Alert Level: NOMINAL</div>
            </div>
          </div>
        );
      case 'events':
        return (
          <div className="space-y-4">
            <div className="text-xs uppercase font-bold text-zinc-500">Upcoming</div>
            <div className="text-[10px] text-zinc-500 font-mono">No events scheduled</div>
          </div>
        );
      case 'comms':
        return (
          <div className="space-y-4">
            <div className="text-xs uppercase font-bold text-zinc-500">Network Status</div>
            <div className="text-[10px] text-zinc-500 font-mono space-y-1">
              <div>Connected Nets: —</div>
              <div>Signal: OPTIMAL</div>
              <div>Latency: —ms</div>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div className="space-y-4">
            <div className="text-xs uppercase font-bold text-zinc-500">System</div>
            <div className="text-[10px] text-zinc-500 font-mono space-y-1">
              <div>Users Online: —</div>
              <div>Database: HEALTHY</div>
              <div>API: RESPONSIVE</div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-xs text-zinc-500">
            <p>No context available</p>
          </div>
        );
    }
  };

  return (
    <div className="w-64 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0 p-3">
      <div className="space-y-4 text-xs">
        {renderContent()}
      </div>
    </div>
  );
}