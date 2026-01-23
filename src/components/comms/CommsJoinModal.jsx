import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff, Radio, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Room, RoomEvent } from 'livekit-client';
import RoomDebugPanel from './RoomDebugPanel';

export default function CommsJoinModal({
  isOpen,
  onClose,
  netCode,
  netLabel,
  netId,
  onJoined,
  isLiveMode = true
}) {
  const [callsign, setCallsign] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [room, setRoom] = useState(null);
  const [token, setToken] = useState(null);
  const [identity, setIdentity] = useState(null);
  const roomRef = useRef(null);

  const roomName = `redscar_${netCode.toLowerCase()}`;

  // Generate default callsign
  useEffect(() => {
    if (!callsign && isOpen) {
      const names = ['Phoenix', 'Shadow', 'Viper', 'Hawk', 'Storm', 'Blade'];
      const idx = Math.floor(Math.random() * names.length);
      setCallsign(`${names[idx]}-${Math.floor(Math.random() * 1000)}`);
    }
  }, [isOpen]);

  const handleJoin = async () => {
    if (!callsign.trim()) {
      toast.error('Callsign required');
      return;
    }

    if (!isLiveMode) {
      // SIM mode: fake join
      setConnectionState('connected');
      setIdentity(callsign);
      setTimeout(() => {
        onJoined?.({ identity: callsign, room: null });
        onClose();
      }, 800);
      return;
    }

    // LIVE mode: actual join
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Get token
      const res = await base44.functions.invoke('generateLiveKitToken', {
        eventId: null,
        netIds: [netId],
        identity: callsign
      });

      if (!res.data.tokens?.[netId]) {
        throw new Error('No token for this net');
      }

      const minted_token = res.data.tokens[netId];
      const url = res.data.url || res.data.livekitUrl;

      if (!url) {
        throw new Error('No LiveKit URL provided');
      }

      setToken(minted_token);
      setIdentity(callsign);
      setConnectionState('connecting');

      // Connect to room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true
      });

      roomRef.current = newRoom;

      // Event handlers
      const handleConnected = () => {
        setConnectionState('connected');
        setRoom(newRoom);
        onJoined?.({ identity: callsign, room: newRoom });
        setTimeout(() => onClose(), 500);
      };

      const handleDisconnected = () => {
        setConnectionState('disconnected');
      };

      const handleError = (error) => {
        setConnectionError(error.message || 'Connection error');
        setConnectionState('failed');
      };

      newRoom.on(RoomEvent.Connected, handleConnected);
      newRoom.on(RoomEvent.Disconnected, handleDisconnected);
      newRoom.on('error', handleError);

      // Connect
      await newRoom.connect(url, minted_token);
    } catch (err) {
      console.error('[COMMS JOIN]', err);
      setConnectionError(err.message || 'Failed to join');
      setConnectionState('failed');
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (roomRef.current && connectionState === 'connected') {
      roomRef.current.disconnect();
    }
    roomRef.current = null;
    setRoom(null);
    setConnectionState('disconnected');
    setToken(null);
    setIdentity(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Radio className="w-5 h-5 text-cyan-400" />
              Join Net: {netCode}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {netLabel} {!isLiveMode && '(SIM MODE)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Callsign Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">
                Callsign
              </label>
              <Input
                placeholder="Enter callsign..."
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                disabled={isConnecting || connectionState === 'connected'}
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 font-mono"
              />
            </div>

            {/* Connection Status */}
            {connectionState !== 'disconnected' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-3 rounded-sm border text-xs font-mono flex items-center gap-2',
                  connectionState === 'connected'
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                    : connectionState === 'connecting'
                    ? 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                    : 'bg-red-950/30 border-red-800/50 text-red-400'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    connectionState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  )}
                />
                {connectionState === 'connecting' ? 'CONNECTING...' : connectionState.toUpperCase()}
              </motion.div>
            )}

            {/* Error Display */}
            <AnimatePresence>
              {connectionError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-950/20 border border-red-800/50 rounded-sm flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-red-300 font-mono break-all">{connectionError}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mode Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Mode</span>
              <Badge
                className={cn(
                  'text-[10px] font-mono',
                  isLiveMode
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                )}
              >
                {isLiveMode ? 'LIVE' : 'SIM'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isConnecting}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={isConnecting || connectionState === 'connected' || !callsign.trim()}
              className={cn(
                'bg-cyan-600 hover:bg-cyan-700 text-white font-mono',
                connectionState === 'connected' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {connectionState === 'connected' ? (
                <>
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Connected
                </>
              ) : isConnecting ? (
                <>
                  <Phone className="w-4 h-4 mr-2 animate-pulse" />
                  Joining...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Join Net
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debug Panel (admins) */}
      {connectionState !== 'disconnected' && (
        <RoomDebugPanel
          room={room}
          roomName={roomName}
          identity={identity}
          token={token}
          connectionState={connectionState}
          lastError={connectionError}
        />
      )}
    </>
  );
}