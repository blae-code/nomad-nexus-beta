/**
 * AIModerationIndicator — Shows AI moderation status
 */

import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AIModerationIndicator({ channelId, isAdmin }) {
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [recentFlags, setRecentFlags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const loadRecentFlags = async () => {
      try {
        const logs = await base44.entities.AdminAuditLog.filter({
          action: 'AI_MODERATION',
        });

        // Get recent flags from last 24h
        const recent = logs
          .filter(log => {
            const logTime = new Date(log.created_date);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return logTime > dayAgo && log.details?.channel_id === channelId;
          })
          .slice(0, 5);

        setRecentFlags(recent);
      } catch (error) {
        console.error('Failed to load moderation logs:', error);
      }
    };

    loadRecentFlags();
  }, [channelId, isAdmin]);

  if (!isAdmin) return null;

  const hasRecentFlags = recentFlags.length > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
              hasRecentFlags
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-green-500/10 text-green-400'
            }`}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : hasRecentFlags ? (
              <ShieldAlert className="w-3 h-3" />
            ) : (
              <ShieldCheck className="w-3 h-3" />
            )}
            <span className="font-mono">AI Mod</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" />
              <span className="font-semibold">AI Moderation</span>
            </div>
            <div className="text-xs text-zinc-400">
              {moderationEnabled ? (
                <>Active — Messages are analyzed for policy violations</>
              ) : (
                <>Disabled for this channel</>
              )}
            </div>
            {hasRecentFlags && (
              <div className="border-t border-zinc-700 pt-2 mt-2">
                <div className="text-xs text-orange-400 font-semibold mb-1">
                  Recent Flags (24h): {recentFlags.length}
                </div>
                {recentFlags.slice(0, 3).map((flag, idx) => (
                  <div key={idx} className="text-xs text-zinc-500 truncate">
                    • {flag.details?.analysis?.violation_type || 'Unknown'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}