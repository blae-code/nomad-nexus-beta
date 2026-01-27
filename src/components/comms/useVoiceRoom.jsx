import { useState, useCallback } from 'react';
import { isDemoMode } from '@/lib/demo-mode';

const useVoiceRoom = (roomName, userIdentity) => {
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const isLiveKitConfigured = import.meta.env.VITE_LIVEKIT_URL && import.meta.env.VITE_LIVEKIT_API_KEY;
  const canConnect = isLiveKitConfigured && !isDemoMode();

  const connect = useCallback(async () => {
    if (!canConnect) {
      setStatus('disabled');
      setError('Voice not available in demo mode or LiveKit is not configured.');
      return;
    }
    // This is where the actual LiveKit connection logic would go.
    // For now, we'll just simulate a successful connection.
    setStatus('connected');
  }, [canConnect]);

  const disconnect = useCallback(() => {
    setStatus('disconnected');
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    error,
    room: null, // No actual room object in the stub
  };
};

export { useVoiceRoom };
