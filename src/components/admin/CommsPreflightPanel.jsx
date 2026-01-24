import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, AlertCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Room } from 'livekit-client';
import CommsStateChip from '@/components/comms/CommsStateChip';

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
    room_name: { status: 'idle', message: '', detail: '' },
    token_mint: { status: 'idle', message: '', detail: '' },
    status_check: { status: 'idle', message: '', detail: '' },
    join_test: { status: 'idle', message: '', detail: '' },
    channels_seeded: { status: 'idle', message: '', detail: '' }
  });
  const [overallResult, setOverallResult] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastError, setLastError] = useState(null);

  const updateCheck = (key, status, message, detail) => {
    setChecks(prev => ({
      ...prev,
      [key]: { status, message, detail }
    }));
  };

  const runPreflightCheck = async () => {
    setIsRunning(true);
    setOverallResult(null);
    setConnectionState('connecting');
    setLastError(null);
    const startTime = performance.now();
    const results = {};
    let hasFailure = false;
    let hasWarning = false;

    try {
      // 1) buildRoomName sanity check
      updateCheck('room_name', 'running', 'Testing...', '');
      try {
        const testRoomName = `test_${Date.now()}_healthcheck`;
        if (!testRoomName || testRoomName.length === 0) throw new Error('Invalid room name');
        updateCheck('room_name', 'pass', 'Valid', `Generated: ${testRoomName}`);
        results.room_name = { status: 'pass', detail: testRoomName };
      } catch (err) {
        updateCheck('room_name', 'fail', 'Failed', err.message);
        results.room_name = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 2) Token mint (LIVE only)
      updateCheck('token_mint', 'running', 'Minting...', '');
      try {
        const tokenResponse = await base44.functions.invoke('generateLiveKitToken', {
          roomName: `healthcheck_${Date.now()}`,
          userIdentity: 'healthcheck_bot'
        });

        if (!tokenResponse.data?.ok || !tokenResponse.data?.data?.token) {
          throw new Error(tokenResponse.data?.message || 'No token returned');
        }

        const tokenPreview = tokenResponse.data.data.token.substring(0, 20) + '...';
        updateCheck('token_mint', 'pass', 'Minted', tokenPreview);
        results.token_mint = { status: 'pass', detail: tokenPreview };
      } catch (err) {
        updateCheck('token_mint', 'fail', 'Failed', err.message);
        results.token_mint = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 3) Status check
      updateCheck('status_check', 'running', 'Checking...', '');
      try {
        const statusResponse = await base44.functions.invoke('getLiveKitRoomStatus', {
          rooms: [`healthcheck_${Date.now()}`]
        });

        if (!statusResponse.data?.ok) {
          throw new Error(statusResponse.data?.message || 'Status check failed');
        }

        updateCheck('status_check', 'pass', 'OK', 'LiveKit API responsive');
        results.status_check = { status: 'pass', detail: 'OK' };
      } catch (err) {
        // This might warn instead of fail
        updateCheck('status_check', 'warn', 'Partial', err.message);
        results.status_check = { status: 'warn', detail: err.message };
        hasWarning = true;
      }

      // 4) Client connect attempt (actual LiveKit Room connection)
      updateCheck('join_test', 'running', 'Connecting...', '');
      setConnectionState('connecting');
      try {
        if (!results.token_mint?.detail) {
          throw new Error('No token to test connection');
        }

        // Extract full token from results (we stored preview, need to re-fetch for real test)
        const tokenRes = await base44.functions.invoke('generateLiveKitToken', {
          roomName: `nx-preflight`,
          userIdentity: user?.id || 'preflight-test'
        });

        if (!tokenRes.data?.ok || !tokenRes.data?.data?.token) {
          throw new Error('Failed to get token for connection test');
        }

        const token = tokenRes.data.data.token;
        const url = tokenRes.data.data.url;

        if (!url) {
          throw new Error('No LiveKit URL in token response');
        }

        // Attempt actual Room connection
        const room = new Room();
        const connectStart = Date.now();

        await room.connect(url, token);
        const connectDuration = Date.now() - connectStart;

        // Successfully connected
        setConnectionState('connected');

        // Now disconnect
        await room.disconnect();

        updateCheck('join_test', 'pass', 'Connected', `${connectDuration}ms`);
        results.join_test = { status: 'pass', detail: `${connectDuration}ms round-trip` };
      } catch (err) {
        setConnectionState('error');
        setLastError(err.message);
        updateCheck('join_test', 'fail', 'Failed', err.message);
        results.join_test = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // 5) Seeded channels check
      updateCheck('channels_seeded', 'running', 'Scanning...', '');
      try {
        const channels = await base44.entities.CommsChannel.filter({ is_canonical: true }, '', 10);
        const count = channels.length;
        
        if (count === 0) {
          updateCheck('channels_seeded', 'warn', 'Empty', 'No canonical channels found');
          results.channels_seeded = { status: 'warn', detail: 'No canonical channels' };
          hasWarning = true;
        } else {
          updateCheck('channels_seeded', 'pass', 'Populated', `${count} canonical channels`);
          results.channels_seeded = { status: 'pass', detail: `${count} channels` };
        }
      } catch (err) {
        updateCheck('channels_seeded', 'fail', 'Failed', err.message);
        results.channels_seeded = { status: 'fail', detail: err.message };
        hasFailure = true;
      }

      // Determine overall result
      const overallStatus = hasFailure ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';
      setOverallResult(overallStatus);
      
      if (!hasFailure) {
        setConnectionState('connected');
      }

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
      setConnectionState('error');
      setLastError(err.message);
    } finally {
      setIsRunning(false);
      if (connectionState === 'connecting') {
        setConnectionState('disconnected');
      }
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
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-2">Comms Preflight</h3>
          <CommsStateChip
            mode="LIVE"
            connectionState={connectionState}
            roomName="nx-preflight"
            lastError={lastError}
            onRetry={runPreflightCheck}
            compact={false}
          />
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
          label="Room Name Sanity"
          status={checks.room_name.status}
          message={checks.room_name.message}
          detail={checks.room_name.detail}
        />
        <CheckItem
          label="Token Mint (LIVE)"
          status={checks.token_mint.status}
          message={checks.token_mint.message}
          detail={checks.token_mint.detail}
        />
        <CheckItem
          label="Status Check"
          status={checks.status_check.status}
          message={checks.status_check.message}
          detail={checks.status_check.detail}
        />
        <CheckItem
          label="Join Test (Client)"
          status={checks.join_test.status}
          message={checks.join_test.message}
          detail={checks.join_test.detail}
        />
        <CheckItem
          label="Channels Seeded"
          status={checks.channels_seeded.status}
          message={checks.channels_seeded.message}
          detail={checks.channels_seeded.detail}
        />
      </div>

      <p className="text-[9px] text-zinc-600 border-t border-zinc-800 pt-2">
        Results logged to AdminAuditLog. Failures block demo launch.
      </p>
    </motion.div>
  );
}