import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoomDebugPanel({ debug, isVisible = false }) {
  if (!isVisible) return null;

  const getStatusColor = (state) => {
    switch (state) {
      case 'connected': return 'bg-emerald-950 border-emerald-700 text-emerald-400';
      case 'connecting': return 'bg-amber-950 border-amber-700 text-amber-400';
      case 'disconnected': return 'bg-zinc-900 border-zinc-700 text-zinc-400';
      case 'error': return 'bg-red-950 border-red-700 text-red-400';
      default: return 'bg-zinc-900 border-zinc-700 text-zinc-400';
    }
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'connected': return <CheckCircle2 className="w-3 h-3" />;
      case 'error': return <AlertCircle className="w-3 h-3" />;
      default: return <Radio className="w-3 h-3 animate-pulse" />;
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 fixed bottom-4 right-4 w-80 z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-zinc-300 uppercase flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#ea580c]" />
          Room Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs font-mono">
        {/* Mode */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-400">Mode:</span>
          <Badge className={debug.mode === 'LIVE' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}>
            {debug.mode}
          </Badge>
        </div>

        {/* Connection State */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-400">Status:</span>
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded', getStatusColor(debug.connectionState))}>
            {getStatusIcon(debug.connectionState)}
            <span>{debug.connectionState.toUpperCase()}</span>
          </div>
        </div>

        {/* Token Status */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-400">Token:</span>
          <Badge className={debug.tokenMinted ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-300'}>
            {debug.tokenMinted ? '✓ MINTED' : 'PENDING'}
          </Badge>
        </div>

        {/* Participant Count */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
          <span className="text-zinc-400">Participants:</span>
          <span className="text-[#ea580c] font-bold">{debug.participantCount}</span>
        </div>

        {/* Last Error */}
        {debug.lastError && (
          <div className="p-2 bg-red-950/30 border border-red-800 rounded">
            <div className="text-red-400 text-[10px] break-words">{debug.lastError}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}