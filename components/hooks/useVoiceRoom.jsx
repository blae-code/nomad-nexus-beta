/**
 * useVoiceRoom - Stub hook for voice room functionality
 * Returns safe defaults to prevent crashes when LiveKit is unavailable
 */
export function useVoiceRoom() {
  return {
    room: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    participants: [],
    connect: async () => {},
    disconnect: async () => {},
  };
}