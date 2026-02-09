/**
 * CQB Variant Registry
 *
 * Canonical CQB modes CQB-01..CQB-08.
 * Keep IDs stable forever; evolve by appending new metadata fields.
 */

import type { CqbEventType } from '../schemas/coreSchemas';
import type { CommsTemplateId } from './commsTemplateRegistry';

export interface CqbVariantDefinition {
  id: `CQB-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  description: string;
  allowedEventTypes: CqbEventType[];
  defaultTTLProfileId: string;
  defaultMacroSetId: string;
  defaultCommsTemplateId: CommsTemplateId;
}

const CANON_BREVITY_EVENT_TYPES: CqbEventType[] = [
  'KISS',
  'ROGER',
  'STAND_BY',
  'WILCO',
  'CLEAR_COMMS',
  'SAY_AGAIN',
  'ON_ME',
  'MOVE_OUT',
  'SET_SECURITY',
  'HOLD',
  'SELF_CHECK',
  'WEAPON_DRY',
  'SET',
  'GREEN',
  'RELOADING',
  'CROSSING',
  'CEASE_FIRE',
  'CHECK_FIRE',
];

export const CqbVariantRegistry: Readonly<CqbVariantDefinition[]> = [
  {
    id: 'CQB-01',
    description: 'Entry and clear for small interior compounds.',
    allowedEventTypes: ['STACK', 'ENTRY', 'CLEAR', 'CONTACT', 'HOLD', 'OBJECTIVE_SECURED', 'DOWNED', 'REVIVE', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-01',
    defaultMacroSetId: 'MACRO-CQB-01',
    defaultCommsTemplateId: 'FIRETEAM_PRIMARY',
  },
  {
    id: 'CQB-02',
    description: 'Ship boarding and compartment sweep under constrained corridors.',
    allowedEventTypes: ['STACK', 'BREACH', 'ENTRY', 'CONTACT', 'SUPPRESS', 'CLEAR', 'EXTRACT', 'THREAT_UPDATE', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-02',
    defaultMacroSetId: 'MACRO-CQB-02',
    defaultCommsTemplateId: 'SQUAD_NETS',
  },
  {
    id: 'CQB-03',
    description: 'Defensive hold and anchor-point retention against push attempts.',
    allowedEventTypes: ['CONTACT', 'HOLD', 'SUPPRESS', 'THREAT_UPDATE', 'DOWNED', 'REVIVE', 'RETREAT', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-03',
    defaultMacroSetId: 'MACRO-CQB-03',
    defaultCommsTemplateId: 'SQUAD_NETS',
  },
  {
    id: 'CQB-04',
    description: 'Hostage or VIP extraction through hostile interiors.',
    allowedEventTypes: ['ENTRY', 'CONTACT', 'HOLD', 'EXTRACT', 'FLANK', 'DOWNED', 'REVIVE', 'OBJECTIVE_SECURED', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-04',
    defaultMacroSetId: 'MACRO-CQB-04',
    defaultCommsTemplateId: 'EMERGENCY_NET',
  },
  {
    id: 'CQB-05',
    description: 'Night or low-visibility breach-and-clear with deliberate pacing.',
    allowedEventTypes: ['STACK', 'BREACH', 'ENTRY', 'CONTACT', 'INTEL_MARKER', 'THREAT_UPDATE', 'HOLD', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-05',
    defaultMacroSetId: 'MACRO-CQB-05',
    defaultCommsTemplateId: 'FIRETEAM_PRIMARY',
  },
  {
    id: 'CQB-06',
    description: 'Multi-team synchronized breach on compound or platform structures.',
    allowedEventTypes: ['STACK', 'BREACH', 'ENTRY', 'FLANK', 'SUPPRESS', 'OBJECTIVE_SECURED', 'THREAT_UPDATE', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-06',
    defaultMacroSetId: 'MACRO-CQB-06',
    defaultCommsTemplateId: 'COMMAND_NET',
  },
  {
    id: 'CQB-07',
    description: 'Counter-boarding and hard point recapture for damaged vessels.',
    allowedEventTypes: ['CONTACT', 'SUPPRESS', 'RETREAT', 'HOLD', 'ENTRY', 'CLEAR', 'EXTRACT', 'DOWNED', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-07',
    defaultMacroSetId: 'MACRO-CQB-07',
    defaultCommsTemplateId: 'SQUAD_NETS',
  },
  {
    id: 'CQB-08',
    description: 'Live-fire CQB rehearsal and doctrine validation lane.',
    allowedEventTypes: ['STACK', 'ENTRY', 'CLEAR', 'HOLD', 'THREAT_UPDATE', 'INTEL_MARKER', 'OBJECTIVE_SECURED', ...CANON_BREVITY_EVENT_TYPES],
    defaultTTLProfileId: 'TTL-CQB-08',
    defaultMacroSetId: 'MACRO-CQB-08',
    defaultCommsTemplateId: 'FIRETEAM_PRIMARY',
  },
];

export const CqbVariantRegistryById: Readonly<Record<CqbVariantDefinition['id'], CqbVariantDefinition>> =
  Object.freeze(
    CqbVariantRegistry.reduce((acc, variant) => {
      acc[variant.id] = variant;
      return acc;
    }, {} as Record<CqbVariantDefinition['id'], CqbVariantDefinition>)
  );

export function getCqbVariant(variantId: string): CqbVariantDefinition | null {
  return CqbVariantRegistryById[variantId as CqbVariantDefinition['id']] || null;
}
