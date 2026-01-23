import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RoomDebugPanel({ room, roomName, identity, token, connectionState, lastError }) {
  if (!room || !roomName) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const participantCount = (room?.remoteParticipants?.size || 0) + (room?.localParticipant ? 1 : 0);
  
  const getStatusColor = () => {
    if (connectionState === 'connected') return 'text-emerald-500';
    if (connectionState === 'reconnecting') return 'text-amber-500';
    if (connectionState === 'failed') return 'text-red-500';
    return 'text-zinc-500';
  };

  const localParticipant = room?.localParticipant;
  const micEnabled = localParticipant?.isMicrophoneEnabled();
  const cameraEnabled = localParticipant?.isCameraEnabled();

  return (
    <Card className="bg-zinc-950 border-zinc-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-mono">DEBUG: ROOM STATE</CardTitle>
            <Badge 
              variant="outline" 
              className={cn(
                'text-[9px] px-1.5 py-0.5',
                connectionState === 'connected' ? 'border-emerald-500 text-emerald-500' :
                connectionState === 'failed' ? 'border-red-500 text-red-500' :
                'border-zinc-600 text-zinc-400'
              )}
            >
              {connectionState?.toUpperCase()}
            </Badge>
          </div>
          <Zap className="w-3 h-3 text-zinc-600" />
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Room Name */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 rounded text-[10px]">
          <span className="text-zinc-500 font-mono">ROOM:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-300">{roomName}</span>
            <button
              onClick={() => copyToClipboard(roomName, 'Room name')}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <Copy className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 rounded text-[10px]">
          <span className="text-zinc-500 font-mono">IDENTITY:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-300">{identity || 'UNKNOWN'}</span>
            <button
              onClick={() => copyToClipboard(identity || '', 'Identity')}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <Copy className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Token Status */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 rounded text-[10px]">
          <span className="text-zinc-500 font-mono">TOKEN:</span>
          <div className="flex items-center gap-2">
            {token ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500 font-mono text-[9px]">MINTED</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-red-500 font-mono text-[9px]">PENDING</span>
              </>
            )}
          </div>
        </div>

        {/* Participant Count */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 rounded text-[10px]">
          <span className="text-zinc-500 font-mono">PEERS:</span>
          <span className="font-mono text-zinc-300">{participantCount}</span>
        </div>

        {/* Media State */}
        <div className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 rounded text-[10px]">
          <span className="text-zinc-500 font-mono">MEDIA:</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-mono text-[9px] px-1.5 py-0.5 rounded border',
              micEnabled ? 'border-emerald-600 text-emerald-500 bg-emerald-950/30' : 'border-zinc-600 text-zinc-500 bg-zinc-900/30'
            )}>
              MIC {micEnabled ? 'ON' : 'OFF'}
            </span>
            <span className={cn(
              'font-mono text-[9px] px-1.5 py-0.5 rounded border',
              cameraEnabled ? 'border-emerald-600 text-emerald-500 bg-emerald-950/30' : 'border-zinc-600 text-zinc-500 bg-zinc-900/30'
            )}>
              CAM {cameraEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Last Error (if any) */}
        {lastError && (
          <div className="p-2 bg-red-950/30 border border-red-800/30 rounded text-[10px]">
            <div className="text-red-500 font-mono font-bold mb-1">LAST ERROR:</div>
            <div className="text-red-400 text-[9px] font-mono break-words">{lastError}</div>
          </div>
        )}

        {/* Connection Quality (if connected) */}
        {connectionState === 'connected' && room?.localParticipant && (
          <div className="p-2 bg-emerald-950/20 border border-emerald-800/30 rounded text-[10px]">
            <div className="text-emerald-600 font-mono font-bold mb-1">QUALITY:</div>
            <div className="text-emerald-500 text-[9px] font-mono">
              {room.localParticipant.lastConnectionQuality?.toUpperCase() || 'CHECKING'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}