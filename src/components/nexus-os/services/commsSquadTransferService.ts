import { base44 } from '../../../api/base44Client';

type EntityClient = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
  create?: (...args: unknown[]) => Promise<unknown>;
  update?: (...args: unknown[]) => Promise<unknown>;
  delete?: (...args: unknown[]) => Promise<unknown>;
};

type OperationRecord =
  | { type: 'create'; entity: EntityClient; row: Record<string, unknown> }
  | { type: 'update'; entity: EntityClient; rowId: string; previous: Record<string, unknown> }
  | { type: 'deactivate'; entity: EntityClient; rowId: string; previousStatus: unknown };

export interface SquadTransferMutationInput {
  memberIds: string[];
  sourceSquadId: string;
  destinationSquadId: string;
  sourceChannelId: string;
  destinationChannelId: string;
  sourceSquadLabel?: string;
  destinationSquadLabel?: string;
  actorId?: string;
}

export interface TransferMutationResult {
  success: boolean;
  movedMemberIds: string[];
  warnings: string[];
  error?: string;
  rolledBack: boolean;
}

const CHANNEL_MEMBERSHIP_ENTITY_CANDIDATES = ['ChannelMembership', 'ChannelMember', 'CommsChannelMember'] as const;

function text(value: unknown): string {
  return String(value || '').trim();
}

function token(value: unknown): string {
  return text(value).toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => text(value)).filter(Boolean))];
}

function entityClient(entityName: string): EntityClient | null {
  const entities = (base44 as any)?.entities;
  const candidate = entities?.[entityName];
  return candidate && typeof candidate === 'object' ? (candidate as EntityClient) : null;
}

async function listRows(entity: EntityClient, limit = 600): Promise<Record<string, unknown>[]> {
  const attempts = [
    () => entity.list?.('-created_date', limit),
    () => entity.list?.(undefined, limit),
    () => entity.list?.({ limit }),
    () => entity.filter?.({}, '-created_date', limit),
  ];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const rows = await attempt();
      if (Array.isArray(rows)) return rows as Record<string, unknown>[];
    } catch {
      // Keep trying compatible signatures.
    }
  }
  return [];
}

async function filterRows(entity: EntityClient, filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const attempts = [
    () => entity.filter?.(filters, '-created_date', 300),
    () => entity.filter?.(filters, 300),
    () => entity.filter?.(filters),
  ];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const rows = await attempt();
      if (Array.isArray(rows)) return rows as Record<string, unknown>[];
    } catch {
      // Keep trying compatible signatures.
    }
  }
  return [];
}

async function createRow(entity: EntityClient, payloads: Array<Record<string, unknown>>): Promise<Record<string, unknown>> {
  if (!entity.create) throw new Error('Entity create() unavailable');
  let lastError: unknown = null;
  for (const payload of payloads) {
    try {
      const row = await entity.create(payload);
      if (row && typeof row === 'object') return row as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error((lastError as any)?.message || 'Create failed');
}

async function updateRow(entity: EntityClient, rowId: string, payload: Record<string, unknown>) {
  if (!entity.update) throw new Error('Entity update() unavailable');
  await entity.update(rowId, payload);
}

async function deactivateRow(entity: EntityClient, row: Record<string, unknown>) {
  const rowId = text(row.id);
  if (!rowId) return;
  await updateRow(entity, rowId, { status: 'inactive' });
}

function rowMemberId(row: Record<string, unknown>): string {
  return text(row.member_profile_id || row.memberId || row.user_id || row.userId);
}

function rowSquadId(row: Record<string, unknown>): string {
  return text(row.squad_id || row.squadId);
}

function rowChannelId(row: Record<string, unknown>): string {
  return text(row.channel_id || row.channelId || row.comms_channel_id || row.commsChannelId);
}

function isRowActive(row: Record<string, unknown>): boolean {
  const status = token(row.status || 'active');
  if (!status) return true;
  return status !== 'inactive' && status !== 'removed' && status !== 'disabled';
}

function resolveSquadEntityId(rows: Record<string, unknown>[], squadId: string, squadLabel = ''): string {
  const idToken = token(squadId);
  const labelToken = token(squadLabel);
  const suffixToken = token((squadId.includes(':') ? squadId.split(':').slice(1).join(':') : squadId).replace(/^squad\s+/i, ''));
  const match = rows.find((row) => {
    const candidates = [
      token(row.id),
      token(row.name),
      token(row.slug),
      token(row.label),
      token((text(row.name) || '').replace(/^squad\s+/i, '')),
    ];
    return candidates.includes(idToken) || (labelToken && candidates.includes(labelToken)) || (suffixToken && candidates.includes(suffixToken));
  });
  return text(match?.id || squadId);
}

async function rollback(ops: OperationRecord[]): Promise<void> {
  const ordered = [...ops].reverse();
  for (const op of ordered) {
    try {
      if (op.type === 'create') {
        const rowId = text(op.row.id);
        if (rowId && op.entity.delete) {
          await op.entity.delete(rowId);
        } else if (rowId && op.entity.update) {
          await op.entity.update(rowId, { status: 'inactive' });
        }
        continue;
      }
      if (op.type === 'update') {
        await updateRow(op.entity, op.rowId, op.previous);
        continue;
      }
      if (op.type === 'deactivate') {
        await updateRow(op.entity, op.rowId, { status: op.previousStatus || 'active' });
      }
    } catch {
      // Rollback is best effort.
    }
  }
}

function channelMembershipPayloads(entityName: string, memberId: string, channelId: string): Array<Record<string, unknown>> {
  if (entityName === 'ChannelMember') {
    return [
      { channel_id: channelId, user_id: memberId, status: 'active' },
      { comms_channel_id: channelId, user_id: memberId, status: 'active' },
      { channelId, memberId, status: 'active' },
    ];
  }
  if (entityName === 'CommsChannelMember') {
    return [
      { comms_channel_id: channelId, member_profile_id: memberId, status: 'active' },
      { commsChannelId: channelId, memberId, status: 'active' },
      { channelId, memberId, status: 'active' },
    ];
  }
  return [
    { channel_id: channelId, member_profile_id: memberId, status: 'active' },
    { channelId, memberId, status: 'active' },
    { comms_channel_id: channelId, member_profile_id: memberId, status: 'active' },
  ];
}

async function syncChannelMemberships(args: {
  memberIds: string[];
  sourceChannelId: string;
  destinationChannelId: string;
  warnings: string[];
  operations: OperationRecord[];
}) {
  const candidates = CHANNEL_MEMBERSHIP_ENTITY_CANDIDATES
    .map((entityName) => ({ entityName, entity: entityClient(entityName) }))
    .filter((entry): entry is { entityName: string; entity: EntityClient } => Boolean(entry.entity));

  if (!candidates.length) {
    args.warnings.push('Channel membership entity unavailable; skipped channel sync.');
    return;
  }

  for (const { entityName, entity } of candidates) {
    const rows = await listRows(entity, 800);
    for (const memberId of args.memberIds) {
      const destinationExisting = rows.find(
        (row) => rowMemberId(row) === memberId && rowChannelId(row) === args.destinationChannelId
      );
      if (destinationExisting) {
        if (!isRowActive(destinationExisting)) {
          const rowId = text(destinationExisting.id);
          if (rowId) {
            args.operations.push({
              type: 'update',
              entity,
              rowId,
              previous: { status: destinationExisting.status || null },
            });
            await updateRow(entity, rowId, { status: 'active' });
          }
        }
      } else {
        const created = await createRow(entity, channelMembershipPayloads(entityName, memberId, args.destinationChannelId));
        args.operations.push({ type: 'create', entity, row: created });
      }

      const sourceRows = rows.filter(
        (row) => rowMemberId(row) === memberId && rowChannelId(row) === args.sourceChannelId && isRowActive(row)
      );
      for (const row of sourceRows) {
        const rowId = text(row.id);
        if (!rowId) continue;
        args.operations.push({
          type: 'deactivate',
          entity,
          rowId,
          previousStatus: row.status,
        });
        await deactivateRow(entity, row);
      }
    }
    return;
  }
}

export async function transferSquadMembers(input: SquadTransferMutationInput): Promise<TransferMutationResult> {
  const memberIds = unique(input.memberIds).sort((a, b) => a.localeCompare(b));
  if (!memberIds.length) {
    return { success: false, movedMemberIds: [], warnings: [], error: 'No members supplied', rolledBack: false };
  }
  if (text(input.sourceSquadId) === text(input.destinationSquadId)) {
    return { success: false, movedMemberIds: [], warnings: [], error: 'Source and destination squad are identical', rolledBack: false };
  }

  const squadMembershipEntity = entityClient('SquadMembership');
  if (!squadMembershipEntity) {
    return { success: false, movedMemberIds: [], warnings: [], error: 'SquadMembership entity unavailable', rolledBack: false };
  }

  const warnings: string[] = [];
  const operations: OperationRecord[] = [];
  let rolledBack = false;

  try {
    const squadRows = await listRows(entityClient('Squad') || { list: async () => [] }, 500);
    const sourceSquadResolved = resolveSquadEntityId(squadRows, input.sourceSquadId, input.sourceSquadLabel || '');
    const destinationSquadResolved = resolveSquadEntityId(
      squadRows,
      input.destinationSquadId,
      input.destinationSquadLabel || ''
    );

    for (const memberId of memberIds) {
      const existingRows = await filterRows(squadMembershipEntity, { member_profile_id: memberId });
      const activeRows = existingRows.filter((row) => isRowActive(row));
      const destinationRow = activeRows.find((row) => rowSquadId(row) === destinationSquadResolved);

      if (destinationRow) {
        const destinationRowId = text(destinationRow.id);
        if (destinationRowId && !isRowActive(destinationRow)) {
          operations.push({
            type: 'update',
            entity: squadMembershipEntity,
            rowId: destinationRowId,
            previous: { status: destinationRow.status || null },
          });
          await updateRow(squadMembershipEntity, destinationRowId, { status: 'active' });
        }
      } else {
        const created = await createRow(squadMembershipEntity, [
          {
            member_profile_id: memberId,
            squad_id: destinationSquadResolved,
            status: 'active',
            assigned_by_member_profile_id: text(input.actorId || ''),
          },
          {
            memberId,
            squadId: destinationSquadResolved,
            status: 'active',
            assignedBy: text(input.actorId || ''),
          },
        ]);
        operations.push({ type: 'create', entity: squadMembershipEntity, row: created });
      }

      for (const row of activeRows) {
        const rowId = text(row.id);
        const rowSquad = rowSquadId(row);
        if (!rowId || rowSquad === destinationSquadResolved) continue;
        operations.push({
          type: 'deactivate',
          entity: squadMembershipEntity,
          rowId,
          previousStatus: row.status,
        });
        await deactivateRow(squadMembershipEntity, row);
      }

      if (!activeRows.length && sourceSquadResolved) {
        warnings.push(`No existing active squad memberships found for ${memberId}; created destination assignment only.`);
      }
    }

    await syncChannelMemberships({
      memberIds,
      sourceChannelId: text(input.sourceChannelId),
      destinationChannelId: text(input.destinationChannelId),
      warnings,
      operations,
    });

    return {
      success: true,
      movedMemberIds: memberIds,
      warnings,
      rolledBack,
    };
  } catch (error: any) {
    await rollback(operations);
    rolledBack = operations.length > 0;
    return {
      success: false,
      movedMemberIds: [],
      warnings,
      error: error?.message || 'Transfer failed',
      rolledBack,
    };
  }
}
