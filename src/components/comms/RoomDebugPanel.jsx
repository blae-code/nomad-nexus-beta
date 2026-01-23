import React, { useState, useEffect } from 'react';
import { useVoiceRoomJoin } from './useVoiceRoomJoin';
import { AlertCircle, Wifi, WifiOff, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RoomDebugPanel({ isVisible = true }) {
  const { roomName, roomToken, roomUrl, connectionState, lastError, participants, isLiveMode, isSimMode } = useVoiceRoomJoin();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updateTime, setUpdateTime] = useState(new Date());

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => setUpdateTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (!isVisible) return null;

  const connectionStatusColor = {
    'connected': 'text-green-400 bg-green-950',
    'connecting': 'text-yellow-400 bg-yellow-950',
    'disconnected': 'text-gray-400 bg-gray-950',
    'failed': 'text-red-400 bg-red-950'
  }[connectionState] || 'text-gray-400 bg-gray-950';

  const connectionStatusIcon = {
    'connected': <Wifi className="w-3 h-3 animate-pulse" />,
    'connecting': <Clock className="w-3 h-3 animate-spin" />,
    'disconnected': <WifiOff className="w-3 h-3" />,
    'failed': <AlertCircle className="w-3 h-3" />
  }[connectionState];

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/95 border border-zinc-700 rounded text-[8px] max-w-xs z-50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-zinc-700 p-1.5 bg-zinc-800/50 flex items-center justify-between">
        <span className="font-bold text-zinc-300 uppercase tracking-wider">ROOM DEBUG</span>
        <button 
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="text-[7px] text-zinc-500 hover:text-zinc-300"
        >
          {autoRefresh ? '⟳' : '⊙'}
        </button>
      </div>

      {/* Content */}
      <div className="p-2 space-y-1.5">
        {/* Mode */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">MODE:</span>
          <Badge className={isLiveMode ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}>
            {isLiveMode ? 'LIVE' : isSimMode ? 'SIM' : 'UNKNOWN'}
          </Badge>
        </div>

        {/* Room Name */}
        {roomName && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-zinc-500">ROOM:</span>
            <span className="text-zinc-300 font-mono text-right break-all">{roomName}</span>
          </div>
        )}

        {/* Connection State */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">STATE:</span>
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase', connectionStatusColor)}>
            {connectionStatusIcon}
            {connectionState}
          </div>
        </div>

        {/* Token Status */}
        {isLiveMode && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">TOKEN:</span>
            <Badge className={roomToken ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}>
              {roomToken ? '✓ MINTED' : '✗ NONE'}
            </Badge>
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">USERS:</span>
          <div className="flex items-center gap-1 text-zinc-300">
            <Users className="w-3 h-3" />
            <span className="font-bold">{participants.length}</span>
          </div>
        </div>

        {/* Error */}
        {lastError && (
          <div className="bg-red-950 border border-red-800 rounded p-1 text-red-300">
            <div className="font-bold text-[7px] mb-0.5">ERROR:</div>
            <div className="text-[7px] break-all">{lastError}</div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-[7px] text-zinc-500 text-right pt-1 border-t border-zinc-700 mt-1">
          {updateTime.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}