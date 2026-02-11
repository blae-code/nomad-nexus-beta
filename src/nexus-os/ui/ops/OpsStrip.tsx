import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import { alignRSVPPolicyToPosture, computeRosterSummary, getOrCreateRSVPPolicy } from '../../services/rsvpService';
import {
  createOperation,
  getFocusOperationId,
  joinOperation,
  listOperationsForUser,
  setFocusOperation,
  setPosture,
  subscribeOperations,
  updateStatus,
} from '../../services/operationService';
import { listAssumptions } from '../../services/planningService';
import type { Operation } from '../../schemas/opSchemas';
import { SkeletonTile } from '../components';
import { NexusBadge, NexusButton } from '../primitives';

interface OpsStripProps {
  actorId: string;
  onOpenOperationFocus?: () => void;
}

function postureTone(posture: Operation['posture']): 'active' | 'warning' {
  return posture === 'FOCUSED' ? 'active' : 'warning';
}

function statusTone(status: Operation['status']): 'ok' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'ok';
  if (status === 'PLANNING') return 'warning';
  return 'neutral';
}

export default function OpsStrip({ actorId, onOpenOperationFocus }: OpsStripProps) {
  useRenderProfiler('OpsStrip');
  const [opsVersion, setOpsVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [joinOpIdInput, setJoinOpIdInput] = useState('');
  const [postureInput, setPostureInput] = useState<Operation['posture']>('CASUAL');
  const [stripError, setStripError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeOperations(() => setOpsVersion((prev) => prev + 1));
    return unsubscribe;
  }, []);
  useEffect(() => {
    setIsLoading(true);
    const handle = requestAnimationFrame(() => setIsLoading(false));
    return () => cancelAnimationFrame(handle);
  }, [opsVersion, actorId]);

  const operations = useMemo(
    () => listOperationsForUser({ userId: actorId, includeArchived: false }),
    [actorId, opsVersion]
  );
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);

  const createNewOperation = () => {
    try {
      setStripError('');
      const op = createOperation({
        createdBy: actorId,
        name: nameInput.trim() || `Operation ${operations.length + 1}`,
        posture: postureInput,
        status: 'PLANNING',
        ao: { nodeId: 'system-stanton' },
      });
      getOrCreateRSVPPolicy(op.id, op.posture);
      setFocusOperation(actorId, op.id);
      setNameInput('');
    } catch (error: any) {
      setStripError(error?.message || 'Failed to create operation');
    }
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 space-y-2 nexus-panel-glow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">Ops Strip</h3>
          <NexusBadge tone="neutral">{operations.length} ops</NexusBadge>
        </div>
        <div className="flex items-center gap-2">
          <NexusButton size="sm" intent="subtle" onClick={onOpenOperationFocus}>
            Open Ops Focus
          </NexusButton>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={nameInput}
          onChange={(event) => setNameInput(event.target.value)}
          className="h-8 w-44 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="New operation name"
        />
        <select
          value={postureInput}
          onChange={(event) => setPostureInput(event.target.value as Operation['posture'])}
          className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          aria-label="Operation posture"
        >
          <option value="CASUAL">CASUAL</option>
          <option value="FOCUSED">FOCUSED</option>
        </select>
        <NexusButton size="sm" intent="primary" onClick={createNewOperation}>
          Create Op
        </NexusButton>
        <input
          value={joinOpIdInput}
          onChange={(event) => setJoinOpIdInput(event.target.value)}
          className="h-8 w-44 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="Join op by id"
        />
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => {
            try {
              setStripError('');
              const trimmed = joinOpIdInput.trim();
              if (!trimmed) return;
              joinOperation(trimmed, actorId);
              setFocusOperation(actorId, trimmed);
              setJoinOpIdInput('');
            } catch (error: any) {
              setStripError(error?.message || 'Join failed');
            }
          }}
        >
          Join
        </NexusButton>
      </div>

      {stripError ? (
        <div className="text-xs text-red-300 rounded border border-red-900/70 bg-red-950/35 px-2 py-1">
          {stripError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {isLoading ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : null}
        {operations.length === 0 ? (
          <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/45 px-2 py-2">
            No operations yet. Create one to start planning and rostering.
          </div>
        ) : null}

        {!isLoading ? operations.map((op) => {
          const roster = computeRosterSummary(op.id);
          const escalations = listAssumptions(op.id).filter((assumption) => assumption.status === 'CHALLENGED').length;
          const isFocus = focusOperationId === op.id;

          return (
            <div
              key={op.id}
              className={`rounded border px-2 py-2 space-y-2 ${
                isFocus ? 'border-orange-500/70 bg-zinc-900/85' : 'border-zinc-800 bg-zinc-900/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFocusOperation(actorId, op.id)}
                  className="text-left min-w-0"
                >
                  <div className="text-sm text-zinc-200 truncate">{op.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{op.id}</div>
                </button>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={postureTone(op.posture)}>{op.posture}</NexusBadge>
                  <NexusBadge tone={statusTone(op.status)}>{op.status}</NexusBadge>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                <span>Open seats: {roster.openSeats.reduce((sum, seat) => sum + seat.openQty, 0)}</span>
                <span>Hard: {roster.hardViolations}</span>
                <span>Escalations: {escalations}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => {
                    const nextPosture = op.posture === 'FOCUSED' ? 'CASUAL' : 'FOCUSED';
                    setPosture(op.id, nextPosture, actorId);
                    alignRSVPPolicyToPosture(op.id, nextPosture);
                  }}
                >
                  Toggle Posture
                </NexusButton>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() =>
                    updateStatus(
                      op.id,
                      op.status === 'PLANNING'
                        ? 'ACTIVE'
                        : op.status === 'ACTIVE'
                        ? 'WRAPPING'
                        : op.status === 'WRAPPING'
                        ? 'ARCHIVED'
                        : 'PLANNING',
                      actorId
                    )
                  }
                >
                  Cycle Status
                </NexusButton>
              </div>
            </div>
          );
        }) : null}
      </div>
    </section>
  );
}
