function toText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toLower(value) {
  return toText(value).toLowerCase();
}

function clampPercent(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

export function createDefaultFleetCommandState() {
  return {
    schema_version: 1,
    reservations: [],
    loadout_library: [],
    active_loadout_id: null,
    engineering_queue: [],
  };
}

export function parseFleetCommandState(notes) {
  const text = String(notes || '');
  const regex = /\[fleet_command_state\]([\s\S]*?)\[\/fleet_command_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return createDefaultFleetCommandState();
  try {
    const state = JSON.parse(match[1]);
    return {
      schema_version: Number(state?.schema_version || 1),
      reservations: Array.isArray(state?.reservations) ? state.reservations : [],
      loadout_library: Array.isArray(state?.loadout_library) ? state.loadout_library : [],
      active_loadout_id: state?.active_loadout_id ? String(state.active_loadout_id) : null,
      engineering_queue: Array.isArray(state?.engineering_queue) ? state.engineering_queue : [],
    };
  } catch {
    return createDefaultFleetCommandState();
  }
}

export function resolveFleetTelemetry(asset) {
  const telemetry = asset?.telemetry || {};
  return {
    health: clampPercent(telemetry.health ?? asset?.health_percent ?? asset?.health ?? 100, 100),
    shields: clampPercent(telemetry.shields ?? asset?.shields_percent ?? asset?.shields ?? 100, 100),
    fuel: clampPercent(telemetry.fuel ?? asset?.fuel_percent ?? asset?.fuel ?? 100, 100),
    cargo: clampPercent(telemetry.cargo ?? asset?.cargo_percent ?? asset?.cargo ?? 0, 0),
  };
}

function classifyAssetStatus(asset) {
  const status = toLower(asset?.status);
  const destroyed = /destroy|lost|scrap|dead|totaled/.test(status);
  const maintenance = !destroyed && /maint|repair|damag|refit|offline/.test(status);
  const operational = !destroyed && !maintenance;
  return { operational, maintenance, destroyed };
}

function hasActiveLoadout(state, asset) {
  if (state?.active_loadout_id) return true;
  return Boolean(asset?.loadout);
}

function isOpenEngineeringTask(task) {
  const status = toLower(task?.status);
  return status !== 'resolved' && status !== 'cancelled';
}

function isScheduledReservation(entry) {
  const status = toLower(entry?.status);
  return status !== 'cancelled' && status !== 'completed';
}

export function computeFleetPlanningMetrics({ fleetAssets = [], eventAssetIds = [], plannedAssets = {} } = {}) {
  const allAssets = Array.isArray(fleetAssets) ? fleetAssets : [];
  const scopedIds = new Set((Array.isArray(eventAssetIds) ? eventAssetIds : []).map((id) => toText(id)).filter(Boolean));
  const scopedAssets = scopedIds.size > 0
    ? allAssets.filter((asset) => scopedIds.has(toText(asset?.id)))
    : allAssets;

  const requiredAssets = ['fighters', 'escorts', 'haulers', 'medevac', 'support']
    .reduce((sum, key) => sum + Math.max(0, Number(plannedAssets?.[key] || 0)), 0);

  let operationalCount = 0;
  let maintenanceCount = 0;
  let destroyedCount = 0;
  let telemetryReadyCount = 0;
  let telemetryScoreTotal = 0;
  let activeLoadoutCount = 0;
  let loadoutProfilesTotal = 0;
  let engineeringOpen = 0;
  let engineeringCriticalOpen = 0;
  let reservationsFocused = 0;
  let reservationsCasual = 0;

  for (const asset of scopedAssets) {
    const status = classifyAssetStatus(asset);
    if (status.operational) operationalCount += 1;
    if (status.maintenance) maintenanceCount += 1;
    if (status.destroyed) destroyedCount += 1;

    const telemetry = resolveFleetTelemetry(asset);
    const telemetryScore = Math.round((telemetry.health + telemetry.shields + telemetry.fuel) / 3);
    telemetryScoreTotal += telemetryScore;
    if (!status.destroyed && telemetryScore >= 65) {
      telemetryReadyCount += 1;
    }

    const commandState = parseFleetCommandState(asset?.maintenance_notes);
    loadoutProfilesTotal += commandState.loadout_library.length;
    if (hasActiveLoadout(commandState, asset)) {
      activeLoadoutCount += 1;
    }

    const openQueue = commandState.engineering_queue.filter(isOpenEngineeringTask);
    engineeringOpen += openQueue.length;
    engineeringCriticalOpen += openQueue.filter((task) => toLower(task?.severity) === 'critical').length;

    for (const reservation of commandState.reservations) {
      if (!isScheduledReservation(reservation)) continue;
      if (toLower(reservation?.operation_mode) === 'focused') reservationsFocused += 1;
      else reservationsCasual += 1;
    }
  }

  const totalAssets = scopedAssets.length;
  const operationalPercent = totalAssets > 0 ? Math.round((operationalCount / totalAssets) * 100) : 0;
  const telemetryAverage = totalAssets > 0 ? Math.round(telemetryScoreTotal / totalAssets) : 0;
  const telemetryReadyPercent = totalAssets > 0 ? Math.round((telemetryReadyCount / totalAssets) * 100) : 0;
  const loadoutCoveragePercent = totalAssets > 0 ? Math.round((activeLoadoutCount / totalAssets) * 100) : 0;
  const assetCoveragePercent = requiredAssets > 0 ? Math.round((totalAssets / requiredAssets) * 100) : 100;

  return {
    totalAssets,
    assignedAssetScope: scopedIds.size,
    requiredAssets,
    assetCoveragePercent,
    operationalCount,
    maintenanceCount,
    destroyedCount,
    operationalPercent,
    telemetryAverage,
    telemetryReadyCount,
    telemetryReadyPercent,
    activeLoadoutCount,
    loadoutProfilesTotal,
    loadoutCoveragePercent,
    engineeringOpen,
    engineeringCriticalOpen,
    reservationsFocused,
    reservationsCasual,
  };
}
