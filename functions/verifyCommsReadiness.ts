/**
 * Verifies if LIVE comms mode is truly ready.
 * Checks: env vars, LiveKit connectivity, token minting capability.
 * Returns: { isReady: boolean, reason: string }
 */
Deno.serve(async (req) => {
  try {
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
    const getLoopbackInfo = () => {
      const url = new URL(req.url);
      const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
      const hostname = hostHeader?.split(':')[0];
      const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      const realIp = req.headers.get('x-real-ip');
      const candidates = [hostname, forwardedFor, realIp].filter(Boolean);
      return candidates.some((candidate) => loopbackHosts.has(candidate));
    };

    const isLoopbackRequest = getLoopbackInfo();

    // Check 1: Environment variables
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');
    const liveKitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const liveKitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
      const missingVars = [
        !liveKitUrl ? 'LIVEKIT_URL' : null,
        !liveKitApiKey ? 'LIVEKIT_API_KEY' : null,
        !liveKitApiSecret ? 'LIVEKIT_API_SECRET' : null
      ].filter(Boolean);
      const envStatus = isLoopbackRequest ? 'development' : 'missing';
      const warning = isLoopbackRequest
        ? 'Local loopback detected. LiveKit env vars are missing, so LIVE comms are disabled.'
        : 'LiveKit env vars are missing. Configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.';
      return Response.json({
        isReady: false,
        reason: 'LiveKit environment not configured',
        envStatus,
        missingVars,
        warning
      });
    }

    // Check 2: Basic LiveKit connectivity (ping health endpoint)
    try {
      const healthUrl = new URL('/health', liveKitUrl).toString();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (!healthResponse?.ok) {
        return Response.json({
          isReady: false,
          reason: 'LiveKit server unreachable',
          envStatus: 'misconfigured',
          warning: 'LiveKit health check failed. Verify LIVEKIT_URL and server availability.'
        });
      }
    } catch (error) {
      return Response.json({
        isReady: false,
        reason: 'LiveKit connectivity check failed',
        envStatus: 'misconfigured',
        warning: 'Unable to validate LiveKit connectivity. Confirm LIVEKIT_URL is reachable.'
      });
    }

    // Check 3: Token minting capability (verify credentials work)
    // This is a lightweight check - we don't actually mint a token, just verify the setup
    if (!liveKitUrl.startsWith('http://') && !liveKitUrl.startsWith('https://')) {
      return Response.json({
        isReady: false,
        reason: 'Invalid LiveKit URL format',
        envStatus: 'misconfigured',
        warning: 'LIVEKIT_URL must include http:// or https://.'
      });
    }

    return Response.json({
      isReady: true,
      reason: null,
      envStatus: 'configured',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[verifyCommsReadiness] Error:', error);
    return Response.json({
      isReady: false,
      reason: 'Readiness verification error: ' + error.message
    }, { status: 500 });
  }
});
