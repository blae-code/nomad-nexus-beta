import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, AlertTriangle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

const POSTURE_STATES = {
  GREEN: { label: 'NOMINAL', color: 'text-emerald-500', accentColor: '#10b981', icon: Radio },
  AMBER: { label: 'ELEVATED', color: 'text-amber-500', accentColor: '#f59e0b', icon: AlertCircle },
  RED: { label: 'CRITICAL', color: 'text-red-500', accentColor: '#ef4444', icon: AlertTriangle }
};

export default function AlertPostureIndicator() {
  const [posture, setPosture] = useState('GREEN');
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAuthorized(u?.role === 'admin' || u?.rank === 'Pioneer');
    }).catch(() => {});
  }, []);

  const handlePostureChange = (newPosture) => {
    if (!isAuthorized) return;
    setPosture(newPosture);
    // Future: persist to user preferences or global setting
  };

  const Icon = POSTURE_STATES[posture].icon;
  const state = POSTURE_STATES[posture];

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-800 bg-zinc-950/50">
      <Icon className={cn("w-3 h-3", state.color)} />
      <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider", state.color)}>
        {state.label}
      </span>
      
      {isAuthorized && (
        <div className="flex gap-1 ml-2 pl-2 border-l border-zinc-800">
          {Object.keys(POSTURE_STATES).map(p => (
            <button
              key={p}
              onClick={() => handlePostureChange(p)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                posture === p ? "bg-current scale-125" : "bg-zinc-700 hover:bg-zinc-600",
                POSTURE_STATES[p].color
              )}
              title={`Set to ${POSTURE_STATES[p].label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}