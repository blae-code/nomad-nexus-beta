export type OperationalRoleToken =
  | 'pilot'
  | 'squad_lead'
  | 'medic'
  | 'gunner'
  | 'engineer'
  | 'cargo'
  | 'signal'
  | 'command'
  | 'crew';

export type ScopedRoleScope = 'FLEET' | 'WING' | 'SQUAD' | 'SHIP';

export interface OperationalRoleLaneCounts {
  pilot: number;
  squad_lead: number;
  medic: number;
  gunner: number;
  engineer: number;
  cargo: number;
  signal: number;
  command: number;
  crew: number;
}

interface SquadLikeOperator {
  id: string;
  role: string;
  vehicleId?: string;
  status?: string;
  callsign?: string;
}

interface SquadLikeVehicle {
  id: string;
  label?: string;
  status?: string;
  crewCount?: number;
  memberIds?: string[];
}

interface SquadLike {
  id: string;
  wingId: string;
  wingLabel?: string;
  squadLabel?: string;
  primaryChannelId: string;
  operators: SquadLikeOperator[];
  vehicles: SquadLikeVehicle[];
  pilotCount?: number;
  medicCount?: number;
  leadCount?: number;
  txCount?: number;
  onlineCount?: number;
  offNetCount?: number;
  roleLaneCounts?: OperationalRoleLaneCounts;
}

export interface ScopedRoleTarget {
  scope: ScopedRoleScope;
  roleToken: OperationalRoleToken;
  wingId?: string;
  squadId?: string;
  vehicleId?: string;
}

export interface ScopedRoleRecipients {
  memberIds: string[];
  squadIds: string[];
  channelIds: string[];
}

export interface TransferAuthorityContext {
  isCommand: boolean;
  isSquadLead: boolean;
  isPilot: boolean;
}

export type SquadTransferKind = 'operator' | 'vehicle';

export interface SquadTransferInput {
  kind: SquadTransferKind;
  memberIds: string[];
  sourceSquadId: string;
  sourceChannelId: string;
  destinationSquadId: string;
  destinationChannelId: string;
  vehicleId?: string;
}

export interface SquadTransferPayload {
  kind: SquadTransferKind;
  memberIds: string[];
  sourceSquadId: string;
  sourceChannelId: string;
  destinationSquadId: string;
  destinationChannelId: string;
  vehicleId: string | null;
}

export interface TransferProjectionResult<TSquad extends SquadLike> {
  nextCards: TSquad[];
  movedCount: number;
}

const ROLE_ORDER: OperationalRoleToken[] = [
  'pilot',
  'squad_lead',
  'medic',
  'gunner',
  'engineer',
  'cargo',
  'signal',
  'command',
  'crew',
];

function token(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function emptyRoleCounts(): OperationalRoleLaneCounts {
  return {
    pilot: 0,
    squad_lead: 0,
    medic: 0,
    gunner: 0,
    engineer: 0,
    cargo: 0,
    signal: 0,
    command: 0,
    crew: 0,
  };
}

export function normalizeOperationalRoleToken(role: string): OperationalRoleToken {
  const roleToken = token(role);
  if (!roleToken) return 'crew';
  if (
    roleToken.includes('squad lead') ||
    roleToken.includes('team lead') ||
    roleToken.includes('fireteam lead') ||
    roleToken.includes('lead')
  ) {
    return 'squad_lead';
  }
  if (roleToken.includes('pilot') || roleToken.includes('flight') || roleToken.includes('gunship')) return 'pilot';
  if (roleToken.includes('medic') || roleToken.includes('medical')) return 'medic';
  if (roleToken.includes('gunner') || roleToken.includes('turret') || roleToken.includes('weapons')) return 'gunner';
  if (
    roleToken.includes('engineer') ||
    roleToken.includes('mechanic') ||
    roleToken.includes('maint') ||
    roleToken.includes('tech')
  ) {
    return 'engineer';
  }
  if (roleToken.includes('cargo') || roleToken.includes('load') || roleToken.includes('hauler') || roleToken.includes('logistic')) {
    return 'cargo';
  }
  if (roleToken.includes('signal') || roleToken.includes('comms') || roleToken.includes('radio')) return 'signal';
  if (roleToken.includes('command') || roleToken.includes('officer')) return 'command';
  return 'crew';
}

export function buildOperationalRoleLaneCounts(operators: Array<{ role: string }>): OperationalRoleLaneCounts {
  const counts = emptyRoleCounts();
  for (const operator of operators || []) {
    const roleToken = normalizeOperationalRoleToken(operator?.role || '');
    counts[roleToken] += 1;
  }
  return counts;
}

export function sortOperationalRoleLanes(counts: OperationalRoleLaneCounts): Array<{ roleToken: OperationalRoleToken; count: number }> {
  return ROLE_ORDER.map((roleToken) => ({ roleToken, count: Number(counts?.[roleToken] || 0) })).filter((entry) => entry.count > 0);
}

function dedupe(values: string[]): string[] {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export function resolveScopedRoleRecipients(input: {
  target: ScopedRoleTarget;
  squadCards: SquadLike[];
}): ScopedRoleRecipients {
  const target = input.target;
  const squadCards = Array.isArray(input.squadCards) ? input.squadCards : [];

  let scopedSquads = squadCards;
  if (target.scope === 'WING') {
    scopedSquads = squadCards.filter((card) => card.wingId === target.wingId);
  } else if (target.scope === 'SQUAD') {
    scopedSquads = squadCards.filter((card) => card.id === target.squadId);
  } else if (target.scope === 'SHIP') {
    scopedSquads = squadCards.filter((card) => card.id === target.squadId);
  }

  const memberIds: string[] = [];
  const squadIds: string[] = [];
  const channelIds: string[] = [];

  for (const squad of scopedSquads) {
    const squadChannelId = String(squad?.primaryChannelId || '').trim();
    if (squadChannelId) channelIds.push(squadChannelId);
    squadIds.push(squad.id);

    const roleFiltered = (squad.operators || []).filter((operator) => {
      const roleToken = normalizeOperationalRoleToken(operator.role || '');
      return roleToken === target.roleToken || (target.roleToken === 'crew' && roleToken !== 'command');
    });

    if (target.scope === 'SHIP') {
      const vehicleId = String(target.vehicleId || '').trim();
      if (!vehicleId) continue;
      const vehicle = (squad.vehicles || []).find((entry) => entry.id === vehicleId);
      const vehicleMemberSet = new Set<string>((vehicle?.memberIds || []).map((entry) => String(entry || '').trim()).filter(Boolean));
      for (const operator of roleFiltered) {
        if (vehicleMemberSet.has(operator.id)) memberIds.push(operator.id);
      }
      continue;
    }

    for (const operator of roleFiltered) {
      memberIds.push(operator.id);
    }
  }

  return {
    memberIds: dedupe(memberIds).sort((a, b) => a.localeCompare(b)),
    squadIds: dedupe(squadIds).sort((a, b) => a.localeCompare(b)),
    channelIds: dedupe(channelIds).sort((a, b) => a.localeCompare(b)),
  };
}

export function canIssueScopedRoleCommand(scope: ScopedRoleScope, context: TransferAuthorityContext): boolean {
  if (context.isCommand) return true;
  if (scope === 'FLEET' || scope === 'WING') return false;
  if (scope === 'SQUAD') return Boolean(context.isSquadLead);
  if (scope === 'SHIP') return Boolean(context.isSquadLead || context.isPilot);
  return false;
}

export function buildSquadTransferPayload(input: SquadTransferInput): SquadTransferPayload | null {
  const sourceSquadId = String(input.sourceSquadId || '').trim();
  const sourceChannelId = String(input.sourceChannelId || '').trim();
  const destinationSquadId = String(input.destinationSquadId || '').trim();
  const destinationChannelId = String(input.destinationChannelId || '').trim();
  const memberIds = dedupe(input.memberIds || []).sort((a, b) => a.localeCompare(b));

  if (!sourceSquadId || !destinationSquadId || !sourceChannelId || !destinationChannelId) return null;
  if (sourceSquadId === destinationSquadId) return null;
  if (memberIds.length === 0) return null;

  return {
    kind: input.kind,
    memberIds,
    sourceSquadId,
    sourceChannelId,
    destinationSquadId,
    destinationChannelId,
    vehicleId: input.vehicleId ? String(input.vehicleId) : null,
  };
}

function recalcSquad<TSquad extends SquadLike>(card: TSquad): TSquad {
  const operators = [...(card.operators || [])];
  const vehicles = [...(card.vehicles || [])].map((vehicle) => {
    const memberIds = dedupe((vehicle.memberIds || []).map((entry) => String(entry || '')));
    return {
      ...vehicle,
      memberIds,
      crewCount: memberIds.length,
    };
  });

  const pilotCount = operators.filter((entry) => normalizeOperationalRoleToken(entry.role || '') === 'pilot').length;
  const medicCount = operators.filter((entry) => normalizeOperationalRoleToken(entry.role || '') === 'medic').length;
  const leadCount = operators.filter((entry) => {
    const roleToken = normalizeOperationalRoleToken(entry.role || '');
    return roleToken === 'squad_lead' || roleToken === 'command' || roleToken === 'signal';
  }).length;
  const txCount = operators.filter((entry) => token(entry.status) === 'tx').length;
  const onlineCount = operators.filter((entry) => {
    const status = token(entry.status);
    return status === 'tx' || status === 'on-net';
  }).length;
  const offNetCount = operators.filter((entry) => token(entry.status) === 'off-net').length;
  const roleLaneCounts = buildOperationalRoleLaneCounts(operators);

  return {
    ...card,
    operators,
    vehicles,
    pilotCount,
    medicCount,
    leadCount,
    txCount,
    onlineCount,
    offNetCount,
    roleLaneCounts,
  };
}

export function applySquadTransferProjection<TSquad extends SquadLike>(
  squadCards: TSquad[],
  payload: SquadTransferPayload
): TransferProjectionResult<TSquad> {
  const memberSet = new Set(payload.memberIds);
  if (!memberSet.size) {
    return {
      nextCards: [...squadCards],
      movedCount: 0,
    };
  }

  let movedCount = 0;
  const nextCards = (squadCards || []).map((card) => ({ ...card, operators: [...(card.operators || [])], vehicles: [...(card.vehicles || [])] })) as TSquad[];
  const sourceIndex = nextCards.findIndex((card) => card.id === payload.sourceSquadId);
  const destinationIndex = nextCards.findIndex((card) => card.id === payload.destinationSquadId);
  if (sourceIndex < 0 || destinationIndex < 0) {
    return { nextCards: squadCards, movedCount: 0 };
  }

  const source = nextCards[sourceIndex];
  const destination = nextCards[destinationIndex];
  const movingOperators = source.operators.filter((operator) => memberSet.has(operator.id));
  if (!movingOperators.length) {
    return {
      nextCards: squadCards,
      movedCount: 0,
    };
  }

  movedCount = movingOperators.length;
  source.operators = source.operators.filter((operator) => !memberSet.has(operator.id));
  const destinationById = new Map(destination.operators.map((operator) => [operator.id, operator]));
  for (const operator of movingOperators) {
    destinationById.set(operator.id, {
      ...operator,
      vehicleId: payload.vehicleId || operator.vehicleId,
    });
  }
  destination.operators = [...destinationById.values()];

  source.vehicles = source.vehicles.map((vehicle) => ({
    ...vehicle,
    memberIds: (vehicle.memberIds || []).filter((memberId) => !memberSet.has(memberId)),
  }));

  let destinationVehicleId = payload.vehicleId;
  if (!destinationVehicleId) {
    destinationVehicleId = destination.vehicles[0]?.id || `${payload.destinationChannelId}:vehicle:manual`;
  }

  const destinationVehicleIndex = destination.vehicles.findIndex((vehicle) => vehicle.id === destinationVehicleId);
  if (destinationVehicleIndex < 0) {
    destination.vehicles = [
      ...destination.vehicles,
      {
        id: destinationVehicleId,
        label: 'Transferred Crew',
        status: 'READY',
        crewCount: payload.memberIds.length,
        memberIds: [...payload.memberIds],
      } as SquadLikeVehicle,
    ];
  } else {
    const existing = destination.vehicles[destinationVehicleIndex];
    destination.vehicles[destinationVehicleIndex] = {
      ...existing,
      memberIds: dedupe([...(existing.memberIds || []), ...payload.memberIds]),
    };
  }

  nextCards[sourceIndex] = recalcSquad(source);
  nextCards[destinationIndex] = recalcSquad(destination);

  return {
    nextCards,
    movedCount,
  };
}
