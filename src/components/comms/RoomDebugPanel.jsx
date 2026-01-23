import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RoomDebugPanel({ room, roomName, identity, token, connectionState, lastError }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
    toast.success('Copied to clipboard');
  };

  // Get connection color
  const connectionColor =
    connectionState === 'connected'
      ? 'text-emerald-500 bg-emerald-950/30'
      : connectionState === 'connecting' || connectionState === 'reconnecting'
      ? 'text-amber-500 bg-amber-950/30'
      : connectionState === 'failed'
      ? 'text-red-500 bg-red-950/30'
      : 'text-zinc-500 bg-zinc-900/30';

  const debugFields = [
    { label: 'Room Name', value: roomName || 'N/A', short: 'room' },
    { label: 'Identity', value: identity || 'N/A', short: 'id' },
    { label: 'Token', value: token ? `${token.substring(0, 16)}...` : 'Not minted', short: 'token' },
    {
      label: 'Connection State',
      value: connectionState || 'disconnected',
      short: 'state',
      isBadge: true
    },
    { label: 'Participants', value: room?.remoteParticipants?.size || 0, short: 'peers' },
    {
      label: 'Last Error',
      value: lastError || 'None',
      short: 'error',
      isError: !!lastError
    }
  ];

  if (!isExpanded) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-20 right-4 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 hover:border-cyan-500 hover:bg-cyan-950/20 flex items-center justify-center text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors z-40 shadow-lg"
        title="Open debug panel"
      >
        🔌
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-20 right-4 z-50 w-96"
      >
        <Card className="bg-zinc-950 border border-cyan-800/50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/20 border-b border-cyan-800/30">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  connectionState === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : connectionState === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-red-500'
                )}
              />
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                Room Debug
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
              onClick={() => setIsExpanded(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {debugFields.map((field) => (
              <div key={field.short} className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  {field.label}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {field.isBadge ? (
                    <Badge
                      className={cn(
                        'text-[10px] px-2 py-0.5 font-mono',
                        connectionState === 'connected'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : connectionState === 'connecting' || connectionState === 'reconnecting'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      )}
                    >
                      {field.value}
                    </Badge>
                  ) : (
                    <code
                      className={cn(
                        'text-[11px] px-2 py-1 rounded bg-zinc-900/50 border border-zinc-800 font-mono truncate flex-1',
                        field.isError ? 'text-red-400 border-red-800/50' : 'text-zinc-300'
                      )}
                    >
                      {field.value}
                    </code>
                  )}
                  {!field.isBadge && field.value !== 'N/A' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-600 hover:text-cyan-400"
                      onClick={() => copyToClipboard(field.value, field.short)}
                    >
                      {copiedField === field.short ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {lastError && (
              <div className="mt-3 p-3 bg-red-950/20 border border-red-800/30 rounded-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-red-300 font-mono leading-tight break-all">
                    {lastError}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800/50 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
            <span>STATUS: {connectionState.toUpperCase()}</span>
            {connectionState === 'connecting' && <Loader2 className="w-3 h-3 animate-spin" />}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}