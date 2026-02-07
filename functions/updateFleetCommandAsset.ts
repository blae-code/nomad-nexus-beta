import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const STATE_START = '[fleet_command_state]';
const STATE_END = '[/fleet_command_state]';

type UpdateAttempt = Record<string, unknown>;

type ReservationEntry = {
  reservation_id: string;
  start_time: string;
  end_time: string;
  operation_mode: 'casual' | 'focused';
  purpose: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  created_by_member_profile_id: string | null;
  created_at: string;
  cancelled_by_member_profile_id?: string | null;
  cancelled_at?: string | null;
};

type LoadoutEntry = {
  loadout_id: string;
  name: string;
  profile: Record<string, unknown>;
  tags: string[];
  created_by_member_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

type EngineeringTaskEntry = {
  task_id: string;
  summary: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'in_progress' | 'resolved' | 'cancelled';
  due_time: string | null;
  assigned_member_profile_id: string | null;
  created_by_member_profile_id: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes: string | null;
};

type FleetCommandState = {
  schema_version: number;
  reservations: ReservationEntry[];
  loadout_library: LoadoutEntry[];
  active_loadout_id: string | null;
  engineering_queue: EngineeringTaskEntry[];
};

function createDefaultState(): FleetCommandState {
  return {
    schema_version: 1,
    reservations: [],
    loadout_library: [],
    active_loadout_id: null,
    engineering_queue: [],
  };
}

function toIso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function stringToken(value: unknown, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function parseStringArray(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function parseMode(value: unknown): 'casual' | 'focused' {
  return String(value || '').toLowerCase() === 'focused' ? 'focused' : 'casual';
}

function parseSeverity(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium') return normalized;
  return 'low';
}

function parseTaskStatus(value: unknown): 'queued' | 'in_progress' | 'resolved' | 'cancelled' {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'resolved' || normalized === 'cancelled' || normalized === 'in_progress') return normalized;
  return 'queued';
}

function normalizeState(raw: unknown): FleetCommandState {
  if (!raw || typeof raw !== 'object') return createDefaultState();
  const base = raw as Record<string, unknown>;
  const state = createDefaultState();

  state.schema_version = Number(base.schema_version || 1) || 1;
  state.active_loadout_id = base.active_loadout_id ? String(base.active_loadout_id) : null;

  state.reservations = Array.isArray(base.reservations)
    ? base.reservations
        .map((entry) => {
          const reservation = entry as Record<string, unknown>;
          const start_time = toIso(reservation.start_time);
          const end_time = toIso(reservation.end_time);
          const reservation_id = stringToken(reservation.reservation_id);
          if (!reservation_id || !start_time || !end_time) return null;
          return {
            reservation_id,
            start_time,
            end_time,
            operation_mode: parseMode(reservation.operation_mode),
            purpose: stringToken(reservation.purpose, 'Fleet assignment'),
            status: String(reservation.status || 'scheduled').toLowerCase() === 'cancelled' ? 'cancelled' : 'scheduled',
            created_by_member_profile_id: reservation.created_by_member_profile_id
              ? String(reservation.created_by_member_profile_id)
              : null,
            created_at: toIso(reservation.created_at) || new Date().toISOString(),
            cancelled_by_member_profile_id: reservation.cancelled_by_member_profile_id
              ? String(reservation.cancelled_by_member_profile_id)
              : null,
            cancelled_at: toIso(reservation.cancelled_at),
          } as ReservationEntry;
        })
        .filter(Boolean) as ReservationEntry[]
    : [];

  state.loadout_library = Array.isArray(base.loadout_library)
    ? base.loadout_library
        .map((entry) => {
          const loadout = entry as Record<string, unknown>;
          const loadout_id = stringToken(loadout.loadout_id);
          const name = stringToken(loadout.name);
          if (!loadout_id || !name) return null;
          const profile =
            loadout.profile && typeof loadout.profile === 'object' && !Array.isArray(loadout.profile)
              ? (loadout.profile as Record<string, unknown>)
              : {};
          return {
            loadout_id,
            name,
            profile,
            tags: parseStringArray(loadout.tags),
            created_by_member_profile_id: loadout.created_by_member_profile_id
              ? String(loadout.created_by_member_profile_id)
              : null,
            created_at: toIso(loadout.created_at) || new Date().toISOString(),
            updated_at: toIso(loadout.updated_at) || new Date().toISOString(),
          } as LoadoutEntry;
        })
        .filter(Boolean) as LoadoutEntry[]
    : [];

  state.engineering_queue = Array.isArray(base.engineering_queue)
    ? base.engineering_queue
        .map((entry) => {
          const task = entry as Record<string, unknown>;
          const task_id = stringToken(task.task_id);
          const summary = stringToken(task.summary);
          if (!task_id || !summary) return null;
          return {
            task_id,
            summary,
            category: stringToken(task.category, 'systems'),
            severity: parseSeverity(task.severity),
            status: parseTaskStatus(task.status),
            due_time: toIso(task.due_time),
            assigned_member_profile_id: task.assigned_member_profile_id ? String(task.assigned_member_profile_id) : null,
            created_by_member_profile_id: task.created_by_member_profile_id ? String(task.created_by_member_profile_id) : null,
            created_at: toIso(task.created_at) || new Date().toISOString(),
            updated_at: toIso(task.updated_at) || new Date().toISOString(),
            resolution_notes: task.resolution_notes ? String(task.resolution_notes) : null,
          } as EngineeringTaskEntry;
        })
        .filter(Boolean) as EngineeringTaskEntry[]
    : [];

  return state;
}

function extractStateFromNotes(notes: unknown) {
  const text = String(notes || '');
  const regex = /\[fleet_command_state\]([\s\S]*?)\[\/fleet_command_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return createDefaultState();
  try {
    return normalizeState(JSON.parse(match[1]));
  } catch {
    return createDefaultState();
  }
}

function stripStateFromNotes(notes: unknown) {
  const text = String(notes || '');
  return text.replace(/\[fleet_command_state\][\s\S]*?\[\/fleet_command_state\]/gi, '').trim();
}

function encodeStateInNotes(notes: unknown, state: FleetCommandState) {
  const preserved = stripStateFromNotes(notes);
  const encoded = `${STATE_START}${JSON.stringify(normalizeState(state))}${STATE_END}`;
  return preserved ? `${preserved}\n\n${encoded}` : encoded;
}

function toTimestampId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(bStart).getTime() < new Date(aEnd).getTime();
}

function canManageAsset(actorMemberId: string | null, isCommandStaff: boolean, asset: any) {
  if (isCommandStaff) return true;
  if (!actorMemberId) return false;
  const ownerId = asset?.owner_member_profile_id ? String(asset.owner_member_profile_id) : null;
  const assignedId = asset?.assigned_member_profile_id
    ? String(asset.assigned_member_profile_id)
    : asset?.assigned_user_id
    ? String(asset.assigned_user_id)
    : null;
  return actorMemberId === ownerId || actorMemberId === assignedId;
}

async function applyFirstSuccessfulUpdate(base44: any, assetId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.FleetAsset.update(assetId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Fleet asset update failed');
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assetId = stringToken(payload.assetId || payload.asset_id);
    const action = stringToken(payload.action).toLowerCase();
    if (!assetId || !action) {
      return Response.json({ error: 'assetId and action required' }, { status: 400 });
    }

    const asset = await base44.entities.FleetAsset.get(assetId);
    if (!asset) {
      return Response.json({ error: 'Fleet asset not found' }, { status: 404 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorRank = String(memberProfile?.rank || '').toUpperCase();
    const isCommandStaff = actorType === 'admin' || isAdminMember(memberProfile) || COMMAND_RANKS.has(actorRank);
    const canManage = canManageAsset(actorMemberId, isCommandStaff, asset);

    const nowIso = new Date().toISOString();
    const state = extractStateFromNotes(asset?.maintenance_notes);
    let summary = '';
    let selectedLoadoutProfile: Record<string, unknown> | null = null;
    let statusOverride: string | null = null;
    const details: Record<string, unknown> = { asset_id: assetId, action };

    if (action === 'reserve_asset') {
      const reservation = payload.reservation || {};
      const start_time = toIso(reservation.start_time || payload.start_time);
      const end_time = toIso(reservation.end_time || payload.end_time);
      if (!start_time || !end_time) {
        return Response.json({ error: 'Valid reservation start_time and end_time required' }, { status: 400 });
      }
      if (new Date(end_time).getTime() <= new Date(start_time).getTime()) {
        return Response.json({ error: 'Reservation end_time must be after start_time' }, { status: 400 });
      }

      const hasOverlap = state.reservations.some((entry) => {
        if (entry.status !== 'scheduled') return false;
        return intervalsOverlap(entry.start_time, entry.end_time, start_time, end_time);
      });
      if (hasOverlap && !isCommandStaff) {
        return Response.json({ error: 'Reservation window overlaps existing reservation' }, { status: 409 });
      }

      const reservationEntry: ReservationEntry = {
        reservation_id: toTimestampId('res'),
        start_time,
        end_time,
        operation_mode: parseMode(reservation.operation_mode || payload.operation_mode),
        purpose: stringToken(reservation.purpose || payload.purpose, 'Fleet assignment'),
        status: 'scheduled',
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };
      state.reservations = [...state.reservations, reservationEntry].slice(-150);
      summary = `${asset?.name || 'Asset'} reserved for ${reservationEntry.operation_mode} operations`;
      details.reservation_id = reservationEntry.reservation_id;
    } else if (action === 'cancel_reservation') {
      const reservationId = stringToken(payload.reservationId || payload.reservation_id);
      if (!reservationId) {
        return Response.json({ error: 'reservationId required' }, { status: 400 });
      }
      const existing = state.reservations.find((entry) => entry.reservation_id === reservationId);
      if (!existing) {
        return Response.json({ error: 'Reservation not found' }, { status: 404 });
      }
      if (!isCommandStaff && actorMemberId && existing.created_by_member_profile_id !== actorMemberId) {
        return Response.json({ error: 'Only reservation owner or command staff can cancel' }, { status: 403 });
      }
      state.reservations = state.reservations.map((entry) =>
        entry.reservation_id === reservationId
          ? {
              ...entry,
              status: 'cancelled',
              cancelled_at: nowIso,
              cancelled_by_member_profile_id: actorMemberId,
            }
          : entry
      );
      summary = `${asset?.name || 'Asset'} reservation cancelled`;
      details.reservation_id = reservationId;
    } else if (action === 'save_loadout') {
      if (!canManage) {
        return Response.json({ error: 'Only assigned crew or command staff can manage loadouts' }, { status: 403 });
      }
      const loadout = payload.loadout || {};
      const name = stringToken(loadout.name || payload.name);
      const profile =
        loadout.profile && typeof loadout.profile === 'object' && !Array.isArray(loadout.profile)
          ? (loadout.profile as Record<string, unknown>)
          : payload.profile && typeof payload.profile === 'object' && !Array.isArray(payload.profile)
          ? (payload.profile as Record<string, unknown>)
          : null;

      if (!name || !profile) {
        return Response.json({ error: 'Loadout name and profile object required' }, { status: 400 });
      }

      const loadoutId = stringToken(loadout.loadout_id || payload.loadout_id || toTimestampId('loadout'));
      const tags = parseStringArray(loadout.tags || payload.tags);
      const existingIndex = state.loadout_library.findIndex((entry) => entry.loadout_id === loadoutId);

      const loadoutEntry: LoadoutEntry = {
        loadout_id: loadoutId,
        name,
        profile,
        tags,
        created_by_member_profile_id:
          existingIndex >= 0 ? state.loadout_library[existingIndex].created_by_member_profile_id : actorMemberId,
        created_at: existingIndex >= 0 ? state.loadout_library[existingIndex].created_at : nowIso,
        updated_at: nowIso,
      };

      if (existingIndex >= 0) {
        state.loadout_library[existingIndex] = loadoutEntry;
      } else {
        state.loadout_library = [...state.loadout_library, loadoutEntry].slice(-120);
      }

      if (Boolean(loadout.set_active || payload.set_active)) {
        state.active_loadout_id = loadoutId;
        selectedLoadoutProfile = profile;
      }

      summary = `${asset?.name || 'Asset'} loadout saved`;
      details.loadout_id = loadoutId;
    } else if (action === 'apply_loadout') {
      if (!canManage) {
        return Response.json({ error: 'Only assigned crew or command staff can apply loadouts' }, { status: 403 });
      }
      const loadoutId = stringToken(payload.loadoutId || payload.loadout_id);
      if (!loadoutId) {
        return Response.json({ error: 'loadoutId required' }, { status: 400 });
      }
      const existing = state.loadout_library.find((entry) => entry.loadout_id === loadoutId);
      if (!existing) {
        return Response.json({ error: 'Loadout not found' }, { status: 404 });
      }
      state.active_loadout_id = loadoutId;
      selectedLoadoutProfile = existing.profile;
      summary = `${asset?.name || 'Asset'} loadout applied`;
      details.loadout_id = loadoutId;
    } else if (action === 'queue_engineering_task') {
      if (!canManage) {
        return Response.json({ error: 'Only assigned crew or command staff can queue engineering tasks' }, { status: 403 });
      }
      const task = payload.task || {};
      const summaryText = stringToken(task.summary || payload.summary);
      if (!summaryText) {
        return Response.json({ error: 'Engineering task summary required' }, { status: 400 });
      }
      const engineeringTask: EngineeringTaskEntry = {
        task_id: toTimestampId('eng'),
        summary: summaryText,
        category: stringToken(task.category || payload.category, 'systems'),
        severity: parseSeverity(task.severity || payload.severity),
        status: 'queued',
        due_time: toIso(task.due_time || payload.due_time),
        assigned_member_profile_id: task.assigned_member_profile_id
          ? String(task.assigned_member_profile_id)
          : payload.assigned_member_profile_id
          ? String(payload.assigned_member_profile_id)
          : null,
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
        updated_at: nowIso,
        resolution_notes: null,
      };
      state.engineering_queue = [...state.engineering_queue, engineeringTask].slice(-200);
      if (engineeringTask.severity === 'critical' && String(asset.status || '').toUpperCase() !== 'DESTROYED') {
        statusOverride = 'MAINTENANCE';
      }
      summary = `${asset?.name || 'Asset'} engineering task queued`;
      details.task_id = engineeringTask.task_id;
    } else if (action === 'update_engineering_task') {
      if (!canManage) {
        return Response.json({ error: 'Only assigned crew or command staff can update engineering tasks' }, { status: 403 });
      }
      const taskId = stringToken(payload.taskId || payload.task_id);
      if (!taskId) {
        return Response.json({ error: 'taskId required' }, { status: 400 });
      }
      const taskIndex = state.engineering_queue.findIndex((entry) => entry.task_id === taskId);
      if (taskIndex < 0) {
        return Response.json({ error: 'Engineering task not found' }, { status: 404 });
      }
      const current = state.engineering_queue[taskIndex];
      const status = parseTaskStatus(payload.status || current.status);
      const resolutionNotes = payload.resolution_notes ? String(payload.resolution_notes) : current.resolution_notes;
      const dueTime = payload.due_time ? toIso(payload.due_time) : current.due_time;
      const normalizedResolutionNotes =
        resolutionNotes && String(resolutionNotes).trim() ? String(resolutionNotes).trim() : null;
      state.engineering_queue[taskIndex] = {
        ...current,
        status,
        summary: stringToken(payload.summary || current.summary, current.summary),
        category: stringToken(payload.category || current.category, current.category),
        severity: parseSeverity(payload.severity || current.severity),
        due_time: dueTime,
        resolution_notes: normalizedResolutionNotes,
        updated_at: nowIso,
      };

      const hasCriticalOpen = state.engineering_queue.some((entry) => entry.status !== 'resolved' && entry.status !== 'cancelled' && entry.severity === 'critical');
      if (!hasCriticalOpen && String(asset.status || '').toUpperCase() === 'MAINTENANCE') {
        statusOverride = 'OPERATIONAL';
      }
      if (hasCriticalOpen && String(asset.status || '').toUpperCase() !== 'DESTROYED') {
        statusOverride = 'MAINTENANCE';
      }
      summary = `${asset?.name || 'Asset'} engineering task updated`;
      details.task_id = taskId;
      details.status = status;
    } else {
      return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const nextState = normalizeState(state);
    const nextNotes = encodeStateInNotes(asset?.maintenance_notes, nextState);

    const attempts: UpdateAttempt[] = [];
    const structuredPayload: UpdateAttempt = {
      fleet_command_state: nextState,
      maintenance_notes: nextNotes,
    };
    if (selectedLoadoutProfile) structuredPayload.loadout = selectedLoadoutProfile;
    if (statusOverride) structuredPayload.status = statusOverride;
    attempts.push(structuredPayload);

    const notesPayload: UpdateAttempt = { maintenance_notes: nextNotes };
    if (selectedLoadoutProfile) notesPayload.loadout = selectedLoadoutProfile;
    if (statusOverride) notesPayload.status = statusOverride;
    attempts.push(notesPayload);

    if (statusOverride) attempts.push({ maintenance_notes: nextNotes, status: statusOverride });
    if (selectedLoadoutProfile) attempts.push({ maintenance_notes: nextNotes, loadout: selectedLoadoutProfile });
    attempts.push({ maintenance_notes: nextNotes });

    const updated = await applyFirstSuccessfulUpdate(base44, assetId, attempts);

    const ownerMemberId = asset?.owner_member_profile_id ? String(asset.owner_member_profile_id) : null;
    if (ownerMemberId && actorMemberId && ownerMemberId !== actorMemberId) {
      try {
        await base44.entities.Notification.create({
          user_id: ownerMemberId,
          type: 'system',
          title: 'Fleet Command Update',
          message: summary || `${asset?.name || 'Asset'} updated`,
          related_entity_type: 'fleet_asset',
          related_entity_id: assetId,
        });
      } catch (error) {
        console.error('[updateFleetCommandAsset] Notification failed:', error.message);
      }
    }

    const eventId = payload.eventId || payload.event_id || null;
    if (eventId) {
      try {
        await base44.entities.EventLog.create({
          event_id: eventId,
          type: 'FLEET_COMMAND',
          severity: action.includes('engineering') ? 'MEDIUM' : 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: summary || `${asset?.name || 'Fleet asset'} updated`,
          details,
        });
      } catch (error) {
        console.error('[updateFleetCommandAsset] EventLog failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      action,
      asset: updated,
      state: nextState,
      summary,
    });
  } catch (error) {
    console.error('[updateFleetCommandAsset] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
