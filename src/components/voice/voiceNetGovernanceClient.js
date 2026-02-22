import { invokeMemberFunction } from '@/api/memberFunctions';
import { base44 } from '@/api/base44Client';

function toPayload(response) {
  return response?.data || response || {};
}

function normalizeNets(nets = []) {
  if (!Array.isArray(nets)) return [];
  return nets
    .map((entry) => ({
      ...entry,
      id: String(entry?.id || '').trim(),
      code: String(entry?.code || entry?.label || '').trim(),
      label: String(entry?.label || entry?.name || entry?.code || '').trim(),
      lifecycle_scope: String(entry?.lifecycle_scope || entry?.lifecycleScope || '').trim() || null,
      owner_member_profile_id: String(entry?.owner_member_profile_id || entry?.ownerMemberProfileId || '').trim() || null,
      status: String(entry?.status || 'active').trim().toLowerCase(),
    }))
    .filter((entry) => entry.id || entry.code || entry.label);
}

export async function listManagedVoiceNets({ eventId = null } = {}) {
  try {
    const response = await invokeMemberFunction('manageVoiceNets', {
      action: 'list_nets',
      ...(eventId ? { eventId } : {}),
    });
    const payload = toPayload(response);
    if (!payload?.success && payload?.error) {
      throw new Error(payload.error);
    }
    return {
      success: true,
      nets: normalizeNets(payload?.nets || []),
      plannedNets: normalizeNets(payload?.planned_nets || payload?.plannedNets || []),
      policy: payload?.policy || {},
      raw: payload,
    };
  } catch (error) {
    const fallbackFilter = eventId ? { event_id: eventId } : {};
    const fallbackRows = base44?.entities?.VoiceNet?.filter
      ? await base44.entities.VoiceNet.filter(fallbackFilter, '-created_date', 300).catch(() => [])
      : base44?.entities?.VoiceNet?.list
        ? await base44.entities.VoiceNet.list('-created_date', 300).catch(() => [])
        : [];
    return {
      success: false,
      error: error?.message || 'Failed to list managed voice nets',
      nets: normalizeNets(fallbackRows),
      plannedNets: [],
      policy: {},
      raw: null,
    };
  }
}

export async function listPlannedOperationNets(eventId) {
  const response = await invokeMemberFunction('manageVoiceNets', {
    action: 'list_planned_operation_nets',
    eventId,
  });
  const payload = toPayload(response);
  if (!payload?.success) {
    throw new Error(payload?.error || 'Failed to load planned operation voice nets');
  }
  return {
    ...payload,
    nets: normalizeNets(payload?.nets || []),
    plannedNets: normalizeNets(payload?.planned_nets || payload?.plannedNets || []),
  };
}

export async function createManagedVoiceNet(input) {
  const response = await invokeMemberFunction('manageVoiceNets', {
    action: 'create_net',
    ...input,
  });
  const payload = toPayload(response);
  if (!payload?.success) {
    const error = payload?.error || 'Failed to create voice net';
    const enriched = new Error(error);
    (enriched).blockedReason = payload?.blockedReason || payload?.blocked_reason || null;
    throw enriched;
  }
  return {
    ...payload,
    net: payload?.net ? normalizeNets([payload.net])[0] : null,
  };
}

export async function updateManagedVoiceNet(netId, input = {}) {
  const response = await invokeMemberFunction('manageVoiceNets', {
    action: 'update_net',
    netId,
    ...input,
  });
  const payload = toPayload(response);
  if (!payload?.success) {
    throw new Error(payload?.error || 'Failed to update voice net');
  }
  return {
    ...payload,
    net: payload?.net ? normalizeNets([payload.net])[0] : null,
  };
}

export async function closeManagedVoiceNet(netId, reason = '') {
  const response = await invokeMemberFunction('manageVoiceNets', {
    action: 'close_net',
    netId,
    ...(reason ? { reason } : {}),
  });
  const payload = toPayload(response);
  if (!payload?.success) {
    throw new Error(payload?.error || 'Failed to close voice net');
  }
  return {
    ...payload,
    net: payload?.net ? normalizeNets([payload.net])[0] : null,
  };
}

export async function transferManagedVoiceNetOwner(netId, ownerMemberProfileId) {
  const response = await invokeMemberFunction('manageVoiceNets', {
    action: 'transfer_owner',
    netId,
    ownerMemberProfileId,
  });
  const payload = toPayload(response);
  if (!payload?.success) {
    throw new Error(payload?.error || 'Failed to transfer voice net ownership');
  }
  return {
    ...payload,
    net: payload?.net ? normalizeNets([payload.net])[0] : null,
  };
}
