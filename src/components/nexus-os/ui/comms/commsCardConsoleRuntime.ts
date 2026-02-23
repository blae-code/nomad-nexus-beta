import type { CqbEvent, CqbEventType } from '../../schemas/coreSchemas';
import {
  COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC,
  COMMS_CARD_CONSOLE_TTL_PRESETS,
  type CommsCardConsoleSlaPolicy,
} from './commsCardConsoleState';

export interface CommsCardRuntimeOperator {
  id: string;
  status: string;
}

export interface CommsCardRuntimeSquadCard {
  id: string;
  wingId: string;
  wingLabel: string;
  squadLabel: string;
  primaryChannelId: string;
  operators: CommsCardRuntimeOperator[];
}

export type SlaStatusColor = 'green' | 'amber' | 'red';

export interface SquadSlaSnapshot {
  squadId: string;
  squadLabel: string;
  wingId: string;
  wingLabel: string;
  last_checkin_age_s: number;
  last_ack_age_s: number;
  off_net_duration_s: number;
  checkinStatus: SlaStatusColor;
  ackStatus: SlaStatusColor;
  offNetStatus: SlaStatusColor;
  overallStatus: SlaStatusColor;
}

export interface EscalationSuggestion {
  id: string;
  squadId: string;
  wingId: string;
  target: 'wing' | 'fleet';
  directive: 'ESCALATE_TO_WING' | 'ESCALATE_TO_FLEET';
  eventType: CqbEventType;
  label: string;
  reason: string;
}

export interface BridgeLifecycleSession {
  id: string;
  squadIds: string[];
  createdAtMs: number;
  ttlSec: number;
}

export interface BridgeLifecycleRow extends BridgeLifecycleSession {
  remainingSec: number | null;
  expired: boolean;
  splitSuggested: boolean;
  ttlLabel: string;
}

const ACK_EVENT_SET = new Set<CqbEventType>(['ROGER', 'WILCO', 'CLEAR_COMMS']);

function toText(value: unknown): string {
  return String(value || '').trim();
}

function statusRank(status: SlaStatusColor): number {
  if (status === 'red') return 3;
  if (status === 'amber') return 2;
  return 1;
}

function byRank(left: SlaStatusColor, right: SlaStatusColor): SlaStatusColor {
  return statusRank(left) >= statusRank(right) ? left : right;
}

function metricStatus(ageSec: number, warnSec: number, critSec: number): SlaStatusColor {
  if (ageSec >= critSec) return 'red';
  if (ageSec >= warnSec) return 'amber';
  return 'green';
}

function eventMs(event: Partial<CqbEvent>, fallbackMs: number): number {
  const parsed = Date.parse(String(event?.createdAt || ''));
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function eventTouchesSquad(event: Partial<CqbEvent>, squad: CommsCardRuntimeSquadCard): boolean {
  const payload = event?.payload as Record<string, unknown> | undefined;
  const payloadSquadId = toText(payload?.squadId);
  if (payloadSquadId && payloadSquadId === squad.id) return true;
  const payloadSquadIds = Array.isArray(payload?.squadIds) ? payload?.squadIds : [];
  if (payloadSquadIds.some((entry) => toText(entry) === squad.id)) return true;
  return toText(event.channelId) === toText(squad.primaryChannelId);
}

function ageSec(nowMs: number, fromMs: number): number {
  if (!Number.isFinite(fromMs)) return 0;
  return Math.max(0, Math.round((nowMs - fromMs) / 1000));
}

function normalizeOffNetSinceMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const operatorId = toText(key);
    if (!operatorId) continue;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) continue;
    next[operatorId] = Math.floor(timestamp);
  }
  return next;
}

export function sortSquadCardsDeterministic<T extends CommsCardRuntimeSquadCard>(cards: T[]): T[] {
  return [...cards].sort((left, right) => {
    const wingLabelCompare = left.wingLabel.localeCompare(right.wingLabel);
    if (wingLabelCompare !== 0) return wingLabelCompare;
    const squadLabelCompare = left.squadLabel.localeCompare(right.squadLabel);
    if (squadLabelCompare !== 0) return squadLabelCompare;
    return left.id.localeCompare(right.id);
  });
}

export function buildSquadSlaSnapshots(input: {
  squadCards: CommsCardRuntimeSquadCard[];
  events: CqbEvent[];
  nowMs: number;
  slaPolicy: CommsCardConsoleSlaPolicy;
  offNetSinceByOperatorId?: Record<string, number>;
}): SquadSlaSnapshot[] {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const offNetSinceByOperatorId = normalizeOffNetSinceMap(input.offNetSinceByOperatorId);
  const cards = sortSquadCardsDeterministic(input.squadCards || []);

  return cards.map((card) => {
    const squadEvents = (input.events || []).filter((event) => eventTouchesSquad(event, card));
    const latestEventAtMs = squadEvents.reduce((maxMs, event) => Math.max(maxMs, eventMs(event, nowMs)), nowMs);
    const lastCheckinAtMs = squadEvents
      .filter((event) => event.eventType === 'SELF_CHECK')
      .reduce((maxMs, event) => Math.max(maxMs, eventMs(event, nowMs)), latestEventAtMs);
    const lastAckAtMs = squadEvents
      .filter((event) => ACK_EVENT_SET.has(event.eventType))
      .reduce((maxMs, event) => Math.max(maxMs, eventMs(event, nowMs)), latestEventAtMs);

    const offNetOperatorIds = (card.operators || [])
      .filter((operator) => toText(operator.status).toUpperCase() === 'OFF-NET')
      .map((operator) => operator.id);
    const offNetDurationSec =
      offNetOperatorIds.length > 0
        ? offNetOperatorIds.reduce((maxAge, operatorId) => {
            const offNetSinceMs = offNetSinceByOperatorId[operatorId] || nowMs;
            return Math.max(maxAge, ageSec(nowMs, offNetSinceMs));
          }, 0)
        : 0;

    const checkinAgeSec = ageSec(nowMs, lastCheckinAtMs);
    const ackAgeSec = ageSec(nowMs, lastAckAtMs);
    const checkinStatus = metricStatus(
      checkinAgeSec,
      input.slaPolicy.checkinWarnSec,
      input.slaPolicy.checkinCritSec
    );
    const ackStatus = metricStatus(ackAgeSec, input.slaPolicy.ackWarnSec, input.slaPolicy.ackCritSec);
    const offNetStatus =
      offNetOperatorIds.length === 0
        ? 'green'
        : metricStatus(offNetDurationSec, input.slaPolicy.offNetWarnSec, input.slaPolicy.offNetCritSec);
    const overallStatus = byRank(byRank(checkinStatus, ackStatus), offNetStatus);

    return {
      squadId: card.id,
      squadLabel: card.squadLabel,
      wingId: card.wingId,
      wingLabel: card.wingLabel,
      last_checkin_age_s: checkinAgeSec,
      last_ack_age_s: ackAgeSec,
      off_net_duration_s: offNetDurationSec,
      checkinStatus,
      ackStatus,
      offNetStatus,
      overallStatus,
    };
  });
}

export function buildEscalationSuggestions(input: { snapshots: SquadSlaSnapshot[] }): EscalationSuggestion[] {
  const snapshots = input.snapshots || [];
  const redCountByWing = snapshots.reduce<Record<string, number>>((acc, snapshot) => {
    if (snapshot.overallStatus === 'red') {
      acc[snapshot.wingId] = (acc[snapshot.wingId] || 0) + 1;
    }
    return acc;
  }, {});

  return snapshots
    .filter((snapshot) => snapshot.overallStatus === 'red')
    .map((snapshot) => {
      const fleetEscalation = (redCountByWing[snapshot.wingId] || 0) >= 2;
      return {
        id: `escalate:${snapshot.squadId}:${fleetEscalation ? 'fleet' : 'wing'}`,
        squadId: snapshot.squadId,
        wingId: snapshot.wingId,
        target: fleetEscalation ? 'fleet' : 'wing',
        directive: fleetEscalation ? 'ESCALATE_TO_FLEET' : 'ESCALATE_TO_WING',
        eventType: fleetEscalation ? 'MOVE_OUT' : 'HOLD',
        label: fleetEscalation ? 'Escalate to Fleet' : 'Escalate to Wing',
        reason: fleetEscalation
          ? 'Wing comms remain stale across multiple squads.'
          : 'Squad comms SLA is critical.',
      } satisfies EscalationSuggestion;
    })
    .sort((left, right) => {
      if (left.target !== right.target) return left.target === 'fleet' ? -1 : 1;
      return left.squadId.localeCompare(right.squadId);
    });
}

export function normalizeBridgeTtlSec(ttlSec: unknown): number {
  const parsed = Number(ttlSec);
  if (Number.isFinite(parsed) && COMMS_CARD_CONSOLE_TTL_PRESETS.includes(Math.round(parsed))) {
    return Math.round(parsed);
  }
  return COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC;
}

function formatSecondsForDisplay(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clamped / 60);
  const rem = clamped % 60;
  return `${minutes}m ${String(rem).padStart(2, '0')}s`;
}

export function buildBridgeLifecycleRows(input: {
  sessions: BridgeLifecycleSession[];
  nowMs: number;
}): BridgeLifecycleRow[] {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  return [...(input.sessions || [])]
    .map((session) => {
      const ttlSec = normalizeBridgeTtlSec(session.ttlSec);
      if (ttlSec === 0) {
        return {
          ...session,
          ttlSec,
          remainingSec: null,
          expired: false,
          splitSuggested: false,
          ttlLabel: 'Manual',
        } satisfies BridgeLifecycleRow;
      }
      const elapsedSec = Math.max(0, Math.round((nowMs - Number(session.createdAtMs || nowMs)) / 1000));
      const remainingSec = Math.max(0, ttlSec - elapsedSec);
      const expired = elapsedSec >= ttlSec;
      return {
        ...session,
        ttlSec,
        remainingSec,
        expired,
        splitSuggested: expired,
        ttlLabel: expired ? 'TTL elapsed' : formatSecondsForDisplay(remainingSec),
      } satisfies BridgeLifecycleRow;
    })
    .sort((left, right) => Number(right.createdAtMs || 0) - Number(left.createdAtMs || 0));
}

