/**
 * Checks if LiveKit infrastructure is ready for LIVE mode.
 * Returns { isReady: boolean, reason: string | null }
 */
export async function checkLiveKitReadiness() {
  try {
    // Check 1: Environment variables configured
    const hasURL = process.env.REACT_APP_LIVEKIT_URL || process.env.LIVEKIT_URL;
    const hasAPIKey = process.env.REACT_APP_LIVEKIT_API_KEY || process.env.LIVEKIT_API_KEY;
    const hasAPISecret = process.env.REACT_APP_LIVEKIT_API_SECRET || process.env.LIVEKIT_API_SECRET;

    if (!hasURL) return { isReady: false, reason: 'LiveKit URL not configured' };
    if (!hasAPIKey) return { isReady: false, reason: 'LiveKit API key not configured' };
    if (!hasAPISecret) return { isReady: false, reason: 'LiveKit API secret not configured' };

    // Check 2: Token generation works (test call to backend)
    try {
      const response = await fetch('/api/functions/generateLiveKitToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: '__test__', participantName: '__test__' })
      });

      if (!response.ok) {
        return { isReady: false, reason: 'Token generation failed' };
      }

      const data = await response.json();
      if (!data.data?.token) {
        return { isReady: false, reason: 'Invalid token response' };
      }
    } catch (err) {
      return { isReady: false, reason: 'Token service unreachable' };
    }

    // All checks passed
    return { isReady: true, reason: null };
  } catch (err) {
    console.error('[LiveKit Readiness] Check failed:', err);
    return { isReady: false, reason: 'Readiness check failed' };
  }
}