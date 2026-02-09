import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import { useMobileCompanionRuntime } from './useMobileCompanionRuntime';

interface MobileArCompanionFocusAppProps extends Partial<CqbPanelSharedProps> {
  onClose?: () => void;
}

function markerTone(confidence: number) {
  if (confidence >= 0.75) return 'ok';
  if (confidence >= 0.5) return 'warning';
  return 'danger';
}

export default function MobileArCompanionFocusApp({
  actorId = 'mobile-operator',
  opId,
  onClose,
}: MobileArCompanionFocusAppProps) {
  const runtime = useMobileCompanionRuntime(actorId, opId);
  const [arEnabled, setArEnabled] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [anchorLabel, setAnchorLabel] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sortedMarkers = useMemo(() => {
    return [...runtime.arMarkers].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 10);
  }, [runtime.arMarkers]);

  useEffect(() => {
    if (!arEnabled) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported on this device.');
      return;
    }
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            setCameraError('Unable to start camera playback.');
          });
        }
      })
      .catch((error) => {
        setCameraError(String(error?.message || error));
      });

    return () => {
      mounted = false;
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [arEnabled]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Mobile AR Companion</h3>
          <p className="text-xs text-zinc-500">
            Training/field overlay assistant. Always verify with comms and map; no omniscient telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NexusBadge tone={runtime.online ? 'ok' : 'warning'}>{runtime.online ? 'ONLINE' : 'OFFLINE'}</NexusBadge>
          {onClose ? (
            <NexusButton size="sm" intent="subtle" onClick={onClose}>
              Return
            </NexusButton>
          ) : null}
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/45 px-3 py-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">
          <div className="text-zinc-500">GPS Share</div>
          <NexusBadge tone={runtime.locationTracking ? 'ok' : 'neutral'}>{runtime.locationTracking ? 'Live' : 'Idle'}</NexusBadge>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">
          <div className="text-zinc-500">Heading</div>
          <div className="text-zinc-200">{Number.isFinite(runtime.headingDeg) ? `${Math.round(runtime.headingDeg || 0)}°` : 'N/A'}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">
          <div className="text-zinc-500">Markers</div>
          <div className="text-zinc-200">{runtime.arMarkers.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">
          <div className="text-zinc-500">Beacons</div>
          <div className="text-zinc-200">{runtime.beaconCount}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">
          <div className="text-zinc-500">Anchors</div>
          <div className="text-zinc-200">{runtime.anchorCount}</div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/45 p-3 flex items-center gap-2 flex-wrap">
        <NexusButton
          size="sm"
          intent={runtime.locationTracking ? 'danger' : 'primary'}
          onClick={runtime.locationTracking ? runtime.stopLocationTracking : runtime.startLocationTracking}
        >
          {runtime.locationTracking ? 'Stop GPS Share' : 'Start GPS Share'}
        </NexusButton>
        <NexusButton size="sm" intent={arEnabled ? 'danger' : 'subtle'} onClick={() => setArEnabled((prev) => !prev)}>
          {arEnabled ? 'Disable AR Camera' : 'Enable AR Camera'}
        </NexusButton>
        <input
          className="h-8 min-w-[180px] rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          value={anchorLabel}
          onChange={(event) => setAnchorLabel(event.target.value)}
          placeholder="Anchor label"
        />
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => {
            runtime.dropAnchorAtCurrent(anchorLabel || 'Field Marker');
            setAnchorLabel('');
          }}
          disabled={!runtime.currentPosition}
        >
          Drop Anchor
        </NexusButton>
      </section>

      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 overflow-hidden">
        <div className="relative rounded border border-zinc-800 bg-black/70 overflow-hidden min-h-[260px]">
          {arEnabled ? (
            <>
              <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 pointer-events-none">
                {sortedMarkers.map((marker, index) => {
                  const y = 18 + (index % 5) * 14;
                  return (
                    <div
                      key={marker.id}
                      className="absolute -translate-x-1/2"
                      style={{ left: `${marker.screenX}%`, top: `${y}%` }}
                    >
                      <div className="rounded border border-orange-500/45 bg-zinc-950/80 px-2 py-1 text-[11px] text-zinc-100 whitespace-nowrap">
                        <span className="font-semibold">{marker.label}</span>
                        <span className="text-zinc-400 ml-1">{marker.distanceMeters}m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-zinc-500">
              AR camera disabled. Enable AR for overlay rendering.
            </div>
          )}
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 overflow-auto space-y-2">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Marker List</div>
          {sortedMarkers.length === 0 ? (
            <DegradedStateCard
              state="OFFLINE"
              title="No AR markers available"
              reason="Start GPS sharing or drop manual anchors to populate overlays."
            />
          ) : (
            sortedMarkers.map((marker) => (
              <div key={marker.id} className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200">{marker.label}</span>
                  <NexusBadge tone={markerTone(marker.confidence)}>{Math.round(marker.confidence * 100)}%</NexusBadge>
                </div>
                <div className="text-zinc-500">
                  {marker.source} · {marker.distanceMeters}m · bearing {Math.round(marker.bearingDeg)}°
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {cameraError || runtime.locationError ? (
        <DegradedStateCard
          state="LOCKED"
          title="Mobile sensor permissions required"
          reason={cameraError || runtime.locationError || 'Camera and location permissions are needed for AR overlays.'}
        />
      ) : null}
    </div>
  );
}

