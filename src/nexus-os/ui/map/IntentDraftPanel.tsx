import React from 'react';
import type { IntentDraft } from '../../schemas/intelSchemas';
import type { Operation } from '../../schemas/opSchemas';
import { NexusBadge, NexusButton } from '../primitives';

interface IntentDraftPanelProps {
  draft: IntentDraft | null;
  operations?: Operation[];
  focusOperationId?: string;
  onPatchPayload: (patch: Record<string, unknown>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function draftLabel(kind: IntentDraft['kind']): string {
  return kind
    .split('_')
    .map((token) => token[0] + token.slice(1).toLowerCase())
    .join(' ');
}

function isIntelDraft(kind: IntentDraft['kind']): boolean {
  return [
    'DROP_INTEL',
    'PLACE_MARKER',
    'ATTACH_INTEL',
    'ENDORSE_INTEL',
    'CHALLENGE_INTEL',
    'PROMOTE_INTEL',
    'LINK_INTEL_TO_OP',
    'RETIRE_INTEL',
  ].includes(kind);
}

export default function IntentDraftPanel({
  draft,
  operations = [],
  focusOperationId,
  onPatchPayload,
  onConfirm,
  onCancel,
}: IntentDraftPanelProps) {
  if (!draft || draft.status !== 'DRAFT') {
    return (
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 text-xs text-zinc-500">
        No active intent draft. Use node/intel/zone radial actions to create one.
      </section>
    );
  }

  const payload = draft.payload || {};
  const notes = String(payload.notes || '');
  const title = String(payload.title || '');
  const body = String(payload.body || '');
  const confidence = String(payload.confidence || 'MED').toUpperCase();
  const opIds = String(payload.opIds || payload.opId || '');
  const selectedOpId = String(payload.opId || payload.opIds || focusOperationId || '');
  const reason = String(payload.reason || '');
  const toStratum = String(payload.toStratum || 'SHARED_COMMONS');

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Intent Draft</h4>
          <p className="text-[11px] text-zinc-500">{draftLabel(draft.kind)}</p>
        </div>
        <NexusBadge tone={isIntelDraft(draft.kind) ? 'active' : 'warning'}>
          {isIntelDraft(draft.kind) ? 'Intel' : 'Event'}
        </NexusBadge>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-500 space-y-1">
        {draft.target.nodeId ? (
          <div className="flex items-center justify-between gap-2">
            <span>Node</span>
            <span className="text-zinc-300">{draft.target.nodeId}</span>
          </div>
        ) : null}
        {draft.target.intelId ? (
          <div className="flex items-center justify-between gap-2">
            <span>Intel</span>
            <span className="text-zinc-300">{draft.target.intelId}</span>
          </div>
        ) : null}
        {draft.target.zoneId ? (
          <div className="flex items-center justify-between gap-2">
            <span>Zone</span>
            <span className="text-zinc-300">{draft.target.zoneId}</span>
          </div>
        ) : null}
      </div>

      {['DROP_INTEL', 'PLACE_MARKER', 'ATTACH_INTEL'].includes(draft.kind) ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(event) => onPatchPayload({ title: event.target.value })}
            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Title"
          />
          <textarea
            value={body}
            onChange={(event) => onPatchPayload({ body: event.target.value })}
            className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            placeholder="Body / context"
          />
        </div>
      ) : null}

      {draft.kind === 'PROMOTE_INTEL' ? (
        <div className="grid grid-cols-1 gap-2">
          <select
            value={toStratum}
            onChange={(event) => onPatchPayload({ toStratum: event.target.value })}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Target stratum"
          >
            <option value="SHARED_COMMONS">SHARED_COMMONS</option>
            <option value="OPERATIONAL">OPERATIONAL</option>
            <option value="COMMAND_ASSESSED">COMMAND_ASSESSED</option>
          </select>
          <input
            value={reason}
            onChange={(event) => onPatchPayload({ reason: event.target.value })}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Promotion reason (required path)"
          />
        </div>
      ) : null}

      {draft.kind === 'LINK_INTEL_TO_OP' ? (
        <input
          value={opIds}
          onChange={(event) => onPatchPayload({ opIds: event.target.value })}
          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="Op IDs (comma-separated)"
        />
      ) : null}

      {operations.length > 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Draft Routing</span>
            <NexusButton
              size="sm"
              intent="subtle"
              onClick={() =>
                onPatchPayload({
                  opId: focusOperationId || '',
                  opIds: focusOperationId || '',
                })
              }
            >
              Apply Focus Op
            </NexusButton>
          </div>
          <select
            value={selectedOpId}
            onChange={(event) =>
              onPatchPayload({
                opId: event.target.value || '',
                opIds: event.target.value || '',
              })
            }
            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Apply to operation"
          >
            <option value="">No operation routing</option>
            {operations.map((operation) => (
              <option key={operation.id} value={operation.id}>
                {operation.name} ({operation.posture}/{operation.status})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <select
          value={confidence}
          onChange={(event) => onPatchPayload({ confidence: event.target.value })}
          className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          aria-label="Draft confidence"
        >
          <option value="LOW">LOW</option>
          <option value="MED">MED</option>
          <option value="HIGH">HIGH</option>
        </select>
        <input
          value={opIds}
          onChange={(event) => onPatchPayload({ opIds: event.target.value })}
          className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="Link op IDs"
        />
      </div>

      <textarea
        value={notes}
        onChange={(event) => onPatchPayload({ notes: event.target.value })}
        className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
        placeholder="Notes / confirmation context"
      />

      <div className="flex items-center gap-2">
        <NexusButton size="sm" intent="primary" onClick={onConfirm}>
          Confirm
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onCancel}>
          Cancel
        </NexusButton>
      </div>
    </section>
  );
}
