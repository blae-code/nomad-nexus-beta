import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceContentLength, enforceJsonPost } from './_shared/security.ts';

type UpdateAttempt = Record<string, unknown>;

type FileAssetRecord = {
  id: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number | null;
  sourceType: string;
  sourceId: string | null;
  channelId: string | null;
  eventId: string | null;
  netId: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED';
  retentionExpiresAt: string | null;
  ownerMemberProfileId: string | null;
  ownerUserId: string | null;
  createdAt: string;
};

const REGISTER_EVENT = 'FILE_ASSET_REGISTERED';
const STATUS_EVENT = 'FILE_ASSET_STATUS';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map((entry) => Number(entry));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized.includes(':')) return false;
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;
  return false;
}

function isPrivateHost(hostname: string): boolean {
  const normalized = text(hostname).toLowerCase().replace(/\.$/, '');
  if (!normalized) return true;
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal') || normalized.endsWith('.home')) return true;
  if (isPrivateIpv4(normalized)) return true;
  if (isPrivateIpv6(normalized)) return true;
  return false;
}

function normalizeStatus(value: unknown): 'ACTIVE' | 'EXPIRED' | 'DELETED' {
  const token = text(value, 'ACTIVE').toUpperCase();
  if (token === 'EXPIRED' || token === 'DELETED') return token;
  return 'ACTIVE';
}

function normalizeSourceType(value: unknown): string {
  return text(value || 'GENERIC')
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]+/g, '_')
    .slice(0, 64) || 'GENERIC';
}

function normalizeAssetId(value: unknown): string {
  const token = text(value);
  if (token) return token.slice(0, 120);
  return `fa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUrl(value: unknown): string {
  const token = text(value);
  if (!token) throw new Error('fileUrl is required');
  if (token.startsWith('/')) return token;
  try {
    const parsed = new URL(token);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('fileUrl must use http/https');
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new Error('fileUrl cannot target private hosts');
    }
    return token;
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('fileUrl must be a valid URL');
  }
}

function inferFileName(fileUrl: string, override: unknown): string {
  const explicit = text(override);
  if (explicit) return explicit.slice(0, 180);
  const tail = fileUrl.split('?')[0].split('#')[0].split('/').pop() || 'asset';
  return text(tail, 'asset').slice(0, 180);
}

function normalizeContentType(value: unknown): string {
  return text(value, 'application/octet-stream').slice(0, 120);
}

function normalizeOptionalToken(value: unknown, maxLength = 120): string | null {
  const token = text(value);
  return token ? token.slice(0, maxLength) : null;
}

function retentionIso(ttlHours: number, nowMs = Date.now()): string {
  const bounded = Math.max(1, Math.min(Math.floor(ttlHours), 24 * 365));
  return new Date(nowMs + bounded * 60 * 60 * 1000).toISOString();
}

function compareNewest(a: { createdAt?: string }, b: { createdAt?: string }): number {
  const aMs = Date.parse(String(a.createdAt || ''));
  const bMs = Date.parse(String(b.createdAt || ''));
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) return bMs - aMs;
  if (Number.isNaN(aMs) && Number.isNaN(bMs)) return 0;
  return Number.isNaN(aMs) ? 1 : -1;
}

function parseCreatedAt(input: unknown): string {
  const raw = text(input);
  const parsed = Date.parse(raw);
  if (raw && !Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return nowIso();
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

function resolveFileAssetEntity(base44: any): any | null {
  if (base44?.entities?.FileAsset) return base44.entities.FileAsset;
  if (base44?.entities?.MediaAsset) return base44.entities.MediaAsset;
  return null;
}

function resolveOwner(memberProfile: any, adminUser: any) {
  const ownerMemberProfileId = text(memberProfile?.id) || null;
  const ownerUserId = ownerMemberProfileId ? null : text(adminUser?.id) || null;
  return { ownerMemberProfileId, ownerUserId };
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

function mapEntityRecord(entry: any): FileAssetRecord | null {
  if (!entry) return null;
  const fileUrl = text(entry.file_url || entry.fileUrl);
  if (!fileUrl) return null;
  return {
    id: normalizeAssetId(entry.id),
    fileUrl,
    fileName: inferFileName(fileUrl, entry.file_name || entry.fileName),
    contentType: normalizeContentType(entry.content_type || entry.contentType),
    sizeBytes: Number.isFinite(Number(entry.size_bytes || entry.sizeBytes))
      ? Number(entry.size_bytes || entry.sizeBytes)
      : null,
    sourceType: normalizeSourceType(entry.source_type || entry.sourceType || 'GENERIC'),
    sourceId: normalizeOptionalToken(entry.source_id || entry.sourceId),
    channelId: normalizeOptionalToken(entry.channel_id || entry.channelId),
    eventId: normalizeOptionalToken(entry.event_id || entry.eventId),
    netId: normalizeOptionalToken(entry.net_id || entry.netId),
    status: normalizeStatus(entry.status || 'ACTIVE'),
    retentionExpiresAt: normalizeOptionalToken(entry.retention_expires_at || entry.retentionExpiresAt, 48),
    ownerMemberProfileId: normalizeOptionalToken(entry.owner_member_profile_id || entry.ownerMemberProfileId),
    ownerUserId: normalizeOptionalToken(entry.owner_user_id || entry.ownerUserId),
    createdAt: parseCreatedAt(entry.created_at || entry.createdAt || entry.created_date),
  };
}

function mapRegisterDetails(details: any): FileAssetRecord | null {
  const fileUrl = text(details?.file_url || details?.fileUrl);
  if (!fileUrl) return null;
  return {
    id: normalizeAssetId(details?.id || details?.asset_id || details?.assetId),
    fileUrl,
    fileName: inferFileName(fileUrl, details?.file_name || details?.fileName),
    contentType: normalizeContentType(details?.content_type || details?.contentType),
    sizeBytes: Number.isFinite(Number(details?.size_bytes || details?.sizeBytes))
      ? Number(details?.size_bytes || details?.sizeBytes)
      : null,
    sourceType: normalizeSourceType(details?.source_type || details?.sourceType || 'GENERIC'),
    sourceId: normalizeOptionalToken(details?.source_id || details?.sourceId),
    channelId: normalizeOptionalToken(details?.channel_id || details?.channelId),
    eventId: normalizeOptionalToken(details?.event_id || details?.eventId),
    netId: normalizeOptionalToken(details?.net_id || details?.netId),
    status: normalizeStatus(details?.status || 'ACTIVE'),
    retentionExpiresAt: normalizeOptionalToken(details?.retention_expires_at || details?.retentionExpiresAt, 48),
    ownerMemberProfileId: normalizeOptionalToken(details?.owner_member_profile_id || details?.ownerMemberProfileId),
    ownerUserId: normalizeOptionalToken(details?.owner_user_id || details?.ownerUserId),
    createdAt: parseCreatedAt(details?.created_at || details?.createdAt),
  };
}

function applyStatusUpdatesFromLogs(records: FileAssetRecord[], eventLogs: any[]): FileAssetRecord[] {
  if (!Array.isArray(records) || records.length === 0 || !Array.isArray(eventLogs) || eventLogs.length === 0) {
    return records;
  }
  const next = records.map((entry) => ({ ...entry }));
  const indexById = new Map(next.map((entry, index) => [entry.id, index]));
  for (const log of eventLogs) {
    if (text(log?.type).toUpperCase() !== STATUS_EVENT) continue;
    const details = log?.details || {};
    const assetId = normalizeAssetId(details?.asset_id || details?.assetId);
    const status = normalizeStatus(details?.status || 'ACTIVE');
    if (!indexById.has(assetId)) continue;
    const index = Number(indexById.get(assetId));
    next[index] = {
      ...next[index],
      status,
      retentionExpiresAt: normalizeOptionalToken(
        details?.retention_expires_at || details?.retentionExpiresAt || next[index].retentionExpiresAt,
        48
      ),
    };
  }
  return next;
}

async function registerViaEntity(base44: any, record: FileAssetRecord) {
  const entity = resolveFileAssetEntity(base44);
  if (!entity?.create) return null;
  const ownerMemberProfileId = record.ownerMemberProfileId || undefined;
  const ownerUserId = record.ownerUserId || undefined;
  return createFirstSuccessful(entity, [
    {
      id: record.id,
      file_url: record.fileUrl,
      file_name: record.fileName,
      content_type: record.contentType,
      size_bytes: record.sizeBytes,
      source_type: record.sourceType,
      source_id: record.sourceId,
      channel_id: record.channelId,
      event_id: record.eventId,
      net_id: record.netId,
      status: record.status,
      retention_expires_at: record.retentionExpiresAt,
      owner_member_profile_id: ownerMemberProfileId,
      owner_user_id: ownerUserId,
      created_at: record.createdAt,
    },
    {
      id: record.id,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      contentType: record.contentType,
      sizeBytes: record.sizeBytes,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      channelId: record.channelId,
      eventId: record.eventId,
      netId: record.netId,
      status: record.status,
      retentionExpiresAt: record.retentionExpiresAt,
      ownerMemberProfileId: ownerMemberProfileId,
      ownerUserId: ownerUserId,
      createdAt: record.createdAt,
    },
    {
      file_url: record.fileUrl,
      source_type: record.sourceType,
      status: record.status,
      owner_member_profile_id: ownerMemberProfileId,
      owner_user_id: ownerUserId,
    },
  ]).catch(() => null);
}

async function writeRegisterEvent(base44: any, actorMemberId: string | null, record: FileAssetRecord) {
  if (!base44?.entities?.EventLog?.create) throw new Error('EventLog entity unavailable');
  return createFirstSuccessful(base44.entities.EventLog, [
    {
      type: REGISTER_EVENT,
      severity: 'LOW',
      actor_member_profile_id: actorMemberId,
      summary: `File asset registered (${record.sourceType})`,
      details: {
        id: record.id,
        file_url: record.fileUrl,
        file_name: record.fileName,
        content_type: record.contentType,
        size_bytes: record.sizeBytes,
        source_type: record.sourceType,
        source_id: record.sourceId,
        channel_id: record.channelId,
        event_id: record.eventId,
        net_id: record.netId,
        status: record.status,
        retention_expires_at: record.retentionExpiresAt,
        owner_member_profile_id: record.ownerMemberProfileId,
        owner_user_id: record.ownerUserId,
        created_at: record.createdAt,
      },
    },
    {
      type: REGISTER_EVENT,
      severity: 'LOW',
      summary: `File asset registered (${record.sourceType})`,
    },
  ]);
}

async function writeStatusEvent(
  base44: any,
  actorMemberId: string | null,
  input: { assetId: string; status: 'ACTIVE' | 'EXPIRED' | 'DELETED'; reason: string; retentionExpiresAt: string | null }
) {
  if (!base44?.entities?.EventLog?.create) return null;
  return createFirstSuccessful(base44.entities.EventLog, [
    {
      type: STATUS_EVENT,
      severity: 'LOW',
      actor_member_profile_id: actorMemberId,
      summary: `File asset status updated (${input.status})`,
      details: {
        asset_id: input.assetId,
        status: input.status,
        reason: input.reason,
        retention_expires_at: input.retentionExpiresAt,
        updated_at: nowIso(),
      },
    },
    {
      type: STATUS_EVENT,
      severity: 'LOW',
      summary: `File asset status updated (${input.status})`,
    },
  ]).catch(() => null);
}

function normalizeRecord(input: {
  payload: any;
  ownerMemberProfileId: string | null;
  ownerUserId: string | null;
}): FileAssetRecord {
  const fileUrl = normalizeUrl(input.payload.fileUrl || input.payload.file_url);
  const ttlHours = Math.max(1, Math.min(Math.floor(safeNumber(input.payload.ttlHours || input.payload.ttl_hours, 24 * 30)), 24 * 365));
  return {
    id: normalizeAssetId(input.payload.assetId || input.payload.id),
    fileUrl,
    fileName: inferFileName(fileUrl, input.payload.fileName || input.payload.file_name),
    contentType: normalizeContentType(input.payload.contentType || input.payload.content_type),
    sizeBytes: Number.isFinite(Number(input.payload.sizeBytes || input.payload.size_bytes))
      ? Number(input.payload.sizeBytes || input.payload.size_bytes)
      : null,
    sourceType: normalizeSourceType(input.payload.sourceType || input.payload.source_type || 'GENERIC'),
    sourceId: normalizeOptionalToken(input.payload.sourceId || input.payload.source_id),
    channelId: normalizeOptionalToken(input.payload.channelId || input.payload.channel_id),
    eventId: normalizeOptionalToken(input.payload.eventId || input.payload.event_id),
    netId: normalizeOptionalToken(input.payload.netId || input.payload.net_id),
    status: normalizeStatus(input.payload.status || 'ACTIVE'),
    retentionExpiresAt: retentionIso(ttlHours),
    ownerMemberProfileId: input.ownerMemberProfileId,
    ownerUserId: input.ownerUserId,
    createdAt: nowIso(),
  };
}

function applyFilters(records: FileAssetRecord[], filters: {
  sourceType?: string;
  sourceId?: string | null;
  channelId?: string | null;
  eventId?: string | null;
  includeExpired?: boolean;
  status?: string;
}) {
  const sourceType = filters.sourceType ? normalizeSourceType(filters.sourceType) : '';
  const sourceId = filters.sourceId ? normalizeOptionalToken(filters.sourceId) : null;
  const channelId = filters.channelId ? normalizeOptionalToken(filters.channelId) : null;
  const eventId = filters.eventId ? normalizeOptionalToken(filters.eventId) : null;
  const status = filters.status ? normalizeStatus(filters.status) : null;
  return records.filter((entry) => {
    if (sourceType && entry.sourceType !== sourceType) return false;
    if (sourceId && entry.sourceId !== sourceId) return false;
    if (channelId && entry.channelId !== channelId) return false;
    if (eventId && entry.eventId !== eventId) return false;
    if (!filters.includeExpired && entry.status === 'EXPIRED') return false;
    if (status && entry.status !== status) return false;
    return true;
  });
}

async function listFromEntity(base44: any, ownerMemberProfileId: string | null, ownerUserId: string | null) {
  const entity = resolveFileAssetEntity(base44);
  if (!entity) return [] as FileAssetRecord[];
  const rows: any[] = [];
  const ownerFilter = ownerMemberProfileId
    ? { owner_member_profile_id: ownerMemberProfileId }
    : { owner_user_id: ownerUserId };
  if (entity.filter) {
    const filtered = await entity.filter(ownerFilter, '-created_date', 320).catch(() => []);
    rows.push(...(Array.isArray(filtered) ? filtered : []));
    if (rows.length === 0) {
      const camelFilter = ownerMemberProfileId
        ? { ownerMemberProfileId: ownerMemberProfileId }
        : { ownerUserId: ownerUserId };
      const fallback = await entity.filter(camelFilter, '-created_date', 320).catch(() => []);
      rows.push(...(Array.isArray(fallback) ? fallback : []));
    }
  }
  if (rows.length === 0 && entity.list) {
    const listed = await entity.list('-created_date', 420).catch(() => []);
    rows.push(...(Array.isArray(listed) ? listed : []));
  }
  return rows
    .map(mapEntityRecord)
    .filter((entry): entry is FileAssetRecord => Boolean(entry))
    .filter((entry) => {
      if (ownerMemberProfileId) return entry.ownerMemberProfileId === ownerMemberProfileId;
      return entry.ownerUserId === ownerUserId;
    });
}

async function listFromEventLogs(base44: any, ownerMemberProfileId: string | null, ownerUserId: string | null) {
  if (!base44?.entities?.EventLog?.list) return [] as FileAssetRecord[];
  const logs = await base44.entities.EventLog.list('-created_date', 3000).catch(() => []);
  if (!Array.isArray(logs) || logs.length === 0) return [];
  const registered = logs
    .filter((entry) => text(entry?.type).toUpperCase() === REGISTER_EVENT)
    .map((entry) => ({ entry, details: entry?.details || {} }))
    .filter(({ details }) => ownerMatches(details, ownerMemberProfileId, ownerUserId))
    .map(({ details }) => mapRegisterDetails(details))
    .filter((entry): entry is FileAssetRecord => Boolean(entry));

  const withStatus = applyStatusUpdatesFromLogs(registered, logs);
  const deduped = new Map<string, FileAssetRecord>();
  for (const record of withStatus.sort(compareNewest)) {
    if (!deduped.has(record.id)) deduped.set(record.id, record);
  }
  return Array.from(deduped.values()).sort(compareNewest);
}

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const lengthCheck = enforceContentLength(req, 80_000);
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

    const action = text(payload.action || 'register').toLowerCase();
    if (!['register', 'list', 'set_status'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { ownerMemberProfileId, ownerUserId } = resolveOwner(memberProfile, adminUser);
    if (!ownerMemberProfileId && !ownerUserId) {
      return Response.json({ error: 'Unable to resolve owner identity' }, { status: 403 });
    }

    if (action === 'register') {
      const record = normalizeRecord({
        payload,
        ownerMemberProfileId,
        ownerUserId,
      });
      const entityRow = await registerViaEntity(base44, record);
      if (entityRow) {
        return Response.json({
          success: true,
          action,
          asset: record,
          storage: 'entity',
          rowId: text(entityRow?.id) || null,
        });
      }

      const log = await writeRegisterEvent(base44, ownerMemberProfileId, record);
      return Response.json({
        success: true,
        action,
        asset: record,
        storage: 'event_log',
        logId: text(log?.id) || null,
      });
    }

    if (action === 'set_status') {
      const rawAssetId = text(payload.assetId || payload.id);
      if (!rawAssetId) {
        return Response.json({ error: 'assetId is required' }, { status: 400 });
      }
      const assetId = normalizeAssetId(rawAssetId);
      const status = normalizeStatus(payload.status || 'ACTIVE');
      const reason = text(payload.reason || 'manual_status_change', 'manual_status_change');
      const retentionExpiresAt = payload.retentionExpiresAt
        ? parseCreatedAt(payload.retentionExpiresAt)
        : null;

      const entity = resolveFileAssetEntity(base44);
      let updated = false;
      if (entity?.filter && entity?.update) {
        const ownerFilter = ownerMemberProfileId
          ? { owner_member_profile_id: ownerMemberProfileId }
          : { owner_user_id: ownerUserId };
        const rows = await entity.filter(ownerFilter, '-created_date', 260).catch(() => []);
        if (Array.isArray(rows)) {
          const target = rows.find((entry: any) => normalizeAssetId(entry?.id) === assetId);
          if (target?.id) {
            await entity
              .update(target.id, {
                status,
                retention_expires_at: retentionExpiresAt,
                updated_at: nowIso(),
              })
              .catch(() => null);
            updated = true;
          }
        }
      }

      await writeStatusEvent(base44, ownerMemberProfileId, {
        assetId,
        status,
        reason,
        retentionExpiresAt,
      });

      return Response.json({
        success: true,
        action,
        assetId,
        status,
        updatedEntity: updated,
      });
    }

    const requestedLimit = Math.floor(safeNumber(payload.limit, 120));
    const limit = Math.max(1, Math.min(requestedLimit, 350));

    const entityRecords = await listFromEntity(base44, ownerMemberProfileId, ownerUserId);
    const eventRecords = await listFromEventLogs(base44, ownerMemberProfileId, ownerUserId);
    const byId = new Map<string, FileAssetRecord>();
    for (const record of [...entityRecords, ...eventRecords].sort(compareNewest)) {
      if (!byId.has(record.id)) byId.set(record.id, record);
    }

    const merged = Array.from(byId.values());
    const filtered = applyFilters(merged, {
      sourceType: text(payload.sourceType || payload.source_type),
      sourceId: normalizeOptionalToken(payload.sourceId || payload.source_id),
      channelId: normalizeOptionalToken(payload.channelId || payload.channel_id),
      eventId: normalizeOptionalToken(payload.eventId || payload.event_id),
      includeExpired: payload.includeExpired === true,
      status: text(payload.status),
    }).sort(compareNewest);

    const nowMs = Date.now();
    const assets = filtered.slice(0, limit).map((entry) => {
      const expiresMs = Date.parse(String(entry.retentionExpiresAt || ''));
      const expired = Number.isFinite(expiresMs) ? expiresMs <= nowMs : false;
      return {
        ...entry,
        status: expired && entry.status === 'ACTIVE' ? 'EXPIRED' : entry.status,
      };
    });

    return Response.json({
      success: true,
      action,
      assets,
      count: assets.length,
    });
  } catch (error) {
    console.error('[updateFileAssets]', error instanceof Error ? error.message : error);
    return Response.json({ error: 'File asset update failed' }, { status: 500 });
  }
});
