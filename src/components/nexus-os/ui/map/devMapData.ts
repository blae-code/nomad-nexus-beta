import type { CqbEvent, LocationEstimate, SpatialLocation } from '../../schemas/coreSchemas';
import type { ControlSignal, ControlZoneScope } from '../../schemas/mapSchemas';
import type { CqbRosterMember } from '../cqb/cqbTypes';
import { findMapNodeForLocation } from './mapBoard';

interface MapDataInput {
  events: CqbEvent[];
  roster: CqbRosterMember[];
  opId?: string;
}

function byElementDefaultLocation(element: CqbRosterMember['element']): SpatialLocation {
  if (element === 'CE') return { system: 'Stanton', body: 'ArcCorp', region: 'Command Layer' };
  if (element === 'ACE') return { system: 'Pyro', body: 'Pyro II', region: 'Transit Lane' };
  return { system: 'Stanton', body: 'Hurston', region: 'Ground AO' };
}

function mapScopeFromLocation(location: SpatialLocation): ControlZoneScope {
  if (location.site) return 'site';
  if (location.region) return 'region';
  if (location.body) return 'body';
  return 'system';
}

function mapOrgFromElement(element: CqbRosterMember['element']): string {
  if (element === 'CE') return 'REDSCAR-CE';
  if (element === 'ACE') return 'REDSCAR-ACE';
  return 'REDSCAR-GCE';
}

function findLatestEventByAuthor(events: CqbEvent[]): Record<string, CqbEvent> {
  return events.reduce<Record<string, CqbEvent>>((acc, event) => {
    const current = acc[event.authorId];
    if (!current || new Date(event.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      acc[event.authorId] = event;
    }
    return acc;
  }, {});
}

export function buildDevLocationEstimates(input: MapDataInput): LocationEstimate[] {
  const opFiltered = input.opId
    ? input.events.filter((event) => event.opId === input.opId)
    : input.events;
  const latestByAuthor = findLatestEventByAuthor(opFiltered);

  return input.roster
    .map((member) => {
      const latestEvent = latestByAuthor[member.id];
      if (!latestEvent) return null;
      const fallback = byElementDefaultLocation(member.element);
      const destination = String(latestEvent.payload?.destinationTag || '').trim();
      const hintedLocation: SpatialLocation = destination
        ? { ...fallback, region: destination }
        : fallback;

      return {
        subjectId: member.id,
        bestGuessLocation: hintedLocation,
        confidence: latestEvent.confidence >= 0.8 ? 0.8 : 0.62,
        sources: [
          {
            sourceId: latestEvent.id,
            sourceType: 'COMMS_CALL',
            observedAt: latestEvent.createdAt,
            confidence: latestEvent.confidence,
            notes: `Derived from gameplay event ${latestEvent.eventType}`,
          },
        ],
        mode: latestEvent.eventType === 'MOVE_OUT' || latestEvent.eventType === 'ON_ME' ? 'DECLARED' : 'INFERRED',
        updatedAt: latestEvent.createdAt,
        ttlSeconds: Math.max(120, latestEvent.ttlSeconds),
        visibilityScope: 'ORG' as const,
      };
    })
    .filter(Boolean) as LocationEstimate[];
}

function inferNodeIdFromEstimate(estimate: LocationEstimate): string | undefined {
  const node = findMapNodeForLocation(estimate.bestGuessLocation);
  return node?.id;
}

function signalWeightFromEvent(event: CqbEvent): number {
  if (event.eventType === 'CEASE_FIRE' || event.eventType === 'CHECK_FIRE') return 0.95;
  if (event.eventType === 'HOLD' || event.eventType === 'SET_SECURITY') return 0.8;
  return 0.64;
}

export function buildDevControlSignals(input: MapDataInput & { locationEstimates: LocationEstimate[] }): ControlSignal[] {
  const nowIso = new Date().toISOString();
  const byMember = new Map(input.roster.map((member) => [member.id, member]));

  const presenceSignals: ControlSignal[] = input.locationEstimates.map((estimate) => {
    const member = byMember.get(estimate.subjectId);
    const nodeId = inferNodeIdFromEstimate(estimate);
    return {
      type: estimate.mode === 'DECLARED' ? 'PRESENCE_DECLARED' : 'OTHER',
      sourceRef: { id: `estimate:${estimate.subjectId}:${estimate.updatedAt}`, kind: 'location_estimate' },
      weight: 0.55 + estimate.confidence * 0.4,
      confidence: estimate.confidence,
      occurredAt: estimate.updatedAt,
      expiresAt: new Date(new Date(estimate.updatedAt).getTime() + estimate.ttlSeconds * 1000).toISOString(),
      orgId: member ? mapOrgFromElement(member.element) : 'REDSCAR-UNASSIGNED',
      scope: mapScopeFromLocation(estimate.bestGuessLocation),
      geometryHint: { nodeId },
      notes: `Presence from ${estimate.mode} estimate`,
    };
  });

  const cqbSignals: ControlSignal[] = input.events
    .filter((event) => (input.opId ? event.opId === input.opId : true))
    .map((event) => {
      const member = byMember.get(event.authorId);
      const estimate = input.locationEstimates.find((item) => item.subjectId === event.authorId);
      const nodeId = estimate ? inferNodeIdFromEstimate(estimate) : undefined;
      return {
        type: 'CQB_EVENT',
        sourceRef: { id: event.id, kind: 'cqb_event' },
        weight: signalWeightFromEvent(event),
        confidence: event.confidence,
        occurredAt: event.createdAt,
        expiresAt: new Date(new Date(event.createdAt).getTime() + event.ttlSeconds * 1000).toISOString(),
        orgId: member ? mapOrgFromElement(member.element) : 'REDSCAR-UNASSIGNED',
        scope: estimate ? mapScopeFromLocation(estimate.bestGuessLocation) : 'system',
        geometryHint: { nodeId },
        notes: `Signal from ${event.eventType}`,
      };
    });

  const commandSignal: ControlSignal | null =
    presenceSignals.length > 0 || cqbSignals.length > 0
      ? {
          type: 'COMMAND_ENDORSEMENT',
          sourceRef: { id: `dev-command-${nowIso}`, kind: 'dev_observation' },
          weight: 0.52,
          confidence: 0.58,
          occurredAt: nowIso,
          expiresAt: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
          orgId: 'REDSCAR-CE',
          scope: 'system',
          geometryHint: { nodeId: 'system-stanton' },
          notes: 'Dev-only seeded command endorsement for contested-halo visualization.',
        }
      : null;

  return commandSignal ? [...presenceSignals, ...cqbSignals, commandSignal] : [...presenceSignals, ...cqbSignals];
}

export interface TacticalOverlayStub {
  id: string;
  title: string;
  nodeId: string;
}

/**
 * Placeholder overlay adapters. Keep interfaces stable for later packages.
 */
export function getOpsOverlayStub(): TacticalOverlayStub[] {
  return [];
}

export function getIntelOverlayStub(): TacticalOverlayStub[] {
  return [];
}

export function getCommsOverlayStub(): TacticalOverlayStub[] {
  return [];
}

export function getLogisticsOverlayStub(): TacticalOverlayStub[] {
  return [];
}
