import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommsTestStep({ user, onAudit }) {
  const [mode, setMode] = useState('SIM');
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveKitConnected, setLiveKitConnected] = useState(false);

  const runCommsTest = async () => {
    const startTime = Date.now();
    setLoading(true);
    const results = { tests: [] };

    try {
      // Test 1: Generate token for healthcheck net
      try {
        const tokenRes = await base44.functions.invoke('generateLiveKitToken', {
          eventId: 'nn_healthcheck',
          netIds: ['nn_healthcheck']
        });
        results.tests.push({
          name: 'Generate Token',
          status: tokenRes.data?.token ? 'success' : 'failure',
          details: tokenRes.data?.token ? 'Token generated' : 'No token'
        });
      } catch (err) {
        results.tests.push({
          name: 'Generate Token',
          status: 'failure',
          details: err.message
        });
      }

      // Test 2: Room status (if infrastructure available)
      try {
        const statusRes = await base44.functions.invoke('getLiveKitRoomStatus', {
          rooms: ['nn_healthcheck']
        });
        results.tests.push({
          name: 'Room Status',
          status: statusRes.data ? 'success' : 'failure',
          details: statusRes.data ? `${statusRes.data.num_participants || 0} participants` : 'No data'
        });
      } catch (err) {
        results.tests.push({
          name: 'Room Status',
          status: 'failure',
          details: err.message
        });
      }

      const duration = Date.now() - startTime;
      const allPass = results.tests.every(t => t.status === 'success');

      setTestResults(results);

      await onAudit(
        'comms_test',
        `Run ${mode} mode tests`,
        allPass ? 'success' : 'warning',
        duration,
        { mode },
        { tests_passed: results.tests.filter(t => t.status === 'success').length, total: results.tests.length },
        null
      );

      if (allPass) {
        toast.success('All comms tests passed');
      } else {
        toast.warning('Some tests failed or errored');
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'comms_test',
        `Run ${mode} mode tests`,
        'failure',
        duration,
        { mode },
        {},
        err.message
      );
      toast.error('Comms test error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded border border-zinc-800">
        <button
          onClick={() => setMode('SIM')}
          className={cn(
            'px-2 py-1 text-[9px] font-bold rounded transition-colors',
            mode === 'SIM'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
              : 'bg-zinc-800 text-zinc-500'
          )}
        >
          SIM (Test)
        </button>
        <button
          onClick={() => setMode('LIVE')}
          className={cn(
            'px-2 py-1 text-[9px] font-bold rounded transition-colors',
            mode === 'LIVE'
              ? 'bg-red-900/30 text-red-400 border border-red-700/50'
              : 'bg-zinc-800 text-zinc-500'
          )}
        >
          LIVE
        </button>
      </div>

      {/* Run tests button */}
      <Button
        size="sm"
        onClick={runCommsTest}
        disabled={loading}
        className="w-full gap-2 text-[10px] h-7"
      >
        <Radio className="w-3 h-3" />
        {loading ? 'Testing...' : `Run ${mode} Tests`}
      </Button>

      {/* Test results */}
      {testResults && (
        <div className="space-y-1">
          {testResults.tests.map((test, idx) => (
            <div
              key={idx}
              className={cn(
                'p-2 border rounded text-[9px]',
                test.status === 'success'
                  ? 'bg-green-900/20 border-green-700/30'
                  : 'bg-red-900/20 border-red-700/30'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {test.status === 'success' ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="font-bold">{test.name}</span>
              </div>
              <p className={test.status === 'success' ? 'text-green-300' : 'text-red-300'}>
                {test.details}
              </p>
            </div>
          ))}
        </div>
      )}

      {mode === 'LIVE' && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-[9px] h-6 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20"
        >
          Join Healthcheck Room
        </Button>
      )}
    </div>
  );
}