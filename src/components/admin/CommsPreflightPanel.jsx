import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Zap,
  Network,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEST_ROOM = 'nx-preflight';
const TEST_USER_ID = 'admin-preflight-test';

/**
 * CommsPreflightPanel: Real smoke test for LiveKit comms
 * Tests: env vars → token mint → room status → client connect
 */
export default function CommsPreflightPanel() {
  const [results, setResults] = useState(null);
  const [testInProgress, setTestInProgress] = useState(false);

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const results = {
        envReady: false,
        envErrors: [],
        tokenMint: null,
        roomStatus: null,
        clientConnect: null,
        timestamp: new Date().toISOString()
      };

      try {
        // ============================================
        // STEP 1: Check Environment Readiness
        // ============================================
        const envCheck = await checkEnv();
        results.envReady = envCheck.ready;
        results.envErrors = envCheck.errors;

        if (!envCheck.ready) {
          setResults(results);
          return results;
        }

        // ============================================
        // STEP 2: Mint Token
        // ============================================
        try {
          const tokenRes = await base44.functions.invoke('generateLiveKitToken', {
            roomName: TEST_ROOM,
            userIdentity: TEST_USER_ID,
            metadata: { role: 'admin', test: true }
          });

          if (tokenRes.data?.token) {
            results.tokenMint = {
              success: true,
              token: tokenRes.data.token.substring(0, 20) + '...',
              timestamp: new Date().toISOString()
            };
          } else {
            results.tokenMint = {
              success: false,
              error: tokenRes.data?.error || 'No token returned'
            };
          }
        } catch (err) {
          results.tokenMint = {
            success: false,
            error: err.message || 'Token generation failed'
          };
        }

        if (!results.tokenMint?.success) {
          setResults(results);
          return results;
        }

        // ============================================
        // STEP 3: Check Room Status
        // ============================================
        try {
          const statusRes = await base44.functions.invoke('getLiveKitRoomStatus', {
            rooms: [TEST_ROOM]
          });

          if (statusRes.data?.rooms && statusRes.data.rooms.length > 0) {
            const room = statusRes.data.rooms[0];
            results.roomStatus = {
              success: true,
              participants: room.num_participants || 0,
              empty: room.empty_timeout || 'N/A',
              maxParticipants: room.max_participants || 'unlimited'
            };
          } else {
            results.roomStatus = {
              success: false,
              error: 'Room not found or empty'
            };
          }
        } catch (err) {
          results.roomStatus = {
            success: false,
            error: err.message || 'Room status check failed'
          };
        }

        // ============================================
        // STEP 4: Attempt Client Connection (Optional)
        // ============================================
        try {
          const { Room } = await import('livekit-client');
          
          const liveKitUrl = localStorage.getItem('livekit_url') || 
                            process.env.REACT_APP_LIVEKIT_URL;
          
          if (!liveKitUrl) {
            throw new Error('LiveKit URL not available');
          }

          const room = new Room({
            audio: false,
            video: false
          });

          const connectStart = Date.now();
          
          room.on('disconnected', () => {
            // Auto-cleanup
          });

          await room.connect(liveKitUrl, results.tokenMint.token);
          
          const connectDuration = Date.now() - connectStart;

          results.clientConnect = {
            success: true,
            duration: connectDuration,
            room: TEST_ROOM
          };

          // Immediate disconnect
          await room.disconnect();
        } catch (err) {
          results.clientConnect = {
            success: false,
            error: err.message || 'Client connection failed'
          };
        }

        setResults(results);
        return results;
      } catch (err) {
        console.error('[PREFLIGHT] Test error:', err);
        setResults(results);
        return results;
      }
    },
    onMutate: () => setTestInProgress(true),
    onSettled: () => setTestInProgress(false)
  });

  // Environment check
  const checkEnv = async () => {
    const errors = [];
    
    // Check for env vars or secrets
    const hasUrl = localStorage.getItem('livekit_url') || !!process.env.REACT_APP_LIVEKIT_URL;
    const hasApiKey = !!process.env.REACT_APP_LIVEKIT_API_KEY; // Can't check secrets from frontend
    const hasApiSecret = !!process.env.REACT_APP_LIVEKIT_API_SECRET; // Can't check secrets from frontend

    if (!hasUrl) errors.push('LIVEKIT_URL not configured');
    // Note: API key/secret are backend-only, but we can infer from token generation success

    return {
      ready: errors.length === 0,
      errors
    };
  };

  const handleRunTest = async () => {
    testMutation.mutate();
  };

  // Helper to get status badge
  const StatusBadge = ({ status, label }) => {
    if (status === true || status?.success === true) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-950/60 border border-green-800 rounded">
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-mono text-green-300">{label}</span>
        </div>
      );
    }
    if (status === false || status?.success === false) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-950/60 border border-red-800 rounded">
          <XCircle className="w-3 h-3 text-red-400" />
          <span className="text-[10px] font-mono text-red-300">{label}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/60 border border-zinc-700 rounded">
        <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
        <span className="text-[10px] font-mono text-zinc-400">{label}</span>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-tight">Comms Preflight</h4>
          <p className="text-[10px] text-zinc-500">LiveKit readiness smoke test</p>
        </div>
        <Button
          onClick={handleRunTest}
          disabled={testMutation.isPending || testInProgress}
          size="sm"
          className={cn(
            'gap-1.5 text-xs',
            testMutation.isPending ? 'opacity-50' : ''
          )}
          variant={results?.envReady === false ? 'destructive' : 'default'}
        >
          {testMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run Test
            </>
          )}
        </Button>
      </div>

      {/* Test Status Grid */}
      {results ? (
        <div className="space-y-3 bg-zinc-950/40 border border-zinc-800 p-3 rounded">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-400">STATUS</span>
            <div className="flex gap-1.5">
              <StatusBadge status={results.envReady} label="ENV" />
              <StatusBadge status={results.tokenMint} label="TOKEN" />
              <StatusBadge status={results.roomStatus} label="ROOM" />
              <StatusBadge status={results.clientConnect} label="CLIENT" />
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-2 text-[10px]">
            {/* Env */}
            <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3 text-zinc-500" />
                <span className="font-mono text-zinc-400">ENV READY</span>
              </div>
              {results.envErrors.length > 0 ? (
                <div className="text-red-400 space-y-0.5">
                  {results.envErrors.map((e, i) => (
                    <p key={i} className="ml-5">• {e}</p>
                  ))}
                </div>
              ) : (
                <p className="text-green-400 ml-5">✓ LIVEKIT_URL configured</p>
              )}
            </div>

            {/* Token */}
            {results.tokenMint && (
              <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-3 h-3 text-zinc-500" />
                  <span className="font-mono text-zinc-400">TOKEN MINT</span>
                </div>
                {results.tokenMint.success ? (
                  <div className="text-green-400 space-y-0.5">
                    <p className="ml-5">✓ Token generated: {results.tokenMint.token}</p>
                  </div>
                ) : (
                  <p className="text-red-400 ml-5">✗ {results.tokenMint.error}</p>
                )}
              </div>
            )}

            {/* Room Status */}
            {results.roomStatus && (
              <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Network className="w-3 h-3 text-zinc-500" />
                  <span className="font-mono text-zinc-400">ROOM STATUS</span>
                </div>
                {results.roomStatus.success ? (
                  <div className="text-green-400 space-y-0.5 ml-5">
                    <p>✓ Room: {TEST_ROOM}</p>
                    <p>• Participants: {results.roomStatus.participants}</p>
                  </div>
                ) : (
                  <p className="text-amber-400 ml-5">⚠ {results.roomStatus.error}</p>
                )}
              </div>
            )}

            {/* Client Connect */}
            {results.clientConnect && (
              <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-3 h-3 text-zinc-500" />
                  <span className="font-mono text-zinc-400">CLIENT CONNECT</span>
                </div>
                {results.clientConnect.success ? (
                  <div className="text-green-400 space-y-0.5 ml-5">
                    <p>✓ Connected & disconnected</p>
                    <p>• Duration: {results.clientConnect.duration}ms</p>
                  </div>
                ) : (
                  <p className="text-amber-400 ml-5">⚠ {results.clientConnect.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Test Timestamp */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-[9px] text-zinc-600">
              {new Date(results.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-[9px] font-mono text-zinc-600">
              {results.envReady && results.tokenMint?.success && results.roomStatus?.success
                ? '🟢 LIVE READY'
                : '🔴 LIVE FAIL'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-zinc-950/40 border border-zinc-800 rounded text-center">
          <p className="text-[10px] text-zinc-600 font-mono">Click "Run Test" to start preflight check</p>
        </div>
      )}
    </div>
  );
}