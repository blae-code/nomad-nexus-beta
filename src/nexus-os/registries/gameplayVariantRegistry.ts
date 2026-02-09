/**
 * Gameplay Variant Registry
 *
 * Canonical loop/variant catalog. IDs are stable keys and should never be renamed.
 * Extension strategy: append new variants; avoid mutating existing ID semantics.
 */

import type { CommsTemplateId } from './commsTemplateRegistry';

export type GameplayLoop =
  | 'MINING'
  | 'PVP'
  | 'SALVAGE'
  | 'HAULING'
  | 'MEDICAL'
  | 'EXPLORATION'
  | 'BOUNTY'
  | 'SECURITY'
  | 'INDUSTRY'
  | 'RACING'
  | 'SMUGGLING'
  | 'TRAINING';

export type GameplayEnvironment = '0G' | 'Surface' | 'Interior' | 'Space';
export type BridgeId = 'OPS' | 'COMMAND' | 'INDUSTRY' | 'LOGISTICS' | 'INTEL' | 'SOCIAL' | 'RESCUE';

export interface GameplayVariantDefinition {
  id: string;
  loop: GameplayLoop;
  environment: GameplayEnvironment;
  defaultBridge: BridgeId;
  defaultCqbVariantId?: string;
  defaultCommsTemplateId: CommsTemplateId;
  notes: string;
}

export const GameplayVariantRegistry: Readonly<GameplayVariantDefinition[]> = [
  {
    id: 'MINING_GEO',
    loop: 'MINING',
    environment: 'Surface',
    defaultBridge: 'INDUSTRY',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Ground mining loop where extraction cadence and hauler timing dominate comms.',
  },
  {
    id: 'MINING_ASTEROID_0G',
    loop: 'MINING',
    environment: '0G',
    defaultBridge: 'INDUSTRY',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Asteroid-belt mining with deconfliction for EVA and cargo routing.',
  },
  {
    id: 'PVP_CQB_BOARDING',
    loop: 'PVP',
    environment: 'Interior',
    defaultBridge: 'OPS',
    defaultCqbVariantId: 'CQB-02',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Hostile boarding in ship interiors; rapid compartment status updates are mandatory.',
  },
  {
    id: 'PVP_CQB_RAID',
    loop: 'PVP',
    environment: 'Interior',
    defaultBridge: 'COMMAND',
    defaultCqbVariantId: 'CQB-06',
    defaultCommsTemplateId: 'COMMAND_NET',
    notes: 'Multi-team raid with synchronized breaches and phase-gated command intent.',
  },
  {
    id: 'CONVOY_ESCORT',
    loop: 'PVP',
    environment: 'Space',
    defaultBridge: 'OPS',
    defaultCommsTemplateId: 'COMMAND_NET',
    notes: 'Convoy escort under uncertain threats with command + screening lanes.',
  },
  {
    id: 'SALVAGE_HULL_STRIP',
    loop: 'SALVAGE',
    environment: 'Space',
    defaultBridge: 'INDUSTRY',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Coordinated salvage extraction where claim, queueing, and cargo state are key events.',
  },
  {
    id: 'SALVAGE_RECOVERY_HOT_ZONE',
    loop: 'SALVAGE',
    environment: 'Space',
    defaultBridge: 'OPS',
    defaultCommsTemplateId: 'COMMAND_NET',
    notes: 'Salvage in contested zones; contact and retreat directives carry short TTL.',
  },
  {
    id: 'HAULING_CONVOY',
    loop: 'HAULING',
    environment: 'Space',
    defaultBridge: 'LOGISTICS',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Cargo movement loop with escort handoff and waypoint-level route updates.',
  },
  {
    id: 'MEDICAL_SAR',
    loop: 'MEDICAL',
    environment: 'Surface',
    defaultBridge: 'RESCUE',
    defaultCommsTemplateId: 'EMERGENCY_NET',
    notes: 'Search and rescue chain where triage + extraction intent must be explicit.',
  },
  {
    id: 'EXPLORATION_SURVEY',
    loop: 'EXPLORATION',
    environment: 'Surface',
    defaultBridge: 'INTEL',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Survey loop focused on conservative location estimates and discovery evidence.',
  },
  {
    id: 'BOUNTY_INTERDICTION',
    loop: 'BOUNTY',
    environment: 'Space',
    defaultBridge: 'OPS',
    defaultCommsTemplateId: 'COMMAND_NET',
    notes: 'Target interception with role-specific channels for pursuit, block, and capture.',
  },
  {
    id: 'SECURITY_SITE_DEFENSE',
    loop: 'SECURITY',
    environment: 'Interior',
    defaultBridge: 'COMMAND',
    defaultCqbVariantId: 'CQB-03',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Defensive hold of interior site with rotating squads and casualty reporting.',
  },
  {
    id: 'INDUSTRY_REFINERY_RUN',
    loop: 'INDUSTRY',
    environment: 'Surface',
    defaultBridge: 'INDUSTRY',
    defaultCommsTemplateId: 'SQUAD_NETS',
    notes: 'Industrial loop for refinery timing, inventory constraints, and dispatch intents.',
  },
  {
    id: 'RACING_TIME_TRIAL',
    loop: 'RACING',
    environment: 'Surface',
    defaultBridge: 'SOCIAL',
    defaultCommsTemplateId: 'FIRETEAM_PRIMARY',
    notes: 'Race coordination where marshal calls and safety events have short TTL windows.',
  },
  {
    id: 'SMUGGLING_BLOCKADE_RUN',
    loop: 'SMUGGLING',
    environment: 'Space',
    defaultBridge: 'OPS',
    defaultCommsTemplateId: 'COMMAND_NET',
    notes: 'Stealth logistics under pursuit pressure; authority and visibility scope are critical.',
  },
  {
    id: 'TRAINING_CQB_LIVE_FIRE',
    loop: 'TRAINING',
    environment: 'Interior',
    defaultBridge: 'COMMAND',
    defaultCqbVariantId: 'CQB-08',
    defaultCommsTemplateId: 'FIRETEAM_PRIMARY',
    notes: 'Doctrine rehearsal loop for validating CQB macros, callouts, and TTL profiles.',
  },
];

export const GameplayVariantRegistryById: Readonly<Record<string, GameplayVariantDefinition>> = Object.freeze(
  GameplayVariantRegistry.reduce((acc, variant) => {
    acc[variant.id] = variant;
    return acc;
  }, {} as Record<string, GameplayVariantDefinition>)
);

export function getGameplayVariant(variantId: string): GameplayVariantDefinition | null {
  return GameplayVariantRegistryById[variantId] || null;
}
