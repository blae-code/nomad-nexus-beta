import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, AlertCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const CheckItem = ({ label, status, message, detail }) => {
  const icons = {
    idle: <div className="w-3 h-3 border border-zinc-500 rounded-full" />,
    running: <Loader className="w-3 h-3 animate-spin text-blue-400" />,
    pass: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    warn: <AlertCircle className="w-3 h-3 text-yellow-400" />,
    fail: <XCircle className="w-3 h-3 text-red-400" />
  };

  const bgColors = {
    idle: 'bg-zinc-900/50',
    running: 'bg-blue-950/40 border-blue-800/50',
    pass: 'bg-emerald-950/40 border-emerald-800/50',
    warn: 'bg-yellow-950/40 border-yellow-800/50',
    fail: 'bg-red-950/40 border-red-800/50'
  };

  const textColors = {
    pass: 'text-emerald-300',
    warn: 'text-yellow-300',
    fail: 'text-red-300',
    idle: 'text-zinc-400',
    running: 'text-blue-300'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border border-zinc-700/50 ${bgColors[status]} p-2.5 space-y-1`}
    >
      <div className="flex items-center gap-2">
        {icons[status]}
        <span className="text-xs font-bold text-zinc-200">{label}</span>
        {message && <span className={`text-[10px] font-mono ${textColors[status]}`}>{message}</span>}
      </div>
      {detail && <div className="text-[9px] text-zinc-500 ml-5">{detail}</div>}
    </motion.div>
  );
};

export default function CommsPreflightPanel({ user }) {
  const [isRunning, setIsRunning] = useState(false);
  const [checks, setChecks] = useState({
   env_check: { status: 'idle', message: '', detail: '' },
   token_mint: { status: 'idle', message: '', detail: '' },
   room_status: { status: 'idle', message: '', detail: '' },
   client_connect: { status: 'idle', message: '', detail: '' }
  });
  const [overallResult, setOverallResult] = useState(null);

  const updateCheck = (key, status, message, detail) => {
    setChecks(prev => ({
      ...prev,
      [key]: { status, message, detail }
    }));
  };

  const runPreflightCheck = async () => {
    setIsRunning(true);
    setOverallResult(null);
    const startTime = performance.now();
    const results = {};
    let hasFailure = false;
    let hasWarning = false;
    const TEST_ROOM = 'nx-preflight';

    try {
      // 1) ENV CHECK: Verify LiveKit credentials are available
      updateCheck('env_check', 'running', 'Verifying...', '');
      try {
        const liveKitUrl = process.env.REACT_APP_LIVEKIT_URL || window.LIVEKIT_URL;
        const liveKitApiKey = process.env.REACT_APP_LIVEKIT_API_KEY;
        const liveKitApiSecret = process.env.REACT_APP_LIVEKIT_API_SECRET;

        if (!liveKitUrl) throw new Error('LiveKit URL not configured');
        if (!liveKitApiKey) throw new Error('LiveKit API key not set');
        if (!liveKitApiSecret) throw new Error('LiveKit API secret not set');

        updateCheck('env_check', 'pass', 'Ready', 'Credentials available');
        results.env_check = { status: 'pass', detail: `URL: ${new URL(liveKitUrl).hostname}` };
      } catch (err) {
        updateCheck('env_check', 'fail', 'Failed', err.message);
        results.env_check = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 2) TOKEN MINT: Generate token for test room
      updateCheck('token_mint', 'running', 'Minting...', '');
      let token = null;
      try {
        const tokenResponse = await base44.functions.invoke('generateLiveKitToken', {
          roomName: TEST_ROOM,
          userIdentity: `admin-preflight-${Date.now()}`
        });

        if (!tokenResponse.data?.ok || !tokenResponse.data?.data?.token) {
          throw new Error(tokenResponse.data?.message || 'No token returned');
        }

        token = tokenResponse.data.data.token;
        const tokenPreview = token.substring(0, 20) + '...';
        updateCheck('token_mint', 'pass', 'Minted', tokenPreview);
        results.token_mint = { status: 'pass', detail: tokenPreview };
      } catch (err) {
        updateCheck('token_mint', 'fail', 'Failed', err.message);
        results.token_mint = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 3) ROOM STATUS: Check LiveKit room status
      updateCheck('room_status', 'running', 'Checking...', '');
      try {
        const statusResponse = await base44.functions.invoke('getLiveKitRoomStatus', {
          rooms: [TEST_ROOM]
        });

        if (!statusResponse.data?.ok) {
          throw new Error(statusResponse.data?.message || 'Status check failed');
        }

        const roomData = statusResponse.data?.data?.[0];
        const participantCount = roomData?.num_participants || 0;
        updateCheck('room_status', 'pass', 'OK', `${participantCount} participant(s)`);
        results.room_status = { status: 'pass', detail: roomData };
      } catch (err) {
        updateCheck('room_status', 'fail', 'Failed', err.message);
        results.room_status = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 4) CLIENT CONNECT: Attempt real client connection
      updateCheck('client_connect', 'running', 'Connecting...', '');
      if (token && !hasFailure) {
        try {
          const liveKitUrl = process.env.REACT_APP_LIVEKIT_URL || window.LIVEKIT_URL;
          
          const room = await connect(liveKitUrl, token, {
            autoSubscribe: false,
            simulateParticipants: 0,
            dynacast: true
          });

          await room.disconnect();
          updateCheck('client_connect', 'pass', 'OK', 'Connected & disconnected');
          results.client_connect = { status: 'pass', detail: 'Real client connection successful' };
        } catch (err) {
          updateCheck('client_connect', 'fail', 'Failed', err.message);
          results.client_connect = { status: 'fail', detail: err.message };
          hasFailure = true;
        }
      } else {
        updateCheck('client_connect', 'warn', 'Skipped', 'Dependency failed');
        results.client_connect = { status: 'warn', detail: 'Skipped due to earlier failure' };
        hasWarning = true;
      }

      // Determine overall result
      const overallStatus = hasFailure ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';
      setOverallResult(overallStatus);

      // Log to AdminAuditLog
      const duration = performance.now() - startTime;
      await base44.entities.AdminAuditLog.create({
        step_name: 'comms_preflight',
        action: 'run_smoke_test',
        status: overallStatus.toLowerCase(),
        duration_ms: Math.round(duration),
        params: { test_type: 'comms_smoke' },
        results: results,
        executed_by: user?.id || 'system',
        executed_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Preflight check error:', err);
      setOverallResult('FAIL');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3 p-3 border border-zinc-800 bg-zinc-950/50"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Comms Preflight</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Smoke test before go-live</p>
        </div>
        <Button
          onClick={runPreflightCheck}
          disabled={isRunning}
          size="sm"
          className="gap-2 text-xs font-bold"
        >
          <Play className="w-3 h-3" />
          {isRunning ? 'Testing...' : 'Run Test'}
        </Button>
      </div>

      {/* Overall Status Badge */}
      <AnimatePresence>
        {overallResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`p-2.5 border text-center ${
              overallResult === 'PASS'
                ? 'bg-emerald-950/40 border-emerald-700/50'
                : overallResult === 'WARN'
                ? 'bg-yellow-950/40 border-yellow-700/50'
                : 'bg-red-950/40 border-red-700/50'
            }`}
          >
            <div className={`text-sm font-black uppercase ${
              overallResult === 'PASS'
                ? 'text-emerald-300'
                : overallResult === 'WARN'
                ? 'text-yellow-300'
                : 'text-red-300'
            }`}>
              {overallResult}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check Items */}
      <div className="space-y-1">
        <CheckItem
          label="Env Readiness"
          status={checks.env_check.status}
          message={checks.env_check.message}
          detail={checks.env_check.detail}
        />
        <CheckItem
          label="Token Mint"
          status={checks.token_mint.status}
          message={checks.token_mint.message}
          detail={checks.token_mint.detail}
        />
        <CheckItem
          label="Room Status"
          status={checks.room_status.status}
          message={checks.room_status.message}
          detail={checks.room_status.detail}
        />
        <CheckItem
          label="Client Connect (Real)"
          status={checks.client_connect.status}
          message={checks.client_connect.message}
          detail={checks.client_connect.detail}
        />
      </div>

      <p className="text-[9px] text-zinc-600 border-t border-zinc-800 pt-2">
        Tests: env → token → room status → real client connect. One click = LIVE works or LIVE fails.
      </p>
    </motion.div>
  );
}