function toText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toLower(value) {
  return toText(value).toLowerCase();
}

function clamp(value, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function resolveTypeWeights(fitType) {
  const type = toLower(fitType);
  if (type === 'fps') {
    return { dps: 0.3, shield: 0.1, mobility: 0.22, utility: 0.2, sustain: 0.18 };
  }
  if (type === 'vehicle') {
    return { dps: 0.24, shield: 0.24, mobility: 0.2, utility: 0.12, sustain: 0.2 };
  }
  return { dps: 0.28, shield: 0.24, mobility: 0.2, utility: 0.12, sustain: 0.16 };
}

export const FITTING_LIBRARY = {
  ship: {
    label: 'Ship',
    templates: [
      {
        id: 'light_fighter',
        label: 'Light Fighter',
        role: 'interceptor',
        base: { dps: 58, shield: 46, mobility: 86, utility: 26, sustain: 44 },
        slots: [
          { id: 'nose_weapon', label: 'Nose Weapon', category: 'weapon', required: true },
          { id: 'wing_weapon_l', label: 'Wing Weapon L', category: 'weapon', required: true },
          { id: 'wing_weapon_r', label: 'Wing Weapon R', category: 'weapon', required: true },
          { id: 'shield_gen', label: 'Shield Generator', category: 'shield', required: true },
          { id: 'power_plant', label: 'Power Plant', category: 'power', required: true },
          { id: 'utility_mount', label: 'Utility Mount', category: 'utility', required: false },
        ],
      },
      {
        id: 'gunship',
        label: 'Gunship',
        role: 'strike',
        base: { dps: 72, shield: 64, mobility: 48, utility: 34, sustain: 66 },
        slots: [
          { id: 'turret_top', label: 'Top Turret', category: 'weapon', required: true },
          { id: 'turret_belly', label: 'Belly Turret', category: 'weapon', required: true },
          { id: 'nose_weapon', label: 'Nose Weapon', category: 'weapon', required: true },
          { id: 'shield_gen', label: 'Shield Generator', category: 'shield', required: true },
          { id: 'power_plant', label: 'Power Plant', category: 'power', required: true },
          { id: 'support_rack', label: 'Support Rack', category: 'utility', required: false },
        ],
      },
      {
        id: 'industrial_hauler',
        label: 'Industrial Hauler',
        role: 'logistics',
        base: { dps: 24, shield: 58, mobility: 42, utility: 82, sustain: 72 },
        slots: [
          { id: 'defense_hardpoint', label: 'Defense Hardpoint', category: 'weapon', required: false },
          { id: 'tractor_mount', label: 'Tractor Mount', category: 'utility', required: true },
          { id: 'shield_gen', label: 'Shield Generator', category: 'shield', required: true },
          { id: 'power_plant', label: 'Power Plant', category: 'power', required: true },
          { id: 'cargo_support', label: 'Cargo Support', category: 'utility', required: true },
        ],
      },
    ],
    modules: {
      weapon: [
        { id: 'laser_repeaters', label: 'Laser Repeaters', statDelta: { dps: 16, mobility: -2, sustain: -1 } },
        { id: 'ballistic_cannons', label: 'Ballistic Cannons', statDelta: { dps: 21, sustain: -6 } },
        { id: 'distortion_mix', label: 'Distortion Mix', statDelta: { dps: 10, utility: 8 } },
      ],
      shield: [
        { id: 'fortified_shield', label: 'Fortified Shield', statDelta: { shield: 18, mobility: -4 } },
        { id: 'adaptive_shield', label: 'Adaptive Shield', statDelta: { shield: 12, sustain: 8 } },
        { id: 'fast_regen_shield', label: 'Fast Regen Shield', statDelta: { shield: 10, sustain: 12 } },
      ],
      power: [
        { id: 'overclock_core', label: 'Overclock Core', statDelta: { dps: 8, sustain: -3, mobility: 2 } },
        { id: 'efficient_core', label: 'Efficient Core', statDelta: { sustain: 10, utility: 4 } },
        { id: 'balanced_core', label: 'Balanced Core', statDelta: { dps: 4, shield: 4, mobility: 4, sustain: 4 } },
      ],
      utility: [
        { id: 'quantum_stabilizer', label: 'Quantum Stabilizer', statDelta: { mobility: 8, utility: 6 } },
        { id: 'repair_drones', label: 'Repair Drones', statDelta: { sustain: 10, utility: 8, dps: -2 } },
        { id: 'ecm_suite', label: 'ECM Suite', statDelta: { utility: 12, shield: 4 } },
      ],
    },
  },
  vehicle: {
    label: 'Ground Vehicle',
    templates: [
      {
        id: 'combat_rover',
        label: 'Combat Rover',
        role: 'assault',
        base: { dps: 40, shield: 54, mobility: 58, utility: 48, sustain: 56 },
        slots: [
          { id: 'main_turret', label: 'Main Turret', category: 'weapon', required: true },
          { id: 'hull_armor', label: 'Hull Armor', category: 'armor', required: true },
          { id: 'drive_train', label: 'Drive Train', category: 'mobility', required: true },
          { id: 'support_rig', label: 'Support Rig', category: 'utility', required: false },
        ],
      },
      {
        id: 'recon_buggy',
        label: 'Recon Buggy',
        role: 'scout',
        base: { dps: 26, shield: 34, mobility: 84, utility: 62, sustain: 40 },
        slots: [
          { id: 'light_mount', label: 'Light Mount', category: 'weapon', required: false },
          { id: 'chassis_kit', label: 'Chassis Kit', category: 'armor', required: true },
          { id: 'drive_train', label: 'Drive Train', category: 'mobility', required: true },
          { id: 'sensor_suite', label: 'Sensor Suite', category: 'utility', required: true },
        ],
      },
    ],
    modules: {
      weapon: [
        { id: 'autocannon', label: 'Autocannon', statDelta: { dps: 14, mobility: -3 } },
        { id: 'gatling', label: 'Gatling', statDelta: { dps: 10, sustain: -2 } },
        { id: 'missile_rack', label: 'Missile Rack', statDelta: { dps: 16, utility: -2 } },
      ],
      armor: [
        { id: 'reactive_armor', label: 'Reactive Armor', statDelta: { shield: 16, mobility: -5 } },
        { id: 'composite_armor', label: 'Composite Armor', statDelta: { shield: 10, sustain: 6 } },
      ],
      mobility: [
        { id: 'offroad_suspension', label: 'Offroad Suspension', statDelta: { mobility: 14, sustain: 2 } },
        { id: 'boost_drive', label: 'Boost Drive', statDelta: { mobility: 18, sustain: -4 } },
      ],
      utility: [
        { id: 'med_crate', label: 'Med Crate', statDelta: { utility: 10, sustain: 8 } },
        { id: 'sensor_uplink', label: 'Sensor Uplink', statDelta: { utility: 14 } },
      ],
    },
  },
  fps: {
    label: 'FPS Kit',
    templates: [
      {
        id: 'assault_entry',
        label: 'Assault Entry',
        role: 'breacher',
        base: { dps: 68, shield: 34, mobility: 58, utility: 36, sustain: 42 },
        slots: [
          { id: 'primary', label: 'Primary Weapon', category: 'primary', required: true },
          { id: 'secondary', label: 'Secondary Weapon', category: 'secondary', required: true },
          { id: 'armor', label: 'Armor', category: 'armor', required: true },
          { id: 'gadget', label: 'Gadget', category: 'gadget', required: false },
          { id: 'utility', label: 'Utility', category: 'utility', required: true },
        ],
      },
      {
        id: 'medic_support',
        label: 'Medic Support',
        role: 'medic',
        base: { dps: 42, shield: 42, mobility: 60, utility: 78, sustain: 70 },
        slots: [
          { id: 'primary', label: 'Primary Weapon', category: 'primary', required: true },
          { id: 'secondary', label: 'Secondary Weapon', category: 'secondary', required: true },
          { id: 'armor', label: 'Armor', category: 'armor', required: true },
          { id: 'gadget', label: 'Gadget', category: 'gadget', required: true },
          { id: 'utility', label: 'Utility', category: 'utility', required: true },
        ],
      },
    ],
    modules: {
      primary: [
        { id: 'ar', label: 'Assault Rifle', statDelta: { dps: 14, mobility: -2 } },
        { id: 'smg', label: 'SMG', statDelta: { dps: 10, mobility: 6 } },
        { id: 'dmr', label: 'DMR', statDelta: { dps: 12, utility: 2 } },
      ],
      secondary: [
        { id: 'pistol', label: 'Pistol', statDelta: { mobility: 4, sustain: 2 } },
        { id: 'machine_pistol', label: 'Machine Pistol', statDelta: { dps: 6, sustain: -1 } },
      ],
      armor: [
        { id: 'heavy_armor', label: 'Heavy Armor', statDelta: { shield: 18, mobility: -8, sustain: 6 } },
        { id: 'medium_armor', label: 'Medium Armor', statDelta: { shield: 12, sustain: 4 } },
        { id: 'light_armor', label: 'Light Armor', statDelta: { shield: 6, mobility: 8 } },
      ],
      gadget: [
        { id: 'grenade_bundle', label: 'Grenade Bundle', statDelta: { dps: 8, utility: 4 } },
        { id: 'tractor_tool', label: 'Tractor Tool', statDelta: { utility: 10 } },
        { id: 'med_tool', label: 'Medical Tool', statDelta: { utility: 12, sustain: 10, dps: -2 } },
      ],
      utility: [
        { id: 'ammo_pack', label: 'Ammo Pack', statDelta: { sustain: 8, utility: 4 } },
        { id: 'med_pen_set', label: 'Med Pen Set', statDelta: { sustain: 10 } },
        { id: 'breach_kit', label: 'Breach Kit', statDelta: { utility: 8, mobility: -2 } },
      ],
    },
  },
};

export function createFitDraft(fitType = 'ship') {
  const type = FITTING_LIBRARY[fitType] ? fitType : 'ship';
  const defaultTemplate = FITTING_LIBRARY[type].templates[0];
  return {
    id: `fit_draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    fitType: type,
    templateId: defaultTemplate?.id || '',
    scopeType: 'personal',
    scopeId: '',
    roleTag: defaultTemplate?.role || 'multi-role',
    title: '',
    notes: '',
    slotAssignments: {},
    parentPlanId: null,
    createdAt: new Date().toISOString(),
  };
}

function findTemplate(library, fitType, templateId) {
  const scope = library?.[fitType] || library.ship;
  if (!scope) return null;
  return scope.templates.find((entry) => entry.id === templateId) || scope.templates[0] || null;
}

function findModule(catalog, category, moduleId) {
  const items = Array.isArray(catalog?.[category]) ? catalog[category] : [];
  return items.find((entry) => entry.id === moduleId) || null;
}

export function computeFitOutcome(draft, library = FITTING_LIBRARY) {
  const fitType = library?.[draft?.fitType] ? draft.fitType : 'ship';
  const template = findTemplate(library, fitType, draft?.templateId);
  if (!template) {
    return {
      fitType,
      template: null,
      score: 0,
      stats: { dps: 0, shield: 0, mobility: 0, utility: 0, sustain: 0 },
      missingRequiredSlots: [],
      slotRows: [],
      fittedCount: 0,
      requiredCount: 0,
    };
  }

  const stats = {
    dps: Number(template.base?.dps || 0),
    shield: Number(template.base?.shield || 0),
    mobility: Number(template.base?.mobility || 0),
    utility: Number(template.base?.utility || 0),
    sustain: Number(template.base?.sustain || 0),
  };
  const slotRows = [];
  const assignments = draft?.slotAssignments || {};

  for (const slot of template.slots || []) {
    const moduleId = toText(assignments?.[slot.id]);
    const module = moduleId ? findModule(library[fitType]?.modules, slot.category, moduleId) : null;
    if (module?.statDelta) {
      for (const [key, delta] of Object.entries(module.statDelta)) {
        if (!(key in stats)) continue;
        stats[key] = Number(stats[key]) + Number(delta || 0);
      }
    }
    slotRows.push({
      slotId: slot.id,
      label: slot.label,
      category: slot.category,
      required: Boolean(slot.required),
      moduleId: module?.id || '',
      moduleLabel: module?.label || '',
    });
  }

  for (const key of Object.keys(stats)) {
    stats[key] = clamp(stats[key], 0, 100);
  }

  const weights = resolveTypeWeights(fitType);
  const weightedScore = Math.round(
    (stats.dps * weights.dps)
    + (stats.shield * weights.shield)
    + (stats.mobility * weights.mobility)
    + (stats.utility * weights.utility)
    + (stats.sustain * weights.sustain)
  );

  const requiredSlots = slotRows.filter((entry) => entry.required);
  const missingRequiredSlots = requiredSlots.filter((entry) => !entry.moduleId).map((entry) => entry.slotId);
  const completenessPenalty = missingRequiredSlots.length * 8;

  return {
    fitType,
    template,
    score: clamp(weightedScore - completenessPenalty, 0, 100),
    stats,
    missingRequiredSlots,
    slotRows,
    fittedCount: slotRows.filter((entry) => entry.moduleId).length,
    requiredCount: requiredSlots.length,
  };
}

export function applyScenarioModifiers(stats, scenario = {}) {
  const threat = clamp(scenario?.threat ?? 50, 0, 100);
  const travel = clamp(scenario?.travel ?? 50, 0, 100);
  const attrition = clamp(scenario?.attrition ?? 50, 0, 100);
  const threatDelta = threat - 50;
  const travelDelta = travel - 50;
  const attritionDelta = attrition - 50;

  const source = {
    dps: clamp(Number(stats?.dps || 0), 0, 100),
    shield: clamp(Number(stats?.shield || 0), 0, 100),
    mobility: clamp(Number(stats?.mobility || 0), 0, 100),
    utility: clamp(Number(stats?.utility || 0), 0, 100),
    sustain: clamp(Number(stats?.sustain || 0), 0, 100),
  };

  const adjusted = {
    dps: clamp(source.dps + (threatDelta * 0.22) - (travelDelta * 0.08), 0, 100),
    shield: clamp(source.shield + (threatDelta * 0.18) + (attritionDelta * 0.11), 0, 100),
    mobility: clamp(source.mobility + (travelDelta * 0.24) - (threatDelta * 0.1), 0, 100),
    utility: clamp(source.utility + (travelDelta * 0.14) + (attritionDelta * 0.08), 0, 100),
    sustain: clamp(source.sustain + (attritionDelta * 0.24) + (travelDelta * 0.11), 0, 100),
  };

  const sourceScore = Math.round((source.dps + source.shield + source.mobility + source.utility + source.sustain) / 5);
  const adjustedScore = Math.round((adjusted.dps + adjusted.shield + adjusted.mobility + adjusted.utility + adjusted.sustain) / 5);

  return {
    source,
    adjusted,
    sourceScore,
    adjustedScore,
    scoreDelta: adjustedScore - sourceScore,
    scenarioVector: {
      threat,
      travel,
      attrition,
    },
  };
}

export function normalizeFitPlanEntry(entry) {
  const details = entry?.details || {};
  const fitPlanId = toText(details.fit_plan_id || details.fitPlanId || details.id);
  if (!fitPlanId) return null;
  return {
    id: toText(entry?.id),
    fitPlanId,
    parentPlanId: toText(details.parent_plan_id || details.parentPlanId),
    type: toLower(details.fit_type || details.fitType || 'ship'),
    title: toText(details.title || entry?.summary || 'Fit Plan'),
    scopeType: toLower(details.scope_type || details.scopeType || 'personal'),
    scopeId: toText(details.scope_id || details.scopeId),
    roleTag: toText(details.role_tag || details.roleTag || ''),
    templateId: toText(details.template_id || details.templateId),
    slotAssignments: details.slot_assignments || details.slotAssignments || {},
    notes: toText(details.notes),
    stats: details.stats || {},
    score: Number(details.score || 0),
    version: Math.max(1, Number(details.version || 1)),
    actorMemberProfileId: toText(entry?.actor_member_profile_id || details.actor_member_profile_id || ''),
    eventId: toText(entry?.event_id || details.event_id || ''),
    createdAt: entry?.created_date || details.created_at || null,
  };
}

export function normalizeFitCommentEntry(entry) {
  const details = entry?.details || {};
  const fitPlanId = toText(details.fit_plan_id || details.fitPlanId);
  if (!fitPlanId) return null;
  return {
    id: toText(entry?.id),
    fitPlanId,
    actorMemberProfileId: toText(entry?.actor_member_profile_id || details.actor_member_profile_id || ''),
    message: toText(details.message),
    createdAt: entry?.created_date || details.created_at || null,
  };
}

export function summarizeTeamFits(plans) {
  const list = Array.isArray(plans) ? plans : [];
  if (!list.length) {
    return {
      total: 0,
      avgScore: 0,
      byType: {},
      byScope: {},
      roleTags: {},
    };
  }

  const byType = {};
  const byScope = {};
  const roleTags = {};
  let scoreTotal = 0;

  for (const plan of list) {
    const type = toLower(plan?.type || plan?.fitType || 'ship') || 'ship';
    const scope = toLower(plan?.scopeType || 'personal') || 'personal';
    const role = toLower(plan?.roleTag || 'unassigned') || 'unassigned';
    byType[type] = (byType[type] || 0) + 1;
    byScope[scope] = (byScope[scope] || 0) + 1;
    roleTags[role] = (roleTags[role] || 0) + 1;
    scoreTotal += Number(plan?.score || 0);
  }

  return {
    total: list.length,
    avgScore: Math.round(scoreTotal / list.length),
    byType,
    byScope,
    roleTags,
  };
}
