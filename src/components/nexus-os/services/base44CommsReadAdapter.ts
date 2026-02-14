import { base44 } from '../../../api/base44Client';

/**
 * Base44 Comms Read Adapter
 *
 * Provides a single NexusOS read boundary for comms graph dependencies.
 * This keeps NexusOS decoupled from exact Base44 table naming so the same
 * feature can move behind non-Base44 providers later with one adapter swap.
 */

export interface Base44CommsChannel {
  id: string;
  label: string;
  matchKeys: string[];
}

export interface Base44ChannelMembershipRecord {
  channelId: string;
  memberId: string;
}

type MaybeEntityClient = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
};

const CHANNEL_ENTITY_CANDIDATES = ['Channel', 'CommsChannel'] as const;
const MEMBERSHIP_ENTITY_CANDIDATES = ['ChannelMembership', 'ChannelMember', 'CommsChannelMember'] as const;

function text(value: unknown): string {
  return String(value || '').trim();
}

function normalizeChannelId(value: unknown): string {
  return text(value);
}

function getEntityClient(entityName: string): MaybeEntityClient | null {
  const entities = (base44 as { entities?: Record<string, MaybeEntityClient> } | undefined)?.entities;
  const entity = entities?.[entityName];
  if (!entity || typeof entity !== 'object') return null;
  return entity;
}

async function listRows(entity: MaybeEntityClient, limit: number): Promise<Record<string, unknown>[]> {
  const attempts = [
    () => entity.list?.('-created_date', limit),
    () => entity.list?.(undefined, limit),
    () => entity.list?.({ limit }),
    () => entity.filter?.({}, '-created_date', limit),
  ];
  for (const run of attempts) {
    if (!run) continue;
    try {
      const rows = await run();
      if (Array.isArray(rows)) return rows as Record<string, unknown>[];
    } catch {
      // Keep trying compatible list/filter signatures.
    }
  }
  return [];
}

function normalizeChannelRecord(row: Record<string, unknown>): Base44CommsChannel | null {
  const id = normalizeChannelId(
    row.id || row.channel_id || row.channelId || row.slug || row.name
  );
  if (!id) return null;
  const label = text(row.name || row.label || row.slug || id) || id;
  const matchKeys = Array.from(
    new Set(
      [id, row.id, row.slug, row.name, row.label]
        .map((entry) => normalizeChannelId(entry))
        .filter(Boolean)
    )
  );
  return {
    id,
    label,
    matchKeys,
  };
}

function normalizeMembershipRecord(row: Record<string, unknown>): Base44ChannelMembershipRecord | null {
  const channelId = normalizeChannelId(
    row.channel_id || row.channelId || row.comms_channel_id || row.commsChannelId
  );
  const memberId = text(
    row.member_profile_id || row.memberId || row.user_id || row.userId
  );
  if (!channelId || !memberId) return null;
  return {
    channelId,
    memberId,
  };
}

export async function listBase44CommsChannels(limit = 250): Promise<Base44CommsChannel[]> {
  for (const entityName of CHANNEL_ENTITY_CANDIDATES) {
    const entity = getEntityClient(entityName);
    if (!entity) continue;
    const rows = await listRows(entity, limit);
    if (!rows.length) continue;
    const normalized = rows
      .map((row) => normalizeChannelRecord(row))
      .filter((entry): entry is Base44CommsChannel => Boolean(entry));
    if (normalized.length > 0) {
      const deduped = new Map<string, Base44CommsChannel>();
      for (const channel of normalized) {
        if (deduped.has(channel.id)) continue;
        deduped.set(channel.id, channel);
      }
      return Array.from(deduped.values());
    }
  }
  return [];
}

export async function listBase44ChannelMemberships(limit = 500): Promise<Base44ChannelMembershipRecord[]> {
  for (const entityName of MEMBERSHIP_ENTITY_CANDIDATES) {
    const entity = getEntityClient(entityName);
    if (!entity) continue;
    const rows = await listRows(entity, limit);
    if (!rows.length) continue;
    const normalized = rows
      .map((row) => normalizeMembershipRecord(row))
      .filter((entry): entry is Base44ChannelMembershipRecord => Boolean(entry));
    if (normalized.length > 0) {
      const deduped = new Map<string, Base44ChannelMembershipRecord>();
      for (const row of normalized) {
        deduped.set(`${row.channelId}:${row.memberId}`, row);
      }
      return Array.from(deduped.values());
    }
  }
  return [];
}

