/**
 * Checks if LiveKit infrastructure is ready for LIVE mode.
 * Returns { isReady: boolean, reason: string | null }
 */
export async function checkLiveKitReadiness() {
  try {
    // Check 1: Environment variables configured
    const hasURL = import.meta.env.VITE_LIVEKIT_URL;

    if (!hasURL) return { isReady: false, reason: 'LiveKit URL not configured' };

    // Check 2: Token generation works (test call to backend)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/functions/generateLiveKitToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: '__test__', participantName: '__test__' }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

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
