import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Download, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CommsModeToggle from '@/components/admin/CommsModeToggle';

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

  const exportResults = () => {
    if (!testResults) return;
    const report = {
      timestamp: new Date().toISOString(),
      mode,
      tests: testResults.tests,
      summary: {
        passed: testResults.tests.filter(t => t.status === 'success').length,
        failed: testResults.tests.filter(t => t.status === 'failure').length,
        total: testResults.tests.length
      }
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comms-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      {/* Global Comms Mode Toggle */}
      <CommsModeToggle user={user} />

      {/* Run tests button */}
      <Button
        size="sm"
        onClick={runCommsTest}
        disabled={loading}
        className="w-full gap-2 text-[10px] h-7 bg-[#ea580c]/80 hover:bg-[#ea580c]"
      >
        <Play className="w-3 h-3" />
        {loading ? 'Testing...' : 'Run Comms Smoke Test'}
      </Button>

      {/* Test results */}
      {testResults && (
        <div className="space-y-1.5 p-2 bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-mono text-zinc-500 uppercase">
              {testResults.tests.filter(t => t.status === 'success').length}/{testResults.tests.length} pass
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportResults}
              className="text-[8px] px-1 h-5 gap-1 text-zinc-400 hover:text-[#ea580c]"
            >
              <Download className="w-2.5 h-2.5" />
              Export
            </Button>
          </div>

          {testResults.tests.map((test, idx) => (
            <div
              key={idx}
              className={cn(
                'p-1.5 border text-[8px]',
                test.status === 'success'
                  ? 'bg-green-950/40 border-green-800/50'
                  : 'bg-red-950/40 border-red-800/50'
              )}
            >
              <div className="flex items-center gap-1.5">
                {test.status === 'success' ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                )}
                <span className="font-bold">{test.name}</span>
              </div>
              <p className={cn(
                'text-[7px] mt-0.5 ml-4.5',
                test.status === 'success' ? 'text-green-300' : 'text-red-300'
              )}>
                {test.details}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}