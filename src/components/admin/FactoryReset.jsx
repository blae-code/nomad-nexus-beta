/**
 * FactoryReset — Orchestrator for complete app data wipe
 * Provides safety rails: confirmation + typed phrase
 */

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { wipeAll, countAllDomains } from '@/components/services/dataRegistry';
import { useNotification } from '@/components/providers/NotificationContext';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { navigateToUrl } from '@/utils';

const STORAGE_KEYS_TO_CLEAR = [
  'nexus.shell.ui.state',
  'nexus.shell.sidePanelOpen',
  'nexus.shell.contextPanelOpen',
  'nexus.shell.commsDockOpen',
  'nexus.ops.activeEventId',
  'nexus.boot.completed',
  'nexus.audio.selectedDeviceId',
  'nexus.contextPanel.expanded',
];

export default function FactoryReset() {
  const [step, setStep] = useState('confirm'); // confirm | preflight | executing | done
  const [domainCounts, setDomainCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [resetProgress, setResetProgress] = useState('');
  const [preserveSeeded, setPreserveSeeded] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const { addNotification } = useNotification();
  const shellUI = useShellUI();

  const requiredPhrase = 'RESET ALL DATA';

  const handleInitiatePreflight = async () => {
    setLoadingCounts(true);
    try {
      const counts = await countAllDomains();
      setDomainCounts(counts);
      setStep('preflight');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to count domains',
        message: error.message,
      });
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleConfirmReset = async () => {
    if (confirmPhrase !== requiredPhrase) {
      addNotification({
        type: 'error',
        title: 'Confirmation failed',
        message: `Type "${requiredPhrase}" to confirm`,
      });
      return;
    }

    setStep('executing');
    setResetProgress('');

    try {
      // Wipe all domains
      setResetProgress('Wiping application data...');
      const wipeResult = await wipeAll({ preserveSeeded });

      // Clear localStorage
      setResetProgress('Clearing application state...');
      for (const key of STORAGE_KEYS_TO_CLEAR) {
        localStorage.removeItem(key);
      }

      // Attempt to log out user if auth available
      setResetProgress('Finalizing...');
      try {
        await window.base44?.auth?.logout?.();
      } catch {
        // Silent fail; user may not be authenticated
      }

      setResetResult({
        success: true,
        totalDeleted: wipeResult.totalDeleted,
        timestamp: new Date().toISOString(),
      });

      setStep('done');

      addNotification({
        type: 'success',
        title: 'Factory reset complete',
        message: 'App will reload in 3 seconds...',
      });

      // Reload after delay
      setTimeout(() => {
        navigateToUrl('/');
      }, 3000);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Reset failed',
        message: error.message,
      });
      setStep('preflight');
    }
  };

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-400 mb-2">Factory Reset</h3>
              <p className="text-sm text-zinc-400">
                This will permanently delete ALL application data, including users, events, channels, and messages.
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                All localStorage state will be cleared. The app will reload to a fresh state.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveSeeded}
              onChange={(e) => setPreserveSeeded(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-xs text-zinc-400">Preserve seeded demo data</span>
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep('preflight')}
            disabled={loadingCounts}
          >
            {loadingCounts ? 'Counting...' : 'Continue'}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preflight') {
    const totalRecords = Object.values(domainCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <h3 className="font-bold text-zinc-200 mb-3">Pre-Flight Summary</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
            {Object.entries(domainCounts)
              .filter(([_, count]) => count > 0)
              .map(([domain, count]) => (
                <div key={domain} className="flex justify-between text-zinc-400">
                  <span className="capitalize">{domain.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="font-mono text-zinc-300">{count}</span>
                </div>
              ))}
            {totalRecords === 0 && <div className="text-zinc-500">No records found</div>}
          </div>
        </div>

        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <h3 className="font-bold text-zinc-200 mb-2">Total Summary</h3>
          <div className="text-sm">
            <div className="text-zinc-400">
              <span className="font-mono text-red-400">{totalRecords}</span> records to delete
            </div>
            <div className="text-zinc-400">
              <span className="font-mono text-red-400">{STORAGE_KEYS_TO_CLEAR.length}</span> localStorage keys to clear
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded">
          <label className="block text-xs text-zinc-400 mb-2">Type to confirm:</label>
          <div className="font-mono text-sm text-orange-400 mb-2">"{requiredPhrase}"</div>
          <input
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={`Type: ${requiredPhrase}`}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm rounded font-mono"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setStep('confirm');
              setConfirmPhrase('');
            }}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirmReset}
            disabled={confirmPhrase !== requiredPhrase}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Execute Reset
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'executing') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-zinc-200">Executing...</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">{resetProgress}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-400 mb-2">Factory Reset Complete</h3>
              <div className="text-sm text-zinc-400 space-y-1">
                <div>
                  <span className="font-mono text-green-400">{resetResult?.totalDeleted}</span> records deleted
                </div>
                <div>App will reload momentarily...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
