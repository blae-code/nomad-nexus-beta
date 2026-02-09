/**
 * Macro Registry
 *
 * Canonical CQB macro sets keyed by CQB variant.
 * These are structured event emitters for explicit operator input only.
 */

import type { CqbEventType } from '../schemas/coreSchemas';

export interface CqbMacroDefinition {
  id: string;
  label: string;
  eventType: CqbEventType;
  payloadTemplate: Record<string, unknown>;
  tooltip?: string;
  phrases?: string[];
}

export type CqbMacroSetId = `MACRO-CQB-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface CqbMacroSet {
  id: CqbMacroSetId;
  variantId: `CQB-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  macros: CqbMacroDefinition[];
}

function createCanonBrevityMacros(prefix: string): CqbMacroDefinition[] {
  return [
    {
      id: `${prefix}-KISS`,
      label: 'KISS',
      eventType: 'KISS',
      payloadTemplate: { brevity: 'keep_it_simple' },
      tooltip: 'KISS - Keep it Simple Stupid',
      phrases: ['kiss', 'keep it simple'],
    },
    {
      id: `${prefix}-ROGER`,
      label: 'ROGER',
      eventType: 'ROGER',
      payloadTemplate: { acknowledgement: 'understood' },
      tooltip: 'ROGER - Understood',
      phrases: ['roger'],
    },
    {
      id: `${prefix}-STANDBY`,
      label: 'Stand by/Wait One',
      eventType: 'STAND_BY',
      payloadTemplate: { waitSeconds: 15 },
      tooltip: 'Stand by/Wait One - Need a moment',
      phrases: ['stand by', 'wait one'],
    },
    {
      id: `${prefix}-WILCO`,
      label: 'WILCO',
      eventType: 'WILCO',
      payloadTemplate: { acknowledgement: 'will_comply' },
      tooltip: 'WILCO - Will comply',
      phrases: ['wilco'],
    },
    {
      id: `${prefix}-CLEARCOMMS`,
      label: 'Clear comms',
      eventType: 'CLEAR_COMMS',
      payloadTemplate: { silenceRequired: true },
      tooltip: 'Clear comms - Stop talking over air ways',
      phrases: ['clear comms'],
    },
    {
      id: `${prefix}-SAYAGAIN`,
      label: 'Say again',
      eventType: 'SAY_AGAIN',
      payloadTemplate: { requestRepeat: true },
      tooltip: 'Say again - Repeat last message',
      phrases: ['say again'],
    },
    {
      id: `${prefix}-ONME`,
      label: 'On Me',
      eventType: 'ON_ME',
      payloadTemplate: { regroup: true },
      tooltip: 'On Me - Form up',
      phrases: ['on me'],
    },
    {
      id: `${prefix}-MOVEOUT`,
      label: 'Move out/Step off',
      eventType: 'MOVE_OUT',
      payloadTemplate: { destinationTag: '', phase: 'step_off' },
      tooltip: 'Move out/Step off - Start moving',
      phrases: ['move out', 'step off'],
    },
    {
      id: `${prefix}-SETSEC`,
      label: 'Set security',
      eventType: 'SET_SECURITY',
      payloadTemplate: { coverage360: true, selfCheckRequired: true },
      tooltip: 'Set security - Set 360deg protection and self check',
      phrases: ['set security', 'set 360'],
    },
    {
      id: `${prefix}-HOLD`,
      label: 'Hold',
      eventType: 'HOLD',
      payloadTemplate: { haltMovement: true },
      tooltip: 'Hold - Stop movement',
      phrases: ['hold'],
    },
    {
      id: `${prefix}-SELFCHECK`,
      label: 'Self check',
      eventType: 'SELF_CHECK',
      payloadTemplate: { condition: 'up' },
      tooltip: 'Self check - Checking of ones status',
      phrases: ['self check'],
    },
    {
      id: `${prefix}-WEAPONDRY`,
      label: 'weapon dry',
      eventType: 'WEAPON_DRY',
      payloadTemplate: { ammoState: 'empty' },
      tooltip: 'weapon dry - Out of ammo',
      phrases: ['weapon dry'],
    },
    {
      id: `${prefix}-SET`,
      label: 'Set',
      eventType: 'SET',
      payloadTemplate: { inPosition: true },
      tooltip: 'Set - In position',
      phrases: ['set'],
    },
    {
      id: `${prefix}-GREEN`,
      label: 'Green',
      eventType: 'GREEN',
      payloadTemplate: { readiness: 'good_to_go' },
      tooltip: 'Green - Good to go',
      phrases: ['green'],
    },
    {
      id: `${prefix}-RELOADING`,
      label: 'Reloading',
      eventType: 'RELOADING',
      payloadTemplate: { cycle: 'magazine' },
      tooltip: 'Reloading - Reloading',
      phrases: ['reloading'],
    },
    {
      id: `${prefix}-CROSSING`,
      label: 'Crossing',
      eventType: 'CROSSING',
      payloadTemplate: { direction: '', lane: '' },
      tooltip: 'Crossing - Moving in front of someone\'s line of fire',
      phrases: ['crossing'],
    },
    {
      id: `${prefix}-CEASEFIRE`,
      label: 'cease fire',
      eventType: 'CEASE_FIRE',
      payloadTemplate: { stopAllFire: true },
      tooltip: 'cease fire - Stop firing',
      phrases: ['cease fire'],
    },
    {
      id: `${prefix}-CHECKFIRE`,
      label: 'check fire',
      eventType: 'CHECK_FIRE',
      payloadTemplate: { friendlyRisk: true },
      tooltip: 'check fire - Stop friendly fire',
      phrases: ['check fire'],
    },
  ];
}

export const MacroRegistry: Readonly<CqbMacroSet[]> = [
  {
    id: 'MACRO-CQB-01',
    variantId: 'CQB-01',
    macros: [
      {
        id: 'MAC-CQB01-STACK',
        label: 'Stack Up',
        eventType: 'STACK',
        payloadTemplate: { lane: 'main', team: 'alpha' },
        phrases: ['stack up', 'set stack', 'stack ready'],
      },
      {
        id: 'MAC-CQB01-ENTRY',
        label: 'Entry',
        eventType: 'ENTRY',
        payloadTemplate: { route: 'primary', speed: 'deliberate' },
        phrases: ['entry now', 'go go go'],
      },
      {
        id: 'MAC-CQB01-CLEAR',
        label: 'Room Clear',
        eventType: 'CLEAR',
        payloadTemplate: { roomStatus: 'clear' },
        phrases: ['room clear', 'clear left clear right'],
      },
      ...createCanonBrevityMacros('MAC-CQB01'),
    ],
  },
  {
    id: 'MACRO-CQB-02',
    variantId: 'CQB-02',
    macros: [
      {
        id: 'MAC-CQB02-BREACH',
        label: 'Breach',
        eventType: 'BREACH',
        payloadTemplate: { breachType: 'charge', compartment: 'unknown' },
        phrases: ['breach breach', 'breach set'],
      },
      {
        id: 'MAC-CQB02-CONTACT',
        label: 'Contact',
        eventType: 'CONTACT',
        payloadTemplate: { direction: 'forward', count: 1 },
        phrases: ['contact front', 'hostile front'],
      },
      {
        id: 'MAC-CQB02-EXTRACT',
        label: 'Extract Team',
        eventType: 'EXTRACT',
        payloadTemplate: { route: 'egress-1', urgency: 'high' },
        phrases: ['extract now', 'fallback to ship'],
      },
      ...createCanonBrevityMacros('MAC-CQB02'),
    ],
  },
  {
    id: 'MACRO-CQB-03',
    variantId: 'CQB-03',
    macros: [
      {
        id: 'MAC-CQB03-HOLD-SECTOR',
        label: 'Hold Sector',
        eventType: 'HOLD',
        payloadTemplate: { sector: 'alpha', durationSeconds: 60 },
      },
      {
        id: 'MAC-CQB03-SUPPRESS',
        label: 'Suppress Lane',
        eventType: 'SUPPRESS',
        payloadTemplate: { lane: 'north', intensity: 'controlled' },
      },
      {
        id: 'MAC-CQB03-RETREAT',
        label: 'Fallback',
        eventType: 'RETREAT',
        payloadTemplate: { fallbackPoint: 'anchor-1' },
      },
      ...createCanonBrevityMacros('MAC-CQB03'),
    ],
  },
  {
    id: 'MACRO-CQB-04',
    variantId: 'CQB-04',
    macros: [
      {
        id: 'MAC-CQB04-DOWNED',
        label: 'Member Down',
        eventType: 'DOWNED',
        payloadTemplate: { casualtyCount: 1, triageRequired: true },
      },
      {
        id: 'MAC-CQB04-REVIVE',
        label: 'Revive In Progress',
        eventType: 'REVIVE',
        payloadTemplate: { etaSeconds: 20 },
      },
      {
        id: 'MAC-CQB04-EXTRACT',
        label: 'VIP Extract',
        eventType: 'EXTRACT',
        payloadTemplate: { package: 'vip', route: 'med-evac' },
      },
      ...createCanonBrevityMacros('MAC-CQB04'),
    ],
  },
  {
    id: 'MACRO-CQB-05',
    variantId: 'CQB-05',
    macros: [
      {
        id: 'MAC-CQB05-INTEL',
        label: 'Mark Intel',
        eventType: 'INTEL_MARKER',
        payloadTemplate: { markerType: 'sound', confidenceBand: 'low' },
      },
      {
        id: 'MAC-CQB05-THREAT',
        label: 'Threat Update',
        eventType: 'THREAT_UPDATE',
        payloadTemplate: { threatLevel: 'elevated', source: 'visual' },
      },
      {
        id: 'MAC-CQB05-HOLD-LIGHT',
        label: 'Hold Light Discipline',
        eventType: 'HOLD',
        payloadTemplate: { posture: 'silent', lights: 'off' },
      },
      ...createCanonBrevityMacros('MAC-CQB05'),
    ],
  },
  {
    id: 'MACRO-CQB-06',
    variantId: 'CQB-06',
    macros: [
      {
        id: 'MAC-CQB06-SYNC',
        label: 'Synchronized Breach',
        eventType: 'BREACH',
        payloadTemplate: { syncWindowSeconds: 5, teams: ['alpha', 'bravo'] },
      },
      {
        id: 'MAC-CQB06-FLANK',
        label: 'Flank Order',
        eventType: 'FLANK',
        payloadTemplate: { direction: 'west', team: 'bravo' },
      },
      {
        id: 'MAC-CQB06-SECURE',
        label: 'Objective Secured',
        eventType: 'OBJECTIVE_SECURED',
        payloadTemplate: { objectiveId: 'primary', status: 'secured' },
      },
      ...createCanonBrevityMacros('MAC-CQB06'),
    ],
  },
  {
    id: 'MACRO-CQB-07',
    variantId: 'CQB-07',
    macros: [
      {
        id: 'MAC-CQB07-CONTACT',
        label: 'Counter-Board Contact',
        eventType: 'CONTACT',
        payloadTemplate: { compartment: 'midship', count: 2 },
      },
      {
        id: 'MAC-CQB07-SUPPRESS',
        label: 'Suppress Boarding Route',
        eventType: 'SUPPRESS',
        payloadTemplate: { route: 'airlock-2' },
      },
      {
        id: 'MAC-CQB07-RETREAT',
        label: 'Compartment Retreat',
        eventType: 'RETREAT',
        payloadTemplate: { fallbackCompartment: 'engineering' },
      },
      ...createCanonBrevityMacros('MAC-CQB07'),
    ],
  },
  {
    id: 'MACRO-CQB-08',
    variantId: 'CQB-08',
    macros: [
      {
        id: 'MAC-CQB08-STACK',
        label: 'Training Stack',
        eventType: 'STACK',
        payloadTemplate: { drill: 'entry-1', roleCheck: true },
      },
      {
        id: 'MAC-CQB08-CLEAR',
        label: 'Training Clear Call',
        eventType: 'CLEAR',
        payloadTemplate: { gradingTag: 'clear-call' },
      },
      {
        id: 'MAC-CQB08-SECURE',
        label: 'Drill Complete',
        eventType: 'OBJECTIVE_SECURED',
        payloadTemplate: { drillState: 'complete' },
      },
      ...createCanonBrevityMacros('MAC-CQB08'),
    ],
  },
];

export const MacroRegistryBySetId: Readonly<Record<CqbMacroSetId, CqbMacroSet>> = Object.freeze(
  MacroRegistry.reduce((acc, set) => {
    acc[set.id] = set;
    return acc;
  }, {} as Record<CqbMacroSetId, CqbMacroSet>)
);

export function getMacroSetById(setId: string): CqbMacroSet | null {
  return MacroRegistryBySetId[setId as CqbMacroSetId] || null;
}

export function getMacrosForVariant(variantId: string): CqbMacroDefinition[] {
  const set = MacroRegistry.find((entry) => entry.variantId === variantId);
  return set ? set.macros : [];
}
