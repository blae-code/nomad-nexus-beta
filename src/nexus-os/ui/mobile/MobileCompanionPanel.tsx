import React from 'react';
import { PanelLoadingState } from '../loading';
import { DegradedStateCard, NexusBadge, NexusButton, RustPulseIndicator } from '../primitives';
import { resolveAvailabilityState, availabilityLabel, availabilityTone } from '../state';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import { useMobileCompanionRuntime } from './useMobileCompanionRuntime';

interface MobileCompanionPanelProps extends Partial<CqbPanelSharedProps> {
  onOpenMobileCompanion?: () => void;
}

function boolTone(active: boolean) {
  return active ? 'ok' : 'neutral';
}

export default function MobileCompanionPanel({
  actorId = 'mobile-operator',
  opId,
  events = [],
  onOpenMobileCompanion,
}: MobileCompanionPanelProps) {
  const runtime = useMobileCompanionRuntime(actorId, opId);
  const cqbPulse = events.filter((event) => Date.now() - new Date(event.createdAt).getTime() <= 20000).length;

  const availability = resolveAvailabilityState({
    loading: runtime.serviceWorkerState === 'idle',
    count: runtime.online ? 1 : 0,
    staleCount: runtime.locationTracking ? 0 : 1,
    hasConflict: runtime.serviceWorkerState === 'error',
  });

  if (runtime.serviceWorkerState === 'idle') {
    return <PanelLoadingState label="Initializing mobile companion..." />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <NexusBadge tone={availabilityTone(availability)}>{availabilityLabel(availability)}</NexusBadge>
        <RustPulseIndicator active={cqbPulse > 0} label={`${cqbPulse} pulse/20s`} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Network</div>
          <NexusBadge tone={boolTone(runtime.online)}>{runtime.online ? 'Online' : 'Offline'}</NexusBadge>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">SW</div>
          <NexusBadge tone={runtime.serviceWorkerState === 'ready' ? 'ok' : runtime.serviceWorkerState === 'error' ? 'danger' : 'neutral'}>
            {runtime.serviceWorkerState.toUpperCase()}
          </NexusBadge>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Push</div>
          <NexusBadge tone={runtime.pushEnabled ? 'ok' : 'warning'}>
            {runtime.pushEnabled ? 'Enabled' : String(runtime.pushPermission).toUpperCase()}
          </NexusBadge>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">GPS Share</div>
          <NexusBadge tone={runtime.locationTracking ? 'ok' : 'neutral'}>
            {runtime.locationTracking ? 'Live' : 'Idle'}
          </NexusBadge>
        </div>
      </div>

      {runtime.serviceWorkerState === 'error' ? (
        <DegradedStateCard
          state="EXPERIMENTAL"
          title="Service worker unavailable"
          reason={runtime.serviceWorkerError || 'PWA support could not initialize on this browser.'}
        />
      ) : null}

      {runtime.locationError ? (
        <DegradedStateCard state="LOCKED" title="Location tracking blocked" reason={runtime.locationError} />
      ) : null}

      <div className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-[11px] text-zinc-400">
        Beacons {runtime.beaconCount} · Anchors {runtime.anchorCount} · AR markers {runtime.arMarkers.length}
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <NexusButton size="sm" intent="subtle" onClick={runtime.enablePush}>
            Enable Push
          </NexusButton>
          {runtime.installAvailable ? (
            <NexusButton size="sm" intent="subtle" onClick={runtime.requestInstall}>
              Install App
            </NexusButton>
          ) : null}
          <NexusButton
            size="sm"
            intent={runtime.locationTracking ? 'danger' : 'primary'}
            onClick={runtime.locationTracking ? runtime.stopLocationTracking : runtime.startLocationTracking}
          >
            {runtime.locationTracking ? 'Stop GPS Share' : 'Start GPS Share'}
          </NexusButton>
        </div>
        <NexusButton size="sm" intent="primary" onClick={onOpenMobileCompanion}>
          Open AR Companion
        </NexusButton>
      </div>
    </div>
  );
}

