import React, { useState } from 'react';
import { Shield, Terminal, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/components/hooks/useAppData';
import QuickActions from '@/components/command/QuickActions';
import CommsIntegration from '@/components/command/CommsIntegration';
import OperationPlaybook from '@/components/command/OperationPlaybook';

export default function CommandCenter() {
  const user = useCurrentUser();
  const [actionLog, setActionLog] = useState([]);

  const handleActionComplete = (actionId, status) => {
    const timestamp = new Date().toISOString();
    setActionLog(prev => [
      { actionId, status, timestamp, user: user?.full_name },
      ...prev.slice(0, 9)
    ]);
  };

  return (
    <div className="h-full bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden p-2 space-y-2">
      {/* Header */}
      <div className="border border-zinc-800 bg-gradient-to-r from-zinc-950 via-[#ea580c]/10 to-zinc-950 p-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#ea580c]" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider">COMMAND CENTER</h1>
            <p className="text-[7px] text-zinc-500 uppercase tracking-wider">Operational Management Interface</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 min-h-0 overflow-hidden">
        {/* Left Column - Quick Actions & Activity Log */}
        <div className="space-y-2 overflow-y-auto">
          <QuickActions user={user} onActionComplete={handleActionComplete} />
          
          {/* Activity Log */}
          <div className="border border-zinc-800 bg-zinc-950/50 p-2">
            <div className="flex items-center gap-1 mb-2">
              <Activity className="w-3 h-3 text-zinc-500" />
              <h3 className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">ACTIVITY LOG</h3>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {actionLog.length > 0 ? (
                actionLog.map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[7px] p-1 bg-zinc-900/50 border border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-zinc-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className={log.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                        {log.status === 'success' ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="text-zinc-300 mt-0.5">{log.actionId.replace(/_/g, ' ').toUpperCase()}</div>
                  </motion.div>
                ))
              ) : (
                <div className="text-[7px] text-zinc-600 italic text-center py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column - Operation Playbooks */}
        <div className="overflow-y-auto">
          <OperationPlaybook />
        </div>

        {/* Right Column - Comms Integration */}
        <div className="overflow-y-auto">
          <CommsIntegration />
        </div>
      </div>
    </div>
  );
}