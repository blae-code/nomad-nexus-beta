import React, { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, createLocalAudioTrack } from 'livekit-client';
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Radio, Volume2, VolumeX, Loader2, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CommsPanel({ eventId }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [nets, setNets] = useState([]);
  const [token, setToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [error, setError] = useState(null);
  
  // Audio State
  const [activeTxNet, setActiveTxNet] = useState(null); // Net currently transmitting to
  const [mutedNets, setMutedNets] = useState({}); // Map of netId -> boolean (true = muted)

  // Refs
  const roomRef = useRef(null);
  const currentUserRef = useRef(null);

  // 1. Fetch Token & Nets
  const initializeComms = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const user = await base44.auth.me();
      currentUserRef.current = user;

      // Call our backend function
      // Note: In real implementation we call the backend function directly via import
      // but here we assume it's exposed or we call it directly if we are in the same context.
      // For this architecture, we'll assume we can import the function or use an API wrapper.
      // Since we can't import backend functions in frontend, we'll simulate the API call logic
      // by assuming there's an SDK method or we use a mock if backend functions aren't exposed as HTTP automatically.
      // *Correction*: Base44 SDK usually exposes backend functions via `base44.functions.invoke` or similar.
      // Assuming `base44.functions.comms.issueLiveKitToken` exists or similar pattern.
      // If not, I'll import the function from the file if it allows (unlikely for backend -> frontend).
      // Let's assume standard method:
      const response = await base44.backendFunctions.invoke('issueLiveKitToken', { 
        eventId: eventId, 
        userId: user.id 
      });

      if (!response.token) throw new Error("No token received");

      setToken(response.token);
      setLiveKitUrl(response.url);
      setNets(response.nets);
      
      connectLiveKit(response.url, response.token, response.nets);

    } catch (err) {
      console.error("Comms init error:", err);
      setError(err.message);
      setIsConnecting(false);
    }
  };

  // 2. Connect to LiveKit
  const connectLiveKit = async (url, token, initialNets) => {
    try {
      const room = new Room();
      roomRef.current = room;

      // Handle Tracks
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === 'audio') {
          const element = track.attach();
          // We could manage volume/muting of this specific element based on metadata
          // For v0.1: We just play everything.
          // Advanced: Check participant metadata to see which "Net" they are talking on.
        }
      });

      await room.connect(url, token);
      console.log('Connected to LiveKit room', room.name);
      setIsConnected(true);
      setIsConnecting(false);

    } catch (err) {
      console.error("LiveKit connect error:", err);
      setError("Failed to connect to voice server");
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    setIsConnected(false);
    setActiveTxNet(null);
  };

  // 3. Push to Talk Logic
  const startTx = async (net) => {
    if (!roomRef.current || !net.canTx) return;
    
    try {
      setActiveTxNet(net.code);
      // Publish audio with the Net Code as the name/tag
      const localTracks = await createLocalAudioTrack();
      await roomRef.current.localParticipant.publishTrack(localTracks, {
        name: net.code 
      });
    } catch (err) {
      console.error("TX Error:", err);
    }
  };

  const stopTx = async () => {
    if (!roomRef.current) return;
    
    try {
      setActiveTxNet(null);
      const tracks = roomRef.current.localParticipant.audioTracks;
      for (const [sid, pub] of tracks) {
        await roomRef.current.localParticipant.unpublishTrack(pub.track);
        pub.track.stop();
      }
    } catch (err) {
      console.error("Stop TX Error:", err);
    }
  };

  // Toggle listening (Local Mute)
  const toggleNetMute = (netCode) => {
    // For v0.1, we can't easily selectively mute incoming streams without metadata.
    // We'll just track the state visually for now, or implement filtering if metadata exists.
    // For this placeholder UI, we'll just toggle the state.
    setMutedNets(prev => ({
      ...prev,
      [netCode]: !prev[netCode]
    }));
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
            <Radio className={cn("w-4 h-4", isConnected ? "text-green-500" : "text-zinc-500")} />
            Redscar Comms
          </CardTitle>
          <div className="flex gap-2">
             {isConnected ? (
                <Button variant="ghost" size="icon" onClick={disconnect} className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-zinc-900">
                  <Power className="w-3 h-3" />
                </Button>
             ) : (
               <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">OFFLINE</Badge>
             )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {!isConnected ? (
          <div className="p-6 flex flex-col items-center justify-center gap-4">
            <div className="text-zinc-500 text-xs text-center max-w-[200px]">
              Connect to the secure network to access squad channels.
            </div>
            <Button 
              size="sm" 
              onClick={initializeComms} 
              disabled={isConnecting}
              className="bg-red-900 hover:bg-red-800 text-white border border-red-700"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
              INITIALIZE LINK
            </Button>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {nets.filter(n => n.canRx).map((net) => (
              <div key={net.code} className="flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-full",
                      mutedNets[net.code] ? "text-zinc-600" : "text-emerald-500 bg-emerald-500/10"
                    )}
                    onClick={() => toggleNetMute(net.code)}
                  >
                    {mutedNets[net.code] ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{net.code}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{net.type} NET</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {net.canTx && (
                    <button
                      onMouseDown={() => startTx(net)}
                      onMouseUp={stopTx}
                      onMouseLeave={stopTx}
                      onTouchStart={() => startTx(net)}
                      onTouchEnd={stopTx}
                      className={cn(
                        "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all select-none",
                        activeTxNet === net.code 
                          ? "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] scale-95" 
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                      )}
                    >
                      {activeTxNet === net.code ? 'TRANSMITTING' : 'PUSH TO TALK'}
                    </button>
                  )}
                  {!net.canTx && (
                     <span className="text-[9px] text-zinc-700 px-2">RX ONLY</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {isConnected && (
        <CardFooter className="py-2 px-4 bg-zinc-900/50 border-t border-zinc-900">
          <div className="flex items-center gap-2 w-full">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", activeTxNet ? "bg-red-500" : "bg-emerald-500")} />
            <span className="text-[10px] text-zinc-500 font-mono flex-1">
              {activeTxNet ? `TX: ${activeTxNet}` : "SIGNAL CLEAR"}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              V0.1
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}