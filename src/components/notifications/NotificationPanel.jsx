import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import NotificationHistory from './NotificationHistory';
import NotificationPreferences from './NotificationPreferences';

export default function NotificationPanel() {
  const [expanded, setExpanded] = useState({ history: false, prefs: false });

  return (
    <div className="space-y-2 bg-black/40 border-b border-red-700/40 p-2">
      {/* History Section */}
      <button
        onClick={() => setExpanded((prev) => ({ ...prev, history: !prev.history }))}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-900/40 transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-300">History</span>
        {expanded.history ? (
          <ChevronUp className="w-3 h-3 text-zinc-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        )}
      </button>
      {expanded.history && (
        <div className="pl-2 border-l border-red-700/30">
          <NotificationHistory />
        </div>
      )}

      {/* Preferences Section */}
      <button
        onClick={() => setExpanded((prev) => ({ ...prev, prefs: !prev.prefs }))}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-900/40 transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-300">Preferences</span>
        {expanded.prefs ? (
          <ChevronUp className="w-3 h-3 text-zinc-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        )}
      </button>
      {expanded.prefs && (
        <div className="pl-2 border-l border-red-700/30">
          <NotificationPreferences />
        </div>
      )}
    </div>
  );
}