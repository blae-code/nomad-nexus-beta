import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import type { MapCommandAlert, MapMacroRecommendation, TacticalMacroId } from '../../services/mapCommandSurfaceService';

interface MapActionQueueProps {
  recommendations: MapMacroRecommendation[];
  alerts: MapCommandAlert[];
  busyMacroId: TacticalMacroId | null;
  executionMessage: string | null;
  executionError: string | null;
  onExecuteMacro: (macroId: TacticalMacroId) => void;
}

const MACRO_LABEL: Record<TacticalMacroId, string> = {
  ISSUE_CRITICAL_CALLOUT: 'Issue Critical Callout',
  PRIORITY_OVERRIDE: 'Priority Override',
  LOCK_COMMAND_DISCIPLINE: 'Lock Command Discipline',
  ENABLE_SECURE_NET: 'Enable Secure Net',
  REQUEST_SITREP_BURST: 'Request SITREP Burst',
};

export default function MapActionQueue({
  recommendations,
  alerts,
  busyMacroId,
  executionMessage,
  executionError,
  onExecuteMacro,
}: MapActionQueueProps) {
  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Command Actions</h4>
        <NexusBadge tone={alerts.some((alert) => alert.level === 'HIGH') ? 'danger' : alerts.length > 0 ? 'warning' : 'ok'}>
          {alerts.length} alerts
        </NexusBadge>
      </div>
      {alerts.slice(0, 4).map((alert) => (
        <div key={alert.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-200 truncate">{alert.title}</span>
            <NexusBadge tone={alert.level === 'HIGH' ? 'danger' : alert.level === 'MED' ? 'warning' : 'neutral'}>
              {alert.level}
            </NexusBadge>
          </div>
          <div className="mt-1 text-zinc-400">{alert.detail}</div>
        </div>
      ))}
      <div className="space-y-1.5">
        {recommendations.map((recommendation) => {
          const isBusy = busyMacroId === recommendation.macroId;
          return (
            <div key={recommendation.macroId} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-zinc-200">{MACRO_LABEL[recommendation.macroId]}</div>
                <NexusBadge tone={recommendation.priority === 'NOW' ? 'danger' : recommendation.priority === 'NEXT' ? 'warning' : 'neutral'}>
                  {recommendation.priority}
                </NexusBadge>
              </div>
              <div className="mt-1 text-zinc-500">{recommendation.rationale}</div>
              <div className="mt-2">
                <NexusButton
                  size="sm"
                  intent={recommendation.priority === 'NOW' ? 'primary' : 'subtle'}
                  onClick={() => onExecuteMacro(recommendation.macroId)}
                  disabled={Boolean(busyMacroId)}
                >
                  {isBusy ? 'Executing...' : 'Execute'}
                </NexusButton>
              </div>
            </div>
          );
        })}
      </div>
      {executionMessage ? (
        <div className="rounded border border-emerald-900/70 bg-emerald-950/35 px-2 py-1 text-[11px] text-emerald-200">{executionMessage}</div>
      ) : null}
      {executionError ? (
        <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-[11px] text-red-300">{executionError}</div>
      ) : null}
    </section>
  );
}
