import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceContentLength, enforceJsonPost } from './_shared/security.ts';

type WorkspaceStateRecord = {
  namespace: string;
  scopeKey: string;
  schemaVersion: number;
  state: unknown;
  stateJson: string;
  bytes: number;
  persistedAt: string;
  ownerMemberProfileId: string | null;
  ownerUserId: string | null;
};

type UpdateAttempt = Record<string, unknown>;

const SNAPSHOT_EVENT_TYPE = 'WORKSPACE_STATE_SNAPSHOT';
const CLEARED_EVENT_TYPE = 'WORKSPACE_STATE_CLEARED';
const MAX_STATE_BYTES = 240_000;
const MAX_NAMESPACE_LENGTH = 80;
const MAX_SCOPE_LENGTH = 140;
const DEFAULT_SCOPE = 'default';
const DEFAULT_LIMIT = 25;

function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeNamespace(value: unknown): string {
  const token = text(value).toLowerCase().replace(/[^a-z0-9._:-]+/g, '_').slice(0, MAX_NAMESPACE_LENGTH);
  return token || 'workspace_state';
}

function normalizeScopeKey(value: unknown): string {
  const token = text(value, DEFAULT_SCOPE).replace(/[^a-zA-Z0-9._:-]+/g, '_').slice(0, MAX_SCOPE_LENGTH);
  return token || DEFAULT_SCOPE;
}

function normalizeSchemaVersion(value: unknown): number {
  const parsed = Math.floor(safeNumber(value, 1));
  return Math.max(1, Math.min(parsed, 99));
}

function serializeState(value: unknown): { stateJson: string; bytes: number } {
  const stateJson = JSON.stringify(value ?? {});
  return {
    stateJson,
    bytes: new TextEncoder().encode(stateJson).length,
  };
}

function parseStateJson(value: unknown): unknown {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function createFirstSuccessful(entity: any, attempts: UpdateAttempt[]) {
  if (!entity?.create) throw new Error('Entity create unavailable');
  let lastError: unknown = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

function resolveWorkspaceEntity(base44: any): any | null {
  if (base44?.entities?.WorkspaceState) return base44.entities.WorkspaceState;
  if (base44?.entities?.ClientState) return base44.entities.ClientState;
  return null;
}

function normalizeOwner(ownerMemberProfileId: string | null, ownerUserId: string | null) {
  return {
    owner_member_profile_id: ownerMemberProfileId || undefined,
    owner_user_id: ownerUserId || undefined,
    ownerMemberProfileId: ownerMemberProfileId || undefined,
    ownerUserId: ownerUserId || undefined,
  };
}

function ownerMatches(
  details: any,
  ownerMemberProfileId: string | null,
  ownerUserId: string | null
): boolean {
  if (ownerMemberProfileId) {
    return text(details?.owner_member_profile_id || details?.ownerMemberProfileId) === ownerMemberProfileId;
  }
  if (!ownerUserId) return false;
  return text(details?.owner_user_id || details?.ownerUserId) === ownerUserId;
}

function mapEntityRowToSnapshot(row: any): WorkspaceStateRecord | null {
  if (!row) return null;
  const namespace = normalizeNamespace(row.namespace || row.state_namespace || row.stateNamespace);
  const scopeKey = normalizeScopeKey(row.scope_key || row.scopeKey);
  const schemaVersion = normalizeSchemaVersion(row.schema_version || row.schemaVersion || 1);
  const stateJson = text(row.state_json || row.stateJson);
  const statePayload = typeof row.state_payload !== 'undefined'
    ? row.state_payload
    : typeof row.statePayload !== 'undefined'
      ? row.statePayload
      : null;
  const state = statePayload ?? parseStateJson(stateJson) ?? {};
  const persistedAt = text(row.persisted_at || row.persistedAt || row.updated_date || row.created_date, nowIso());
  const ownerMemberProfileId = text(row.owner_member_profile_id || row.ownerMemberProfileId) || null;
  const ownerUserId = text(row.owner_user_id || row.ownerUserId) || null;
  const serialized = serializeState(state);
  return {
    namespace,
    scopeKey,
    schemaVersion,
    state,
    stateJson: serialized.stateJson,
    bytes: serialized.bytes,
    persistedAt,
    ownerMemberProfileId,
    ownerUserId,
  };
}

function compareNewest(a: { persistedAt?: string }, b: { persistedAt?: string }): number {
  const aMs = Date.parse(String(a.persistedAt || ''));
  const bMs = Date.parse(String(b.persistedAt || ''));
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) return bMs - aMs;
  if (Number.isNaN(aMs) && Number.isNaN(bMs)) return 0;
  return Number.isNaN(aMs) ? 1 : -1;
}

async function saveViaEntity(base44: any, record: WorkspaceStateRecord) {
  const entity = resolveWorkspaceEntity(base44);
  if (!entity?.create) return null;
  const ownerFields = normalizeOwner(record.ownerMemberProfileId, record.ownerUserId);
  return createFirstSuccessful(entity, [
    {
      namespace: record.namespace,
      scope_key: record.scopeKey,
      schema_version: record.schemaVersion,
      state_payload: record.state,
      state_json: record.stateJson,
      state_bytes: record.bytes,
      persisted_at: record.persistedAt,
      status: 'ACTIVE',
      ...ownerFields,
    },
    {
      state_namespace: record.namespace,
      scopeKey: record.scopeKey,
      schemaVersion: record.schemaVersion,
      statePayload: record.state,
      stateJson: record.stateJson,
      stateBytes: record.bytes,
      persistedAt: record.persistedAt,
      status: 'ACTIVE',
      ...ownerFields,
    },
    {
      namespace: record.namespace,
      state: record.state,
      ...ownerFields,
    },
  ]).catch(() => null);
}

async function saveViaEventLog(base44: any, actorMemberId: string | null, record: WorkspaceStateRecord) {
  if (!base44?.entities?.EventLog?.create) throw new Error('EventLog entity unavailable');
  return createFirstSuccessful(base44.entities.EventLog, [
    {
      type: SNAPSHOT_EVENT_TYPE,
      severity: 'LOW',
      actor_member_profile_id: actorMemberId,
      summary: `Workspace state persisted (${record.namespace})`,
      details: {
        namespace: record.namespace,
        scope_key: record.scopeKey,
        schema_version: record.schemaVersion,
        owner_member_profile_id: record.ownerMemberProfileId,
        owner_user_id: record.ownerUserId,
        persisted_at: record.persistedAt,
        state_bytes: record.bytes,
        state_json: record.stateJson,
      },
    },
    {
      type: SNAPSHOT_EVENT_TYPE,
      severity: 'LOW',
      summary: `Workspace state persisted (${record.namespace})`,
    },
  ]);
}

async function writeClearEvent(
  base44: any,
  actorMemberId: string | null,
  input: {
    namespace: string;
    scopeKey: string;
    ownerMemberProfileId: string | null;
    ownerUserId: string | null;
    reason: string;
  }
) {
  if (!base44?.entities?.EventLog?.create) return null;
  return createFirstSuccessful(base44.entities.EventLog, [
    {
      type: CLEARED_EVENT_TYPE,
      severity: 'LOW',
      actor_member_profile_id: actorMemberId,
      summary: `Workspace state cleared (${input.namespace})`,
      details: {
        namespace: input.namespace,
        scope_key: input.scopeKey,
        owner_member_profile_id: input.ownerMemberProfileId,
        owner_user_id: input.ownerUserId,
        reason: input.reason,
        cleared_at: nowIso(),
      },
    },
    {
      type: CLEARED_EVENT_TYPE,
      severity: 'LOW',
      summary: `Workspace state cleared (${input.namespace})`,
    },
  ]).catch(() => null);
}

async function listEntityRows(
  base44: any,
  ownerMemberProfileId: string | null,
  ownerUserId: string | null,
  namespace?: string
) {
  const entity = resolveWorkspaceEntity(base44);
  if (!entity) return [] as WorkspaceStateRecord[];

  const rows: any[] = [];
  const ownerFilter = ownerMemberProfileId
    ? { owner_member_profile_id: ownerMemberProfileId }
    : { owner_user_id: ownerUserId };

  if (entity.filter) {
    const exact = await entity
      .filter(namespace ? { ...ownerFilter, namespace } : ownerFilter, '-created_date', 220)
      .catch(() => []);
    rows.push(...(Array.isArray(exact) ? exact : []));
    if (rows.length === 0) {
      const camelFilter = ownerMemberProfileId
        ? { ownerMemberProfileId: ownerMemberProfileId }
        : { ownerUserId: ownerUserId };
      const fallback = await entity
        .filter(namespace ? { ...camelFilter, namespace } : camelFilter, '-created_date', 220)
        .catch(() => []);
      rows.push(...(Array.isArray(fallback) ? fallback : []));
    }
  }

  if (rows.length === 0 && entity.list) {
    const listed = await entity.list('-created_date', 280).catch(() => []);
    rows.push(...(Array.isArray(listed) ? listed : []));
  }

  return rows
    .map(mapEntityRowToSnapshot)
    .filter((entry): entry is WorkspaceStateRecord => Boolean(entry))
    .filter((entry) => {
      if (namespace && entry.namespace !== namespace) return false;
      if (ownerMemberProfileId) return entry.ownerMemberProfileId === ownerMemberProfileId;
      return entry.ownerUserId === ownerUserId;
    });
}

async function listEventSnapshots(
  base44: any,
  ownerMemberProfileId: string | null,
  ownerUserId: string | null,
  namespace?: string
) {
  if (!base44?.entities?.EventLog?.list) return [] as WorkspaceStateRecord[];
  const logs = await base44.entities.EventLog.list('-created_date', 2800).catch(() => []);
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const clears = new Map<string, number>();
  for (const entry of logs) {
    const type = text(entry?.type).toUpperCase();
    if (type !== CLEARED_EVENT_TYPE) continue;
    const details = entry?.details || {};
    if (!ownerMatches(details, ownerMemberProfileId, ownerUserId)) continue;
    const entryNamespace = normalizeNamespace(details?.namespace);
    if (namespace && namespace !== entryNamespace) continue;
    const scopeKey = normalizeScopeKey(details?.scope_key || details?.scopeKey || DEFAULT_SCOPE);
    const key = `${entryNamespace}:${scopeKey}`;
    const clearedAt = Date.parse(text(details?.cleared_at || entry?.created_date || ''));
    if (Number.isNaN(clearedAt)) continue;
    const existing = clears.get(key) || 0;
    if (clearedAt > existing) clears.set(key, clearedAt);
  }

  const snapshots: WorkspaceStateRecord[] = [];
  for (const entry of logs) {
    const type = text(entry?.type).toUpperCase();
    if (type !== SNAPSHOT_EVENT_TYPE) continue;
    const details = entry?.details || {};
    if (!ownerMatches(details, ownerMemberProfileId, ownerUserId)) continue;
    const entryNamespace = normalizeNamespace(details?.namespace);
    if (namespace && namespace !== entryNamespace) continue;
    const scopeKey = normalizeScopeKey(details?.scope_key || details?.scopeKey || DEFAULT_SCOPE);
    const persistedAt = text(details?.persisted_at || entry?.created_date || nowIso());
    const persistedMs = Date.parse(persistedAt);
    if (Number.isNaN(persistedMs)) continue;
    const clearMs = clears.get(`${entryNamespace}:${scopeKey}`) || 0;
    if (persistedMs <= clearMs) continue;
    const stateJson = text(details?.state_json || '');
    const parsedState = parseStateJson(stateJson);
    const state = typeof details?.state_payload !== 'undefined'
      ? details.state_payload
      : parsedState ?? {};
    const serialized = serializeState(state);
    snapshots.push({
      namespace: entryNamespace,
      scopeKey,
      schemaVersion: normalizeSchemaVersion(details?.schema_version || details?.schemaVersion || 1),
      state,
      stateJson: serialized.stateJson,
      bytes: serialized.bytes,
      persistedAt,
      ownerMemberProfileId,
      ownerUserId,
    });
  }
  return snapshots;
}

function toResponseSnapshot(entry: WorkspaceStateRecord, source: 'entity' | 'event_log') {
  return {
    namespace: entry.namespace,
    scopeKey: entry.scopeKey,
    schemaVersion: entry.schemaVersion,
    persistedAt: entry.persistedAt,
    bytes: entry.bytes,
    state: entry.state,
    source,
  };
}

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const lengthCheck = enforceContentLength(req, 320_000);
    if (!lengthCheck.ok) {
      return Response.json({ error: lengthCheck.error }, { status: lengthCheck.status });
    }

    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = text(payload.action || 'save').toLowerCase();
    if (!['save', 'load', 'clear', 'list'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const ownerMemberProfileId = memberProfile?.id ? text(memberProfile.id) : null;
    const ownerUserId = ownerMemberProfileId ? null : adminUser?.id ? text(adminUser.id) : null;
    if (!ownerMemberProfileId && !ownerUserId) {
      return Response.json({ error: 'Unable to resolve state owner' }, { status: 403 });
    }

    const namespace = normalizeNamespace(payload.namespace || payload.stateNamespace);
    const scopeKey = normalizeScopeKey(payload.scopeKey || payload.scope_key || DEFAULT_SCOPE);

    if (action === 'save') {
      const schemaVersion = normalizeSchemaVersion(payload.schemaVersion || payload.schema_version || 1);
      const state = typeof payload.state !== 'undefined'
        ? payload.state
        : typeof payload.snapshot !== 'undefined'
          ? payload.snapshot
          : payload.payload;
      const serialized = serializeState(state ?? {});
      if (serialized.bytes > MAX_STATE_BYTES) {
        return Response.json(
          {
            error: `State payload exceeds ${MAX_STATE_BYTES} bytes`,
            bytes: serialized.bytes,
          },
          { status: 413 }
        );
      }

      const record: WorkspaceStateRecord = {
        namespace,
        scopeKey,
        schemaVersion,
        state: state ?? {},
        stateJson: serialized.stateJson,
        bytes: serialized.bytes,
        persistedAt: nowIso(),
        ownerMemberProfileId,
        ownerUserId,
      };

      const entityRow = await saveViaEntity(base44, record);
      if (entityRow) {
        return Response.json({
          success: true,
          action,
          snapshot: toResponseSnapshot(record, 'entity'),
          rowId: text(entityRow?.id) || null,
        });
      }

      const log = await saveViaEventLog(base44, ownerMemberProfileId, record);
      return Response.json({
        success: true,
        action,
        snapshot: toResponseSnapshot(record, 'event_log'),
        logId: text(log?.id) || null,
      });
    }

    if (action === 'load') {
      const entityRows = await listEntityRows(base44, ownerMemberProfileId, ownerUserId, namespace);
      const scopedEntityRows = entityRows.filter((entry) => entry.scopeKey === scopeKey);
      if (scopedEntityRows.length > 0) {
        scopedEntityRows.sort(compareNewest);
        return Response.json({
          success: true,
          action,
          snapshot: toResponseSnapshot(scopedEntityRows[0], 'entity'),
        });
      }

      const logs = await listEventSnapshots(base44, ownerMemberProfileId, ownerUserId, namespace);
      const scopedLogs = logs.filter((entry) => entry.scopeKey === scopeKey).sort(compareNewest);
      if (scopedLogs.length > 0) {
        return Response.json({
          success: true,
          action,
          snapshot: toResponseSnapshot(scopedLogs[0], 'event_log'),
        });
      }

      return Response.json({
        success: true,
        action,
        snapshot: null,
      });
    }

    if (action === 'clear') {
      const entity = resolveWorkspaceEntity(base44);
      let affected = 0;
      if (entity?.list) {
        const rows = await listEntityRows(base44, ownerMemberProfileId, ownerUserId, namespace);
        const scoped = rows.filter((entry) => entry.scopeKey === scopeKey);
        const limit = Math.min(scoped.length, 140);
        if (limit > 0) {
          const targets = scoped.slice(0, limit);
          if (entity.delete) {
            const listed = await entity.list?.('-created_date', 320).catch(() => []);
            const candidateRows = Array.isArray(listed) ? listed : [];
            const consumedRowIds = new Set<string>();
            for (const target of targets) {
              const row = candidateRows.find((entry: any) => {
                if (!entry?.id || consumedRowIds.has(String(entry.id))) return false;
                const mapped = mapEntityRowToSnapshot(entry);
                if (!mapped) return false;
                if (mapped.namespace !== target.namespace || mapped.scopeKey !== target.scopeKey) return false;
                if (ownerMemberProfileId && mapped.ownerMemberProfileId !== ownerMemberProfileId) return false;
                if (!ownerMemberProfileId && mapped.ownerUserId !== ownerUserId) return false;
                return mapped.persistedAt === target.persistedAt;
              });
              if (!row?.id) continue;
              await entity.delete(row.id).catch(() => null);
              consumedRowIds.add(String(row.id));
              affected += 1;
            }
          } else if (entity.update) {
            const listed = await entity.list?.('-created_date', 320).catch(() => []);
            if (Array.isArray(listed)) {
              for (const row of listed) {
                const mapped = mapEntityRowToSnapshot(row);
                if (!mapped) continue;
                if (mapped.namespace !== namespace || mapped.scopeKey !== scopeKey) continue;
                if (ownerMemberProfileId && mapped.ownerMemberProfileId !== ownerMemberProfileId) continue;
                if (!ownerMemberProfileId && mapped.ownerUserId !== ownerUserId) continue;
                await entity.update(row.id, { status: 'CLEARED', cleared_at: nowIso() }).catch(() => null);
                affected += 1;
              }
            }
          }
        }
      }

      await writeClearEvent(base44, ownerMemberProfileId, {
        namespace,
        scopeKey,
        ownerMemberProfileId,
        ownerUserId,
        reason: text(payload.reason || 'manual_clear', 'manual_clear'),
      });

      return Response.json({
        success: true,
        action,
        namespace,
        scopeKey,
        affected,
      });
    }

    const requestedLimit = Math.floor(safeNumber(payload.limit, DEFAULT_LIMIT));
    const limit = Math.max(1, Math.min(requestedLimit, 60));
    const byNamespace = new Map<string, WorkspaceStateRecord>();

    const merge = (entries: WorkspaceStateRecord[]) => {
      for (const entry of entries) {
        const key = `${entry.namespace}:${entry.scopeKey}`;
        const existing = byNamespace.get(key);
        if (!existing || compareNewest(entry, existing) < 0) {
          byNamespace.set(key, entry);
        }
      }
    };

    merge(await listEntityRows(base44, ownerMemberProfileId, ownerUserId, namespace));
    merge(await listEventSnapshots(base44, ownerMemberProfileId, ownerUserId, namespace));

    const snapshots = Array.from(byNamespace.values())
      .sort(compareNewest)
      .slice(0, limit)
      .map((entry) => ({
        namespace: entry.namespace,
        scopeKey: entry.scopeKey,
        schemaVersion: entry.schemaVersion,
        persistedAt: entry.persistedAt,
        bytes: entry.bytes,
      }));

    return Response.json({
      success: true,
      action,
      snapshots,
    });
  } catch (error) {
    console.error('[updateWorkspaceState]', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Workspace state update failed' }, { status: 500 });
  }
});
