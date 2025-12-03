import React, { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent } from "livekit-client";
import { base44 } from "@/api/base44Client";

export default function BackgroundNetMonitor({ netId, eventId, user }) {
   const [connectionStatus, setConnectionStatus] = useState("disconnected");
   const roomRef = useRef(null);

   useEffect(() => {
      if (!netId || !user) return;

      const connectToNet = async () => {
         setConnectionStatus("connecting");
         
         try {
            // 1. Get the Net Code/Name
            // We only have ID, so we must fetch the net details first
            // Optimization: In a real app, we might pass the full net object or cache this
            const nets = await base44.entities.VoiceNet.list({ filter: { id: netId }, limit: 1 });
            const net = nets[0];
            
            if (!net) {
               console.error(`[BackgroundMonitor] Net ${netId} not found`);
               return;
            }

            // 2. Get Token
            const res = await base44.functions.invoke('generateLiveKitToken', {
               roomNames: [net.code],
               participantName: `${user.callsign || user.full_name} (Monitor)`
            });
            
            const token = res.data.tokens ? res.data.tokens[net.code] : res.data.token;
            const livekitUrl = res.data.livekitUrl;

            if (!token || !livekitUrl) {
               throw new Error("Failed to get connection details");
            }

            // 3. Connect
            const room = new Room({
               adaptiveStream: true,
               dynacast: true,
            });

            roomRef.current = room;

            // Handle Tracks
            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
               if (track.kind === 'audio') {
                  const element = track.attach();
                  document.body.appendChild(element);
               }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
               track.detach().forEach(element => element.remove());
            });

            await room.connect(livekitUrl, token);
            setConnectionStatus("connected");
            console.log(`[BackgroundMonitor] Monitoring ${net.code}`);

         } catch (err) {
            console.error(`[BackgroundMonitor] Failed to monitor net ${netId}:`, err);
            setConnectionStatus("error");
         }
      };

      connectToNet();

      return () => {
         if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
         }
      };
   }, [netId, user]);

   return null; 
}