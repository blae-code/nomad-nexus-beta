import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const CURATOR_ROLES = new Set(['admin', 'command', 'officer', 'archivist', 'intel']);

type PayloadRecord = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => text(entry)).filter(Boolean);
  }
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRecordType(value: unknown) {
  const type = text(value || 'event_report').toLowerCase();
  if (type === 'event_log' || type === 'knowledge') return 'event_log';
  return 'event_report';
}

function hasCuratorAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.some((role: string) => CURATOR_ROLES.has(role));
}

async function createFirstSuccessful(entity: any, attempts: PayloadRecord[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

async function writeVaultLog(base44: any, payload: PayloadRecord) {
  return createFirstSuccessful(base44.entities.EventLog, [
    payload,
    {
      type: payload.type,
      severity: payload.severity,
      actor_member_profile_id: payload.actor_member_profile_id,
      summary: payload.summary,
    },
  ]);
}

function buildArchiveStateMap(entries: any[]) {
  const map = new Map<string, { status: string; at: number }>();
  for (const entry of entries || []) {
    if (String(entry?.type || '').toUpperCase() !== 'DATA_VAULT_ARCHIVE_STATE') continue;
    const details = entry?.details || {};
    const recordType = normalizeRecordType(details?.record_type);
    const recordId = text(details?.record_id);
    if (!recordId) continue;
    const status = text(details?.status || 'archived').toLowerCase();
    const at = new Date(entry?.created_date || 0).getTime();
    const key = `${recordType}:${recordId}`;
    const existing = map.get(key);
    if (!existing || at >= existing.at) {
      map.set(key, { status, at });
    }
  }
  return map;
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

    const action = text(payload.action).toLowerCase();
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    const actorMemberId = memberProfile?.id || null;
    const curatorAccess = hasCuratorAccess(memberProfile, actorType);

    if (action === 'create_knowledge_entry') {
      const title = text(payload.title);
      const content = text(payload.content);
      if (!title || !content) {
        return Response.json({ error: 'title and content required' }, { status: 400 });
      }

      const entry = {
        id: `kb_${Date.now()}`,
        title,
        content,
        category: text(payload.category || 'general'),
        tags: asList(payload.tags),
        source_type: text(payload.sourceType || payload.source_type),
        source_id: text(payload.sourceId || payload.source_id),
        created_by_member_profile_id: actorMemberId,
        created_at: new Date().toISOString(),
      };

      const log = await writeVaultLog(base44, {
        type: 'DATA_VAULT_KNOWLEDGE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Knowledge entry: ${title}`,
        details: entry,
      });

      return Response.json({
        success: true,
        action,
        entry,
        logId: log?.id || null,
      });
    }

    if (action === 'create_document') {
      const title = text(payload.title);
      const content = text(payload.content);
      if (!title || !content) {
        return Response.json({ error: 'title and content required' }, { status: 400 });
      }

      const documentType = text(payload.documentType || payload.report_type || 'VAULT');
      const generatedAt = new Date().toISOString();
      const report = await createFirstSuccessful(base44.entities.EventReport, [
        {
          title,
          content,
          report_type: documentType,
          author_id: actorMemberId,
          generated_at: generatedAt,
          tags: asList(payload.tags),
        },
        {
          report_type: documentType,
          content,
          author_id: actorMemberId,
          generated_at: generatedAt,
        },
        {
          content,
        },
      ]);

      await writeVaultLog(base44, {
        type: 'DATA_VAULT_DOCUMENT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Document stored: ${title}`,
        details: {
          document_id: report?.id || null,
          title,
          report_type: documentType,
          tags: asList(payload.tags),
        },
      });

      return Response.json({
        success: true,
        action,
        document: report,
      });
    }

    if (action === 'archive_record' || action === 'unarchive_record') {
      if (!curatorAccess) {
        return Response.json({ error: 'Curator privileges required' }, { status: 403 });
      }
      const recordId = text(payload.recordId || payload.record_id);
      if (!recordId) {
        return Response.json({ error: 'recordId required' }, { status: 400 });
      }

      const recordType = normalizeRecordType(payload.recordType || payload.record_type);
      const status = action === 'archive_record' ? 'archived' : 'active';

      const change = {
        id: `archive_state_${Date.now()}`,
        record_type: recordType,
        record_id: recordId,
        status,
        reason: text(payload.reason),
        changed_by_member_profile_id: actorMemberId,
        changed_at: new Date().toISOString(),
      };

      const log = await writeVaultLog(base44, {
        type: 'DATA_VAULT_ARCHIVE_STATE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `${recordType}:${recordId} -> ${status}`,
        details: change,
      });

      return Response.json({
        success: true,
        action,
        archiveState: change,
        logId: log?.id || null,
      });
    }

    if (action === 'run_auto_archive') {
      if (!curatorAccess) {
        return Response.json({ error: 'Curator privileges required' }, { status: 403 });
      }
      const thresholdDays = Math.max(1, Number(payload.days || 30));
      const thresholdMs = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;

      const [reports, logs] = await Promise.all([
        base44.entities.EventReport.list('-created_date', 600).catch(() => []),
        base44.entities.EventLog.list('-created_date', 600).catch(() => []),
      ]);
      const archiveStateMap = buildArchiveStateMap(logs || []);

      let archivedCount = 0;
      const archivedIds: string[] = [];

      for (const report of reports || []) {
        const createdAt = new Date(report?.created_date || report?.generated_at || 0).getTime();
        if (!Number.isFinite(createdAt) || createdAt > thresholdMs) continue;
        const key = `event_report:${report.id}`;
        if (archiveStateMap.get(key)?.status === 'archived') continue;

        await writeVaultLog(base44, {
          type: 'DATA_VAULT_ARCHIVE_STATE',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `event_report:${report.id} -> archived (auto)`,
          details: {
            record_type: 'event_report',
            record_id: report.id,
            status: 'archived',
            reason: `Auto-archive threshold ${thresholdDays} days`,
            changed_by_member_profile_id: actorMemberId,
            changed_at: new Date().toISOString(),
            auto: true,
          },
        });
        archivedCount += 1;
        archivedIds.push(report.id);
      }

      return Response.json({
        success: true,
        action,
        archivedCount,
        archivedIds,
      });
    }

    if (action === 'log_export') {
      const format = text(payload.format || 'pdf').toLowerCase();
      const count = Number(payload.recordCount || 0);
      const log = await writeVaultLog(base44, {
        type: 'DATA_VAULT_EXPORT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Vault export generated (${format})`,
        details: {
          format,
          record_count: count,
          generated_at: new Date().toISOString(),
        },
      });

      return Response.json({
        success: true,
        action,
        exportLogId: log?.id || null,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateDataVault] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
