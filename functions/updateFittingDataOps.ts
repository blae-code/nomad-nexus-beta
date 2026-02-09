import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const LANES = ['reference', 'market', 'live'] as const;
type Lane = (typeof LANES)[number];
type LaneMap<T> = Record<Lane, T>;

const DEFAULT_POLICIES: LaneMap<{ cadenceMinutes: number; ttlMinutes: number }> = {
  reference: { cadenceMinutes: 360, ttlMinutes: 1440 },
  market: { cadenceMinutes: 15, ttlMinutes: 120 },
  live: { cadenceMinutes: 1, ttlMinutes: 5 },
};

const DEFAULT_SEED_DATA: LaneMap<any[]> = {
  reference: [
    {
      id: 'ship_gladius',
      type: 'ship',
      name: 'Aegis Gladius',
      manufacturer: 'Aegis',
      hardpoints: { weapons: 3, shields: 1, utility: 1 },
      stats: { speed_scm: 220, cargo_scu: 0, hull_hp: 5200 },
      source_version: 'seed-reference-v1',
    },
    {
      id: 'component_shield_fr66',
      type: 'component',
      name: 'FR-66 Shield Generator',
      manufacturer: 'Sukoran',
      class: 'Military',
      size: 2,
      stats: { hp: 12000, regen_delay_s: 6.4 },
      source_version: 'seed-reference-v1',
    },
  ],
  market: [
    {
      id: 'market_ship_gladius',
      target_id: 'ship_gladius',
      price_auec: 1170000,
      region: 'Stanton',
      availability: 'high',
      source_version: 'seed-market-v1',
    },
    {
      id: 'market_component_shield_fr66',
      target_id: 'component_shield_fr66',
      price_auec: 69200,
      region: 'Stanton',
      availability: 'medium',
      source_version: 'seed-market-v1',
    },
  ],
  live: [
    {
      id: 'live_ship_gladius',
      target_id: 'ship_gladius',
      telemetry: { integrity_pct: 97, fuel_pct: 82, shield_pct: 65 },
      location: 'Yela Orbit',
      source_version: 'seed-live-v1',
      updated_at: new Date().toISOString(),
    },
  ],
};

const ALERT_COOLDOWN_MINUTES = 30;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toLower(value: unknown) {
  return text(value).toLowerCase();
}

function asBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = toLower(value);
  if (!normalized) return fallback;
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseLane(value: unknown): Lane | null {
  const normalized = toLower(value);
  if (normalized === 'reference' || normalized === 'market' || normalized === 'live') return normalized;
  return null;
}

function parseLaneSelection(value: unknown): Lane[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => parseLane(entry))
      .filter(Boolean) as Lane[];
  }
  const direct = parseLane(value);
  if (direct) return [direct];
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => parseLane(entry))
    .filter(Boolean) as Lane[];
}

function hasDataOpsAccess(actorType: 'admin' | 'member' | null, memberProfile: any) {
  if (actorType === 'admin') return true;
  if (!memberProfile) return false;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((entry: unknown) => String(entry || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command') || roles.includes('operations');
}

function normalizeSourceConfig(entry: any) {
  const lane = parseLane(entry?.lane || entry?.details?.lane || entry?.source_name?.replace('lane:', ''));
  if (!lane) return null;
  return {
    id: text(entry?.id),
    lane,
    endpointUrl: text(entry?.endpoint_url || entry?.endpointUrl || entry?.details?.endpoint_url),
    enabled: entry?.enabled == null ? true : asBool(entry?.enabled, true),
    cadenceMinutes: Math.max(1, asNumber(entry?.cadence_minutes || entry?.cadenceMinutes || entry?.details?.cadence_minutes, DEFAULT_POLICIES[lane].cadenceMinutes)),
    ttlMinutes: Math.max(1, asNumber(entry?.ttl_minutes || entry?.ttlMinutes || entry?.details?.ttl_minutes, DEFAULT_POLICIES[lane].ttlMinutes)),
    authHeader: text(entry?.auth_header || entry?.authHeader || entry?.details?.auth_header),
    notes: text(entry?.notes || entry?.details?.notes),
    updatedAt: entry?.updated_date || entry?.created_date || null,
  };
}

function normalizeSnapshotEntry(entry: any) {
  const details = entry?.details || {};
  const lane = parseLane(details?.lane || details?.data_lane);
  if (!lane) return null;
  const generatedAt = details?.generated_at || entry?.created_date || null;
  const generatedMs = generatedAt ? new Date(generatedAt).getTime() : NaN;
  return {
    id: text(entry?.id),
    lane,
    generatedAt,
    generatedMs: Number.isFinite(generatedMs) ? generatedMs : 0,
    sourceMode: text(details?.source_mode || 'unknown'),
    sourceVersion: text(details?.source_version || details?.version),
    sourceUrl: text(details?.source_url),
    checksum: text(details?.checksum),
    recordCount: Math.max(0, asNumber(details?.record_count, 0)),
    records: Array.isArray(details?.records) ? details.records : [],
  };
}

function normalizeRunEntry(entry: any) {
  const details = entry?.details || {};
  const lane = parseLane(details?.lane || details?.data_lane);
  if (!lane) return null;
  return {
    id: text(entry?.id),
    lane,
    status: text(details?.status || 'unknown').toLowerCase(),
    summary: text(entry?.summary),
    sourceMode: text(details?.source_mode || 'unknown'),
    recordCount: Math.max(0, asNumber(details?.record_count, 0)),
    startedAt: details?.started_at || null,
    finishedAt: details?.finished_at || entry?.created_date || null,
    message: text(details?.message || details?.error || ''),
    createdAt: entry?.created_date || null,
  };
}

function normalizeAlertEntry(entry: any) {
  const details = entry?.details || {};
  const lane = parseLane(details?.lane || details?.data_lane);
  if (!lane) return null;
  const createdAt = entry?.created_date || details?.created_at || null;
  return {
    id: text(entry?.id),
    lane,
    status: text(details?.status || 'stale').toLowerCase(),
    summary: text(entry?.summary),
    severity: text(entry?.severity || 'LOW').toUpperCase(),
    ageMinutes: asNumber(details?.age_minutes, 0),
    ttlMinutes: asNumber(details?.ttl_minutes, DEFAULT_POLICIES[lane].ttlMinutes),
    cadenceMinutes: asNumber(details?.cadence_minutes, DEFAULT_POLICIES[lane].cadenceMinutes),
    createdAt,
    createdMs: createdAt ? new Date(createdAt).getTime() : 0,
  };
}

function computeChecksum(records: any[]) {
  const serialized = JSON.stringify(records || []);
  let hash = 0;
  for (let i = 0; i < serialized.length; i += 1) {
    hash = ((hash << 5) - hash) + serialized.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function normalizeRecords(payload: unknown, lane: Lane) {
  const source = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};
  let rows: unknown[] = [];
  if (Array.isArray(payload)) rows = payload;
  else if (Array.isArray(source.records)) rows = source.records;
  else if (Array.isArray(source.items)) rows = source.items;
  else if (Array.isArray(source.data)) rows = source.data;

  return rows
    .slice(0, 600)
    .map((entry, index) => {
      const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : { value: entry };
      const id = text(row.id || row.code || row.slug || row.name, `${lane}_${index + 1}`);
      return {
        id,
        ...row,
      };
    });
}

function normalizeSnapshotForHealth(snapshot: any) {
  return {
    lane: snapshot?.lane,
    generatedAt: snapshot?.generated_at || snapshot?.generatedAt || null,
    generatedMs: snapshot?.generated_at
      ? new Date(snapshot.generated_at).getTime()
      : snapshot?.generatedAt
        ? new Date(snapshot.generatedAt).getTime()
        : 0,
    sourceMode: text(snapshot?.source_mode || snapshot?.sourceMode),
    sourceVersion: text(snapshot?.source_version || snapshot?.sourceVersion),
    sourceUrl: text(snapshot?.source_url || snapshot?.sourceUrl),
    checksum: text(snapshot?.checksum),
    recordCount: asNumber(snapshot?.record_count || snapshot?.recordCount, 0),
    records: Array.isArray(snapshot?.records) ? snapshot.records : [],
  };
}

async function fetchJsonWithTimeout(url: string, headers: HeadersInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function listIntegrationConfigs(base44: any) {
  try {
    return await base44.entities.IntegrationConfig.list('-created_date', 300);
  } catch {
    return [];
  }
}

async function loadSourceConfigs(base44: any): Promise<LaneMap<any>> {
  const configs = await listIntegrationConfigs(base44);
  const byLane: LaneMap<any> = {
    reference: { lane: 'reference', ...DEFAULT_POLICIES.reference, enabled: true, endpointUrl: '', authHeader: '', notes: '' },
    market: { lane: 'market', ...DEFAULT_POLICIES.market, enabled: true, endpointUrl: '', authHeader: '', notes: '' },
    live: { lane: 'live', ...DEFAULT_POLICIES.live, enabled: true, endpointUrl: '', authHeader: '', notes: '' },
  };

  for (const config of configs) {
    if (text(config?.provider).toUpperCase() !== 'FITTING_DATA_SOURCE') continue;
    const normalized = normalizeSourceConfig(config);
    if (!normalized) continue;
    byLane[normalized.lane] = normalized;
  }
  return byLane;
}

async function loadDataLogs(base44: any) {
  try {
    const entries = await base44.entities.EventLog.list('-created_date', 900);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function deriveStateFromLogs(logs: any[]) {
  const snapshotsByLane: LaneMap<any> = {
    reference: null,
    market: null,
    live: null,
  };
  const runs: any[] = [];
  const alerts: any[] = [];
  const latestAlertByLane: LaneMap<any> = {
    reference: null,
    market: null,
    live: null,
  };

  for (const entry of logs) {
    const type = text(entry?.type).toUpperCase();
    if (type === 'FIT_DATA_SNAPSHOT') {
      const normalized = normalizeSnapshotEntry(entry);
      if (!normalized) continue;
      if (!snapshotsByLane[normalized.lane] || normalized.generatedMs > snapshotsByLane[normalized.lane].generatedMs) {
        snapshotsByLane[normalized.lane] = normalized;
      }
    } else if (type === 'FIT_SYNC_RUN') {
      const run = normalizeRunEntry(entry);
      if (run) runs.push(run);
    } else if (type === 'FIT_SYNC_ALERT') {
      const alert = normalizeAlertEntry(entry);
      if (!alert) continue;
      alerts.push(alert);
      if (!latestAlertByLane[alert.lane] || alert.createdMs > latestAlertByLane[alert.lane].createdMs) {
        latestAlertByLane[alert.lane] = alert;
      }
    }
  }

  return {
    snapshotsByLane,
    runs: runs.slice(0, 50),
    alerts: alerts.slice(0, 50),
    latestAlertByLane,
  };
}

function computeHealth(sourceConfigs: LaneMap<any>, snapshots: LaneMap<any>) {
  const now = Date.now();
  const lanes: LaneMap<any> = {
    reference: null,
    market: null,
    live: null,
  };

  for (const lane of LANES) {
    const source = sourceConfigs[lane];
    const snapshot = snapshots[lane];
    const ttlMinutes = Math.max(1, asNumber(source?.ttlMinutes, DEFAULT_POLICIES[lane].ttlMinutes));
    const cadenceMinutes = Math.max(1, asNumber(source?.cadenceMinutes, DEFAULT_POLICIES[lane].cadenceMinutes));
    const ageMinutes = snapshot?.generatedMs
      ? Math.max(0, Math.floor((now - snapshot.generatedMs) / 60000))
      : null;
    const stale = ageMinutes == null ? true : ageMinutes > ttlMinutes;
    const nextDueAt = snapshot?.generatedMs
      ? new Date(snapshot.generatedMs + (cadenceMinutes * 60000)).toISOString()
      : null;

    lanes[lane] = {
      lane,
      status: stale ? 'stale' : 'fresh',
      stale,
      ageMinutes,
      ttlMinutes,
      cadenceMinutes,
      generatedAt: snapshot?.generatedAt || null,
      nextDueAt,
      recordCount: snapshot?.recordCount || 0,
      checksum: snapshot?.checksum || '',
      sourceMode: snapshot?.sourceMode || 'unknown',
      sourceVersion: snapshot?.sourceVersion || '',
      sourceUrl: source?.endpointUrl || '',
      sourceEnabled: source?.enabled !== false,
    };
  }

  const staleCount = LANES.filter((lane) => lanes[lane].stale).length;
  return {
    staleCount,
    allFresh: staleCount === 0,
    lanes,
    generatedAt: new Date().toISOString(),
  };
}

function buildDuePlan(sourceConfigs: LaneMap<any>, snapshotsByLane: LaneMap<any>, selectedLanes: Lane[]) {
  const now = Date.now();
  const selectedSet = new Set<Lane>(selectedLanes.length ? selectedLanes : LANES);
  return LANES.map((lane) => {
    const source = sourceConfigs[lane];
    const enabled = source?.enabled !== false;
    const cadenceMinutes = Math.max(1, asNumber(source?.cadenceMinutes, DEFAULT_POLICIES[lane].cadenceMinutes));
    const snapshot = snapshotsByLane[lane];
    const ageMinutes = snapshot?.generatedMs
      ? Math.max(0, Math.floor((now - snapshot.generatedMs) / 60000))
      : null;
    const due = ageMinutes == null ? true : ageMinutes >= cadenceMinutes;
    return {
      lane,
      selected: selectedSet.has(lane),
      enabled,
      due,
      ageMinutes,
      cadenceMinutes,
      reason: !enabled
        ? 'disabled'
        : ageMinutes == null
          ? 'missing_snapshot'
          : due
            ? 'cadence_elapsed'
            : 'within_cadence',
    };
  });
}

async function upsertSourceConfig(base44: any, config: any) {
  const lane = parseLane(config?.lane);
  if (!lane) throw new Error('Invalid lane');
  const payload = {
    provider: 'FITTING_DATA_SOURCE',
    source_name: `lane:${lane}`,
    lane,
    endpoint_url: text(config?.endpointUrl || config?.endpoint_url),
    auth_header: text(config?.authHeader || config?.auth_header),
    enabled: asBool(config?.enabled, true),
    cadence_minutes: Math.max(1, asNumber(config?.cadenceMinutes || config?.cadence_minutes, DEFAULT_POLICIES[lane].cadenceMinutes)),
    ttl_minutes: Math.max(1, asNumber(config?.ttlMinutes || config?.ttl_minutes, DEFAULT_POLICIES[lane].ttlMinutes)),
    notes: text(config?.notes),
    details: {
      lane,
      endpoint_url: text(config?.endpointUrl || config?.endpoint_url),
      cadence_minutes: Math.max(1, asNumber(config?.cadenceMinutes || config?.cadence_minutes, DEFAULT_POLICIES[lane].cadenceMinutes)),
      ttl_minutes: Math.max(1, asNumber(config?.ttlMinutes || config?.ttl_minutes, DEFAULT_POLICIES[lane].ttlMinutes)),
      auth_header: text(config?.authHeader || config?.auth_header),
      notes: text(config?.notes),
    },
  };

  const configs = await listIntegrationConfigs(base44);
  const existing = configs.find((entry: any) =>
    text(entry?.provider).toUpperCase() === 'FITTING_DATA_SOURCE'
    && parseLane(entry?.lane || entry?.details?.lane || entry?.source_name?.replace('lane:', '')) === lane
  );
  if (existing?.id) {
    return await base44.entities.IntegrationConfig.update(existing.id, payload);
  }
  return await base44.entities.IntegrationConfig.create(payload);
}

async function runLaneSync(params: {
  base44: any;
  actorMemberId: string | null;
  lane: Lane;
  source: any;
  payload: any;
}) {
  const { base44, actorMemberId, lane, source, payload } = params;
  const syncMode = toLower(payload?.mode || payload?.sync_mode || 'auto');
  const startedAt = new Date().toISOString();
  let records: any[] = [];
  let sourceMode = 'seed';
  let sourceUrl = '';
  let sourceVersion = '';

  try {
    if (syncMode === 'seed') {
      records = normalizeRecords(DEFAULT_SEED_DATA[lane], lane);
      sourceMode = 'seed';
      sourceVersion = `seed-${lane}-v1`;
    } else {
      const endpointUrl = text(payload?.endpointUrl || payload?.endpoint_url || source?.endpointUrl);
      if (!endpointUrl) {
        records = normalizeRecords(DEFAULT_SEED_DATA[lane], lane);
        sourceMode = 'seed_fallback';
        sourceVersion = `seed-${lane}-v1`;
      } else {
        const authHeader = text(payload?.authHeader || payload?.auth_header || source?.authHeader);
        const headers: Record<string, string> = { accept: 'application/json' };
        if (authHeader) headers.authorization = authHeader;
        const remotePayload = await fetchJsonWithTimeout(endpointUrl, headers, Math.max(2000, asNumber(payload?.timeoutMs, 10000)));
        records = normalizeRecords(remotePayload, lane);
        sourceMode = 'remote';
        sourceUrl = endpointUrl;
        sourceVersion = text(
          (remotePayload as any)?.version
          || (remotePayload as any)?.source_version
          || (remotePayload as any)?.meta?.version,
          `remote-${lane}-${new Date().toISOString().slice(0, 10)}`
        );
      }
    }
  } catch (error) {
    records = normalizeRecords(DEFAULT_SEED_DATA[lane], lane);
    sourceMode = 'seed_on_error';
    sourceVersion = `seed-${lane}-v1`;
    await base44.entities.EventLog.create({
      type: 'FIT_SYNC_RUN',
      severity: 'MEDIUM',
      actor_member_profile_id: actorMemberId,
      summary: `Fitting sync fallback (${lane})`,
      details: {
        lane,
        status: 'fallback',
        source_mode: sourceMode,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        message: text((error as Error)?.message || 'Remote source fetch failed'),
        record_count: records.length,
      },
    });
  }

  const snapshot = {
    lane,
    generated_at: new Date().toISOString(),
    source_mode: sourceMode,
    source_url: sourceUrl,
    source_version: sourceVersion || `local-${lane}-${Date.now()}`,
    record_count: records.length,
    checksum: computeChecksum(records),
    records,
  };

  await base44.entities.EventLog.create({
    type: 'FIT_DATA_SNAPSHOT',
    severity: 'LOW',
    actor_member_profile_id: actorMemberId,
    summary: `Fitting snapshot refreshed (${lane})`,
    details: snapshot,
  });

  await base44.entities.EventLog.create({
    type: 'FIT_SYNC_RUN',
    severity: 'LOW',
    actor_member_profile_id: actorMemberId,
    summary: `Fitting sync completed (${lane})`,
    details: {
      lane,
      status: 'success',
      source_mode: sourceMode,
      source_url: sourceUrl,
      source_version: snapshot.source_version,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      record_count: records.length,
    },
  });

  return snapshot;
}

function alertSeverityForLane(lane: Lane) {
  if (lane === 'live') return 'HIGH';
  if (lane === 'market') return 'MEDIUM';
  return 'LOW';
}

async function emitFreshnessAlerts(params: {
  base44: any;
  actorMemberId: string | null;
  health: any;
  latestAlertByLane: LaneMap<any>;
  cooldownMinutes: number;
}) {
  const { base44, actorMemberId, health, latestAlertByLane, cooldownMinutes } = params;
  const emitted: any[] = [];
  const now = Date.now();

  for (const lane of LANES) {
    const laneHealth = health?.lanes?.[lane];
    if (!laneHealth) continue;
    const lastAlert = latestAlertByLane[lane];
    const lastStatus = text(lastAlert?.status).toLowerCase();
    const lastCreatedMs = asNumber(lastAlert?.createdMs, 0);
    const minutesSinceLast = lastCreatedMs > 0 ? Math.floor((now - lastCreatedMs) / 60000) : null;

    if (laneHealth.stale) {
      const onCooldown = lastStatus === 'stale'
        && minutesSinceLast != null
        && minutesSinceLast < cooldownMinutes;
      if (onCooldown) continue;

      const alert = await base44.entities.EventLog.create({
        type: 'FIT_SYNC_ALERT',
        severity: alertSeverityForLane(lane),
        actor_member_profile_id: actorMemberId,
        summary: `Fitting data stale (${lane})`,
        details: {
          lane,
          status: 'stale',
          age_minutes: laneHealth.ageMinutes,
          ttl_minutes: laneHealth.ttlMinutes,
          cadence_minutes: laneHealth.cadenceMinutes,
          record_count: laneHealth.recordCount,
          next_due_at: laneHealth.nextDueAt,
          created_at: new Date().toISOString(),
          cooldown_minutes: cooldownMinutes,
        },
      });
      emitted.push(normalizeAlertEntry(alert));
      continue;
    }

    if (lastStatus === 'stale') {
      const resolved = await base44.entities.EventLog.create({
        type: 'FIT_SYNC_ALERT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Fitting data recovered (${lane})`,
        details: {
          lane,
          status: 'resolved',
          age_minutes: laneHealth.ageMinutes,
          ttl_minutes: laneHealth.ttlMinutes,
          cadence_minutes: laneHealth.cadenceMinutes,
          record_count: laneHealth.recordCount,
          next_due_at: laneHealth.nextDueAt,
          created_at: new Date().toISOString(),
        },
      });
      emitted.push(normalizeAlertEntry(resolved));
    }
  }

  return emitted;
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = toLower(payload?.action);
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    if (!hasDataOpsAccess(actorType, memberProfile)) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const actorMemberId = memberProfile?.id || null;

    if (action === 'save_source') {
      const lane = parseLane(payload?.lane);
      if (!lane) {
        return Response.json({ error: 'lane required (reference|market|live)' }, { status: 400 });
      }
      const updated = await upsertSourceConfig(base44, payload);
      await base44.entities.EventLog.create({
        type: 'FIT_SYNC_RUN',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Updated fitting data source (${lane})`,
        details: {
          lane,
          status: 'config_updated',
          source_mode: 'config',
          finished_at: new Date().toISOString(),
        },
      });
      return Response.json({ success: true, action, lane, source: normalizeSourceConfig(updated) });
    }

    if (action === 'get_snapshot') {
      const sourceConfigs = await loadSourceConfigs(base44);
      const logs = await loadDataLogs(base44);
      const state = deriveStateFromLogs(logs);
      const health = computeHealth(sourceConfigs, state.snapshotsByLane);
      const selectedLanes = parseLaneSelection(payload?.lanes || payload?.lane);
      const duePlan = buildDuePlan(sourceConfigs, state.snapshotsByLane, selectedLanes);
      return Response.json({
        success: true,
        action,
        sourceConfigs,
        snapshots: state.snapshotsByLane,
        runs: state.runs.slice(0, 25),
        alerts: state.alerts.slice(0, 25),
        health,
        duePlan,
      });
    }

    if (action === 'run_sync') {
      const lane = parseLane(payload?.lane);
      if (!lane) {
        return Response.json({ error: 'lane required (reference|market|live)' }, { status: 400 });
      }

      const sourceConfigs = await loadSourceConfigs(base44);
      const source = sourceConfigs[lane];
      const force = asBool(payload?.force, false);
      if (!force && source?.enabled === false) {
        return Response.json({ error: `Source lane ${lane} is disabled` }, { status: 409 });
      }

      const snapshot = await runLaneSync({
        base44,
        actorMemberId,
        lane,
        source,
        payload,
      });

      const logsAfter = await loadDataLogs(base44);
      const stateAfter = deriveStateFromLogs(logsAfter);
      if (!stateAfter.snapshotsByLane[lane]) {
        stateAfter.snapshotsByLane[lane] = normalizeSnapshotForHealth(snapshot);
      }
      const health = computeHealth(sourceConfigs, stateAfter.snapshotsByLane);

      return Response.json({
        success: true,
        action,
        lane,
        snapshot,
        health: health.lanes[lane],
      });
    }

    if (action === 'run_due_syncs') {
      const sourceConfigs = await loadSourceConfigs(base44);
      const logsBefore = await loadDataLogs(base44);
      const stateBefore = deriveStateFromLogs(logsBefore);
      const selectedLanes = parseLaneSelection(payload?.lanes || payload?.lane);
      const duePlan = buildDuePlan(sourceConfigs, stateBefore.snapshotsByLane, selectedLanes);
      const dryRun = asBool(payload?.dryRun || payload?.dry_run, false);
      const forceAll = asBool(payload?.forceAll || payload?.force_all || payload?.force, false);
      const emitAlerts = asBool(payload?.emitAlerts ?? payload?.emit_alerts, true);
      const mode = toLower(payload?.mode || payload?.sync_mode || 'auto');

      const synced: any[] = [];
      const skipped: any[] = [];

      if (!dryRun) {
        for (const decision of duePlan) {
          if (!decision.selected) continue;
          if (!decision.enabled && !forceAll) {
            skipped.push({ lane: decision.lane, reason: 'disabled' });
            continue;
          }
          if (!decision.due && !forceAll) {
            skipped.push({ lane: decision.lane, reason: 'not_due' });
            continue;
          }

          try {
            const snapshot = await runLaneSync({
              base44,
              actorMemberId,
              lane: decision.lane,
              source: sourceConfigs[decision.lane],
              payload: { ...payload, mode },
            });
            synced.push({
              lane: decision.lane,
              sourceMode: text(snapshot?.source_mode || mode),
              recordCount: asNumber(snapshot?.record_count, 0),
              generatedAt: snapshot?.generated_at || null,
            });
          } catch (error) {
            skipped.push({
              lane: decision.lane,
              reason: 'sync_failed',
              message: text((error as Error)?.message || 'Sync failed'),
            });
          }
        }
      }

      let logsAfter = await loadDataLogs(base44);
      let stateAfter = deriveStateFromLogs(logsAfter);
      const health = computeHealth(sourceConfigs, stateAfter.snapshotsByLane);
      let alertsEmitted: any[] = [];

      if (emitAlerts) {
        alertsEmitted = await emitFreshnessAlerts({
          base44,
          actorMemberId,
          health,
          latestAlertByLane: stateAfter.latestAlertByLane,
          cooldownMinutes: Math.max(1, asNumber(payload?.alertCooldownMinutes, ALERT_COOLDOWN_MINUTES)),
        });
        if (alertsEmitted.length > 0) {
          logsAfter = await loadDataLogs(base44);
          stateAfter = deriveStateFromLogs(logsAfter);
        }
      }

      const healthAfter = computeHealth(sourceConfigs, stateAfter.snapshotsByLane);
      return Response.json({
        success: true,
        action,
        dryRun,
        synced,
        skipped,
        duePlan,
        runs: stateAfter.runs.slice(0, 25),
        alerts: stateAfter.alerts.slice(0, 25),
        alertsEmitted,
        health: healthAfter,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateFittingDataOps] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
