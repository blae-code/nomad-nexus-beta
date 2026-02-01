/**
 * DiagnosticsBundle — Comprehensive system snapshot
 */

import React, { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { countAllDomains } from '@/components/services/dataRegistry';
import { useAuth } from '@/components/providers/AuthProvider';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useNotification } from '@/components/providers/NotificationContext';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { APP_VERSION, APP_BUILD_PHASE, APP_BUILD_DATE } from '@/components/constants/appVersion';

export default function DiagnosticsBundle() {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const shellUI = useShellUI();
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();
  const { addNotification } = useNotification();

  const generateBundle = async () => {
    setLoading(true);

    try {
      const counts = await countAllDomains();

      const bundle = {
        timestamp: new Date().toISOString(),
        build: {
          version: APP_VERSION,
          phase: APP_BUILD_PHASE,
          date: APP_BUILD_DATE,
        },
        user: {
          id: user?.id,
          email: user?.email,
          callsign: user?.callsign,
          rank: user?.rank,
          membership: user?.membership,
        },
        shellUI: {
          sidePanelOpen: shellUI.isSidePanelOpen,
          contextPanelOpen: shellUI.isContextPanelOpen,
          commsDockOpen: shellUI.isCommsDockOpen,
          dockMode: shellUI.dockMode,
          dockMinimized: shellUI.dockMinimized,
        },
        voice: {
          activeNetId: voiceNet.activeNetId,
          connectionState: voiceNet.connectionState,
          participants: voiceNet.participants.length,
          micEnabled: voiceNet.micEnabled,
          pttActive: voiceNet.pttActive,
          error: voiceNet.error,
        },
        activeOp: {
          eventId: activeOp.activeEventId,
          eventTitle: activeOp.activeEvent?.title,
          participants: activeOp.participants.length,
          voiceNetBinding: activeOp.binding?.voiceNetId,
          commsChannelBinding: activeOp.binding?.commsChannelId,
        },
        localStorage: {
          keys: Object.keys(localStorage)
            .filter((k) => k.startsWith('nexus.'))
            .reduce((acc, key) => {
              acc[key] = typeof localStorage.getItem(key);
              return acc;
            }, {}),
        },
        dataDomains: counts,
        totalRecords: Object.values(counts).reduce((a, b) => a + b, 0),
      };

      setBundle(bundle);

      addNotification({
        type: 'success',
        title: 'Bundle generated',
        message: 'Ready to copy or export',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bundle generation failed',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    const text = generateBundleText(bundle);
    navigator.clipboard.writeText(text);
    addNotification({
      type: 'success',
      title: 'Copied',
      message: 'Diagnostics copied to clipboard',
    });
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    addNotification({
      type: 'success',
      title: 'Copied',
      message: 'JSON copied to clipboard',
    });
  };

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(bundle, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-diagnostics-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!bundle) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <h3 className="font-bold text-zinc-200 mb-2">Diagnostics Bundle</h3>
          <p className="text-sm text-zinc-400">
            Generate a comprehensive snapshot of system state, build info, user data, and domain counts.
          </p>
        </div>

        <Button
          onClick={generateBundle}
          disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500"
        >
          {loading ? 'Generating...' : 'Generate Bundle'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded">
        <h3 className="font-bold text-cyan-400 mb-3">Bundle Summary</h3>
        <div className="text-xs text-zinc-400 space-y-1">
          <div>Build: <span className="text-zinc-300">{bundle.build.version}</span></div>
          <div>User: <span className="text-zinc-300">{bundle.user.callsign || 'Unknown'}</span></div>
          <div>Total Records: <span className="text-zinc-300">{bundle.totalRecords}</span></div>
          <div>Generated: <span className="text-zinc-300 font-mono">{new Date(bundle.timestamp).toLocaleString()}</span></div>
        </div>
      </div>

      {/* Domain Counts */}
      <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded max-h-48 overflow-y-auto">
        <h3 className="font-bold text-zinc-200 mb-2 sticky top-0 bg-zinc-800/30">Data Domains</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(bundle.dataDomains)
            .filter(([_, count]) => count > 0)
            .map(([domain, count]) => (
              <div key={domain} className="flex justify-between text-zinc-400">
                <span className="capitalize">{domain.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="font-mono text-zinc-300">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="flex-1 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJSON}
            className="flex-1 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy JSON
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadJSON}
          className="w-full text-xs"
        >
          <Download className="w-3 h-3 mr-1" />
          Download JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBundle(null)}
          className="w-full text-xs"
        >
          Back
        </Button>
      </div>
    </div>
  );
}

function generateBundleText(bundle) {
  return `NEXUS DIAGNOSTICS BUNDLE
Generated: ${new Date(bundle.timestamp).toISOString()}

BUILD INFO
Version: ${bundle.build.version}
Phase: ${bundle.build.phase}
Date: ${bundle.build.date}

USER
Callsign: ${bundle.user.callsign || 'Unknown'}
Rank: ${bundle.user.rank || 'Unknown'}
Membership: ${bundle.user.membership || 'Unknown'}

SHELL UI
Side Panel: ${bundle.shellUI.sidePanelOpen ? 'Open' : 'Closed'}
Context Panel: ${bundle.shellUI.contextPanelOpen ? 'Open' : 'Closed'}
Comms Dock: ${bundle.shellUI.commsDockOpen ? 'Open' : 'Closed'}
Dock Mode: ${bundle.shellUI.dockMode}
Dock Minimized: ${bundle.shellUI.dockMinimized ? 'Yes' : 'No'}

VOICE
Active Net: ${bundle.voice.activeNetId || 'None'}
Connection: ${bundle.voice.connectionState}
Participants: ${bundle.voice.participants}
Mic: ${bundle.voice.micEnabled ? 'On' : 'Off'}
PTT: ${bundle.voice.pttActive ? 'Active' : 'Ready'}
${bundle.voice.error ? `Error: ${bundle.voice.error}` : ''}

ACTIVE OPERATION
Op ID: ${bundle.activeOp.eventId || 'None'}
Title: ${bundle.activeOp.eventTitle || 'None'}
Participants: ${bundle.activeOp.participants}
Voice Net: ${bundle.activeOp.voiceNetBinding || 'None'}
Comms Channel: ${bundle.activeOp.commsChannelBinding || 'None'}

DATA SUMMARY
Total Records: ${bundle.totalRecords}
${Object.entries(bundle.dataDomains)
  .filter(([_, count]) => count > 0)
  .map(([domain, count]) => `${domain}: ${count}`)
  .join('\n')}

END BUNDLE`;
}