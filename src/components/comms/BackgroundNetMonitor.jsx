import React, { useEffect, useState } from 'react';

// NOTE: livekit-client is not available in this environment.
// This component simulates a background connection.

export default function BackgroundNetMonitor({ netId, eventId, user }) {
   const [connectionStatus, setConnectionStatus] = useState("disconnected");

   useEffect(() => {
      if (!netId || !user) return;

      // Simulate connection sequence
      setConnectionStatus("connecting");
      
      const timer = setTimeout(() => {
         setConnectionStatus("connected");
         console.log(`[BackgroundMonitor] Connected to net ${netId} (SIMULATION)`);
      }, 1500);

      return () => {
         clearTimeout(timer);
         console.log(`[BackgroundMonitor] Disconnected from net ${netId}`);
      };
   }, [netId, user]);

   return null; 
}