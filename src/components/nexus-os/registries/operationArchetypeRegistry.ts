import type { CommsTemplateId } from './commsTemplateRegistry';
import { getGameplayVariant, GameplayVariantRegistry } from './gameplayVariantRegistry';
import {
  getVariantAvailability,
  getVariantDisplayBadge,
  type StarCitizenAvailability,
  type StarCitizenAvailabilityOptions,
} from './starCitizenReleaseRegistry';
import type {
  OperationArchetypeId,
  OperationContentConfidence,
  OperationPosture,
  OperationReleaseTrack,
  OperationStatus,
  OperationMiningTier,
  OperationMiningEnvironment,
  OperationMiningExtractionMethod,
  OperationSalvageMode,
  OperationSalvageEnvironment,
  OperationSalvageExtractionMethod,
  OperationPvpEnvironment,
  OperationPvpEngagementProfile,
  RequirementKind,
  RuleEnforcement,
  OperationReadinessGate,
  OperationSecurityProjection,
} from '../schemas/opSchemas';
import type { DataClassification } from '../schemas/crossOrgSchemas';
import type { MandateEnforcement } from '../services/operationEnhancementService';

export interface OperationArchetypeWizardStep {
  id: string;
  label: string;
  description: string;
}

export interface OperationSeedObjective {
  title: string;
  priority: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
}

export interface OperationSeedPhase {
  title: string;
  timeHint?: string;
}

export interface OperationSeedTask {
  domain: 'FPS' | 'GROUND' | 'AIR_SPACE' | 'LOGISTICS' | 'INTEL' | 'COMMAND' | 'OTHER';
  title: string;
}

export interface OperationSeedRequirementRule {
  enforcement: RuleEnforcement;
  kind: RequirementKind;
  predicate: Record<string, unknown>;
  message: string;
}

export interface OperationSeedRoleMandate {
  role: string;
  minCount: number;
  enforcement: MandateEnforcement;
  requiredLoadoutTags?: string[];
}

export interface OperationSeedLoadoutMandate {
  label: string;
  tagsAny: string[];
  appliesToRoles?: string[];
  enforcement: MandateEnforcement;
}

export interface OperationSeedAssetMandate {
  assetTag: string;
  minCount: number;
  enforcement: MandateEnforcement;
}

export interface OperationArchetypeSeedBundle {
  objectives: OperationSeedObjective[];
  phases: OperationSeedPhase[];
  tasks: OperationSeedTask[];
  requirementRules: OperationSeedRequirementRule[];
  roleMandates: OperationSeedRoleMandate[];
  loadoutMandates: OperationSeedLoadoutMandate[];
  assetMandates: OperationSeedAssetMandate[];
  readinessGates: Array<Pick<OperationReadinessGate, 'label' | 'ownerRole' | 'required'>>;
}

export interface OperationArchetypeDefinition {
  id: OperationArchetypeId;
  label: string;
  description: string;
  loopCategory: 'INDUSTRY' | 'PVP' | 'CUSTOM';
  variantOptions: string[];
  defaults: {
    posture: OperationPosture;
    status: OperationStatus;
    classification: DataClassification;
    commsTemplateId: CommsTemplateId;
    ttlProfileId: string;
    domains: {
      fps: boolean;
      ground: boolean;
      airSpace: boolean;
      logistics: boolean;
    };
  };
  wizardSteps: OperationArchetypeWizardStep[];
  seedBundle: OperationArchetypeSeedBundle;
}

export interface OperationVariantSelectionOption {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
  badgeLabel: string;
  badgeTone: 'ok' | 'warning' | 'danger' | 'neutral';
  confidence: OperationContentConfidence;
  sourceCount: number;
  lastReviewedAt: string;
  legacyUnmapped: boolean;
}

export interface OperationMiningVariantProfile {
  id: string;
  label: string;
  tier: OperationMiningTier;
  environment: OperationMiningEnvironment;
  extractionMethod: OperationMiningExtractionMethod;
  defaultRoutePlan: string;
  defaultRefineryPlan: string;
  defaultEscortPolicy: string;
}

export interface OperationPvpVariantProfile {
  id: string;
  label: string;
  environment: OperationPvpEnvironment;
  engagementProfile: OperationPvpEngagementProfile;
  defaultObjectiveType: string;
  defaultCommandIntent: string;
  defaultRoe: string;
  defaultIngressPlan: string;
  defaultQrfPlan: string;
  defaultEvacPlan: string;
  defaultSustainmentPlan: string;
}

export interface OperationSalvageVariantProfile {
  id: string;
  label: string;
  mode: OperationSalvageMode;
  environment: OperationSalvageEnvironment;
  extractionMethod: OperationSalvageExtractionMethod;
  defaultObjectiveType: string;
  defaultRoutePlan: string;
  defaultProcessingPlan: string;
  defaultEscortPolicy: string;
  defaultInventoryPolicy: string;
}

const DEFAULT_WIZARD_STEPS: OperationArchetypeWizardStep[] = [
  { id: 'ARCHETYPE', label: 'Archetype', description: 'Select mission archetype and authority context.' },
  { id: 'IDENTITY', label: 'Identity', description: 'Set operation identity, org scope, and schedule.' },
  { id: 'SCENARIO', label: 'Scenario', description: 'Define scenario details for the selected archetype.' },
  { id: 'FORCE', label: 'Force', description: 'Set role minima and force composition expectations.' },
  { id: 'COMMS', label: 'Comms', description: 'Tune comms, rules, and security posture.' },
  { id: 'READINESS', label: 'Readiness', description: 'Confirm readiness gates and notification preferences.' },
  { id: 'REVIEW', label: 'Review', description: 'Review and create operation.' },
];

const MINING_VARIANT_PRESETS: Readonly<Record<string, Omit<OperationMiningVariantProfile, 'id'>>> = {
  MINING_GEO: {
    label: 'Ship Surface Mining (Ground)',
    tier: 'SHIP_SURFACE',
    environment: 'PLANETARY_SURFACE',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Ground claim route with shuttle handoff lanes.',
    defaultRefineryPlan: 'Refine high-value ore first, hold low-value ores for batch processing.',
    defaultEscortPolicy: '1 escort on site, 1 escort on haul lane.',
  },
  MINING_ASTEROID_0G: {
    label: 'Asteroid 0G Mining',
    tier: 'SHIP_SPACE',
    environment: 'SPACE_BELT',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Belt sweep loop with fuel and salvage waypoints.',
    defaultRefineryPlan: 'Direct high-purity loads to priority refine queue.',
    defaultEscortPolicy: 'Two-screen escort pattern around mining cluster and hauler vector.',
  },
  MINING_SHIP_SURFACE: {
    label: 'Ship Surface Mining',
    tier: 'SHIP_SURFACE',
    environment: 'PLANETARY_SURFACE',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Surface node sweep with planned extraction and lift-off windows.',
    defaultRefineryPlan: 'Refine top-margin ore, stage lower-margin ore for later batch.',
    defaultEscortPolicy: 'Area denial escort with periodic perimeter checks.',
  },
  MINING_SHIP_MOON: {
    label: 'Ship Moon Mining',
    tier: 'SHIP_SURFACE',
    environment: 'MOON_SURFACE',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Moon-side circuit with weather-safe and low-traffic nodes.',
    defaultRefineryPlan: 'Queue moon-source ore by volatility and haul distance.',
    defaultEscortPolicy: 'Escort anchored to lift-off windows and rally point coverage.',
  },
  MINING_ROC_SURFACE: {
    label: 'ROC Ground Mining',
    tier: 'ROC_GEO',
    environment: 'PLANETARY_SURFACE',
    extractionMethod: 'ROC_BEAM',
    defaultRoutePlan: 'Convoy sweep between ROC nodes and mothership pickup points.',
    defaultRefineryPlan: 'Prioritize sell/refine split by haul-risk threshold.',
    defaultEscortPolicy: 'Close escort for ROC convoy with QRF on standby.',
  },
  MINING_HAND_CAVE: {
    label: 'Hand Cave Mining',
    tier: 'HAND_MINING',
    environment: 'CAVE_INTERIOR',
    extractionMethod: 'HAND_TOOL',
    defaultRoutePlan: 'Cave ingress-egress lanes with medevac checkpoint timing.',
    defaultRefineryPlan: 'Sort by gem value and extraction risk before routing.',
    defaultEscortPolicy: 'Entry-team escort with extraction point security.',
  },
  MINING_PLANETARY_RING: {
    label: 'Planetary Ring Mining Sweep',
    tier: 'RING_SWEEP',
    environment: 'PLANETARY_RING',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Ring arc route with refuel and intel update checkpoints.',
    defaultRefineryPlan: 'Dispatch ring loads by purity band and queue time.',
    defaultEscortPolicy: 'Distributed escort net with high-speed intercept lane.',
  },
};

const MINING_VARIANT_IDS = GameplayVariantRegistry
  .filter((entry) => entry.loop === 'MINING')
  .map((entry) => entry.id);

const PVP_VARIANT_IDS = GameplayVariantRegistry
  .filter((entry) => entry.loop === 'PVP')
  .map((entry) => entry.id);

const PVP_VARIANT_PRESETS: Readonly<Record<string, Omit<OperationPvpVariantProfile, 'id'>>> = {
  PVP_CQB_RAID: {
    label: 'CQB Raid',
    environment: 'INTERIOR',
    engagementProfile: 'RAID',
    defaultObjectiveType: 'Objective Control',
    defaultCommandIntent: 'Seize and hold the objective sector with synchronized breach timing.',
    defaultRoe: 'Positive hostile ID required; preserve non-combatant lanes.',
    defaultIngressPlan: 'Two-axis breach with reserve stagger.',
    defaultQrfPlan: 'Hold QRF at rally-2 for counter-push response.',
    defaultEvacPlan: 'Fallback to rally-3 with medevac corridor.',
    defaultSustainmentPlan: 'Ammo and med rotation every 12 minutes.',
  },
  PVP_CQB_BOARDING: {
    label: 'CQB Boarding',
    environment: 'INTERIOR',
    engagementProfile: 'BOARDING',
    defaultObjectiveType: 'Ship Control',
    defaultCommandIntent: 'Secure bridge and engineering while denying enemy regroup.',
    defaultRoe: 'Weapons tight until breach signal; no blind fire in critical compartments.',
    defaultIngressPlan: 'Primary breach from dorsal lock, reserve via cargo access.',
    defaultQrfPlan: 'Rapid reinforcement stack at secured airlock.',
    defaultEvacPlan: 'Fallback to docking collar with medevac shuttle cover.',
    defaultSustainmentPlan: 'Compartment sweep every 8 minutes; med checks by squad leads.',
  },
  CONVOY_ESCORT: {
    label: 'Convoy Escort',
    environment: 'SPACE',
    engagementProfile: 'CONVOY_ESCORT',
    defaultObjectiveType: 'Convoy Integrity',
    defaultCommandIntent: 'Maintain convoy movement tempo and deny interdiction windows.',
    defaultRoe: 'Defensive fire authorized against lock-confirmed hostile assets.',
    defaultIngressPlan: 'Screen formation before departure with rotating picket.',
    defaultQrfPlan: 'Reserve flight staged 1 jump behind convoy lead.',
    defaultEvacPlan: 'Damaged convoy units reroute to repair waypoint with cover.',
    defaultSustainmentPlan: 'Fuel and ammo checks at each nav hold point.',
  },
};

const SALVAGE_VARIANT_IDS = GameplayVariantRegistry
  .filter((entry) => entry.loop === 'SALVAGE')
  .map((entry) => entry.id);

const SALVAGE_VARIANT_PRESETS: Readonly<Record<string, Omit<OperationSalvageVariantProfile, 'id'>>> = {
  SALVAGE_HULL_STRIP: {
    label: 'Hull Strip Salvage',
    mode: 'HULL_STRIP',
    environment: 'SPACE_DERELICT',
    extractionMethod: 'SCRAPER',
    defaultObjectiveType: 'RMC Yield',
    defaultRoutePlan: 'Derelict sweep route with staggered reclaim lanes.',
    defaultProcessingPlan: 'Prioritize high-yield hull sections first.',
    defaultEscortPolicy: 'Perimeter escort with intercept watch.',
    defaultInventoryPolicy: 'RMC-first storage, overflow to cargo transfer.',
  },
  SALVAGE_RECOVERY_HOT_ZONE: {
    label: 'Hot Zone Recovery',
    mode: 'CONTESTED_RECOVERY',
    environment: 'CONTESTED_ZONE',
    extractionMethod: 'MULTI_TOOL',
    defaultObjectiveType: 'Rapid Recovery',
    defaultRoutePlan: 'Short-cycle extraction route with rapid disengage points.',
    defaultProcessingPlan: 'Recover priority cargo/components before prolonged strip.',
    defaultEscortPolicy: 'Dedicated strike escort with QRF trigger.',
    defaultInventoryPolicy: 'Priority manifest lock; jettison low-value cargo if pressured.',
  },
  SALVAGE_COMPONENT_RECOVERY: {
    label: 'Component Recovery',
    mode: 'COMPONENT_RECOVERY',
    environment: 'SPACE_DERELICT',
    extractionMethod: 'TRACTOR',
    defaultObjectiveType: 'Component Yield',
    defaultRoutePlan: 'Component triage loop across wreck cluster.',
    defaultProcessingPlan: 'Recover critical components by value tier and demand.',
    defaultEscortPolicy: 'Escort anchored to tractor teams and hauler handoff.',
    defaultInventoryPolicy: 'Tag and rack components by class for quick resale.',
  },
  SALVAGE_CARGO_RECLAMATION: {
    label: 'Cargo Reclamation',
    mode: 'CARGO_RETRIEVAL',
    environment: 'DEBRIS_FIELD',
    extractionMethod: 'TRACTOR',
    defaultObjectiveType: 'Cargo Recovery',
    defaultRoutePlan: 'Cargo lane sweep with sequence by drift risk.',
    defaultProcessingPlan: 'Sort cargo by legality/value before dispatch.',
    defaultEscortPolicy: 'Escort maintains lane control and anti-ambush watch.',
    defaultInventoryPolicy: 'Manifest discipline with high-risk cargo segregation.',
  },
  SALVAGE_SURFACE_WRECK_RECOVERY: {
    label: 'Surface Wreck Recovery',
    mode: 'COMPONENT_RECOVERY',
    environment: 'SURFACE_WRECK',
    extractionMethod: 'SALVAGE_DRONE',
    defaultObjectiveType: 'Surface Asset Recovery',
    defaultRoutePlan: 'Ground route with pickup corridors and refuel nodes.',
    defaultProcessingPlan: 'Extract exposed components before heavy hull work.',
    defaultEscortPolicy: 'Ground and air escort split by extraction phase.',
    defaultInventoryPolicy: 'Surface manifest with ground-haul reconciliation.',
  },
  SALVAGE_BLACKBOX_RETRIEVAL: {
    label: 'Blackbox Retrieval',
    mode: 'BLACKBOX_RECOVERY',
    environment: 'SPACE_DERELICT',
    extractionMethod: 'MULTI_TOOL',
    defaultObjectiveType: 'Priority Data Recovery',
    defaultRoutePlan: 'Targeted ingress/egress for high-value recorders.',
    defaultProcessingPlan: 'Secure and chain-of-custody package before standard salvage.',
    defaultEscortPolicy: 'Close escort for retrieval team and extraction shuttle.',
    defaultInventoryPolicy: 'Isolate sensitive cargo and audit access path.',
  },
};

function fallbackMiningProfile(variantId: string): OperationMiningVariantProfile {
  const variant = getGameplayVariant(variantId);
  if (variant?.environment === '0G') {
    return {
      id: variantId,
      label: variant.id,
      tier: 'SHIP_SPACE',
      environment: 'SPACE_BELT',
      extractionMethod: 'SHIP_LASER',
      defaultRoutePlan: 'Space belt sweep route with deconflicted lanes.',
      defaultRefineryPlan: 'Prioritize high-purity loads for first-pass refinement.',
      defaultEscortPolicy: 'Escort screens haul lanes and extraction perimeter.',
    };
  }
  if (variant?.environment === 'Interior') {
    return {
      id: variantId,
      label: variant.id,
      tier: 'HAND_MINING',
      environment: 'CAVE_INTERIOR',
      extractionMethod: 'HAND_TOOL',
      defaultRoutePlan: 'Interior extraction with ingress-egress timing.',
      defaultRefineryPlan: 'Sort and route extracted ore by value class.',
      defaultEscortPolicy: 'Escort anchors entry and extraction points.',
    };
  }
  if (variant?.environment === 'Space') {
    return {
      id: variantId,
      label: variant.id,
      tier: 'RING_SWEEP',
      environment: 'PLANETARY_RING',
      extractionMethod: 'SHIP_LASER',
      defaultRoutePlan: 'Ring sweep route with fuel checkpoints.',
      defaultRefineryPlan: 'Dispatch ring ore by purity band.',
      defaultEscortPolicy: 'Escort covers intercept and disengage vectors.',
    };
  }
  return {
    id: variantId,
    label: variantId,
    tier: 'SHIP_SURFACE',
    environment: 'PLANETARY_SURFACE',
    extractionMethod: 'SHIP_LASER',
    defaultRoutePlan: 'Surface extraction loop with haul timing checkpoints.',
    defaultRefineryPlan: 'Refine high-value ore first.',
    defaultEscortPolicy: 'Escort patrols extraction and hauling corridors.',
  };
}

export function getMiningVariantProfile(variantId: string | undefined): OperationMiningVariantProfile {
  const targetId = String(variantId || MINING_VARIANT_IDS[0] || 'MINING_GEO').trim() || 'MINING_GEO';
  const preset = MINING_VARIANT_PRESETS[targetId];
  if (preset) {
    return {
      id: targetId,
      ...preset,
    };
  }
  return fallbackMiningProfile(targetId);
}

export function listMiningVariantProfiles(): OperationMiningVariantProfile[] {
  const ids = MINING_VARIANT_IDS.length ? MINING_VARIANT_IDS : ['MINING_GEO'];
  return ids.map((variantId) => getMiningVariantProfile(variantId));
}

function fallbackPvpProfile(variantId: string): OperationPvpVariantProfile {
  const variant = getGameplayVariant(variantId);
  if (variant?.environment === 'Space') {
    return {
      id: variantId,
      label: variant.id,
      environment: 'SPACE',
      engagementProfile: 'INTERDICTION',
      defaultObjectiveType: 'Interdiction',
      defaultCommandIntent: 'Disrupt hostile movement and secure engagement initiative.',
      defaultRoe: 'Engage only confirmed hostile assets; prioritize convoy threats.',
      defaultIngressPlan: 'Layered approach with reserve intercept lane.',
      defaultQrfPlan: 'Hold strike reserve outside immediate contact zone.',
      defaultEvacPlan: 'Break to pre-briefed nav fallback with medevac cover.',
      defaultSustainmentPlan: 'Rotate fuel/ammo at fixed engagement intervals.',
    };
  }
  if (variant?.environment === 'Interior') {
    return {
      id: variantId,
      label: variant.id,
      environment: 'INTERIOR',
      engagementProfile: 'RAID',
      defaultObjectiveType: 'Site Control',
      defaultCommandIntent: 'Deny enemy control and hold priority sectors.',
      defaultRoe: 'Clear hostile lanes while minimizing fratricide risk.',
      defaultIngressPlan: 'Multi-axis ingress with stack discipline.',
      defaultQrfPlan: 'Reserve squad staged behind objective axis.',
      defaultEvacPlan: 'Fallback to secure corridor with med support.',
      defaultSustainmentPlan: 'Resupply rhythm every objective cycle.',
    };
  }
  return {
    id: variantId,
    label: variantId,
    environment: 'MIXED',
    engagementProfile: 'DEFENSE',
    defaultObjectiveType: 'Territory Control',
    defaultCommandIntent: 'Maintain battlespace control and preserve force readiness.',
    defaultRoe: 'Engage positively identified hostile elements only.',
    defaultIngressPlan: 'Staggered ingress with contingency lanes.',
    defaultQrfPlan: 'Reserve element ready at central rally.',
    defaultEvacPlan: 'Evac route aligned to medevac and regroup points.',
    defaultSustainmentPlan: 'Sustainment checks at each phase transition.',
  };
}

export function getPvpVariantProfile(variantId: string | undefined): OperationPvpVariantProfile {
  const targetId = String(variantId || PVP_VARIANT_IDS[0] || 'PVP_CQB_RAID').trim() || 'PVP_CQB_RAID';
  const preset = PVP_VARIANT_PRESETS[targetId];
  if (preset) {
    return {
      id: targetId,
      ...preset,
    };
  }
  return fallbackPvpProfile(targetId);
}

export function listPvpVariantProfiles(): OperationPvpVariantProfile[] {
  const ids = PVP_VARIANT_IDS.length ? PVP_VARIANT_IDS : ['PVP_CQB_RAID', 'PVP_CQB_BOARDING', 'CONVOY_ESCORT'];
  return ids.map((variantId) => getPvpVariantProfile(variantId));
}

function fallbackSalvageProfile(variantId: string): OperationSalvageVariantProfile {
  const variant = getGameplayVariant(variantId);
  if (variant?.environment === 'Surface') {
    return {
      id: variantId,
      label: variant.id,
      mode: 'COMPONENT_RECOVERY',
      environment: 'SURFACE_WRECK',
      extractionMethod: 'SALVAGE_DRONE',
      defaultObjectiveType: 'Surface Recovery',
      defaultRoutePlan: 'Surface sweep route with extraction checkpoints.',
      defaultProcessingPlan: 'Recover components before hull strip.',
      defaultEscortPolicy: 'Ground escort with air overwatch.',
      defaultInventoryPolicy: 'Track recovered components by manifest tier.',
    };
  }
  if (variant?.environment === 'Interior') {
    return {
      id: variantId,
      label: variant.id,
      mode: 'BLACKBOX_RECOVERY',
      environment: 'SPACE_DERELICT',
      extractionMethod: 'MULTI_TOOL',
      defaultObjectiveType: 'Priority Retrieval',
      defaultRoutePlan: 'Targeted ingress with rapid exfil path.',
      defaultProcessingPlan: 'Secure priority data and critical components first.',
      defaultEscortPolicy: 'Close escort for boarding and exfil team.',
      defaultInventoryPolicy: 'High-value chain-of-custody manifest.',
    };
  }
  if (variant?.environment === 'Space') {
    return {
      id: variantId,
      label: variant.id,
      mode: 'HULL_STRIP',
      environment: 'SPACE_DERELICT',
      extractionMethod: 'SCRAPER',
      defaultObjectiveType: 'RMC Yield',
      defaultRoutePlan: 'Derelict belt sweep with safe haul vectors.',
      defaultProcessingPlan: 'Strip high-yield hull segments first.',
      defaultEscortPolicy: 'Perimeter escort and intercept coverage.',
      defaultInventoryPolicy: 'RMC + cargo lanes separated by priority.',
    };
  }
  return {
    id: variantId,
    label: variantId,
    mode: 'HULL_STRIP',
    environment: 'SPACE_DERELICT',
    extractionMethod: 'SCRAPER',
    defaultObjectiveType: 'Salvage Yield',
    defaultRoutePlan: 'Salvage route with timed extraction windows.',
    defaultProcessingPlan: 'Prioritize high-margin recovery first.',
    defaultEscortPolicy: 'Escort maintains salvage perimeter.',
    defaultInventoryPolicy: 'Manifest by value and legal risk.',
  };
}

export function getSalvageVariantProfile(variantId: string | undefined): OperationSalvageVariantProfile {
  const targetId = String(variantId || SALVAGE_VARIANT_IDS[0] || 'SALVAGE_HULL_STRIP').trim() || 'SALVAGE_HULL_STRIP';
  const preset = SALVAGE_VARIANT_PRESETS[targetId];
  if (preset) {
    return {
      id: targetId,
      ...preset,
    };
  }
  return fallbackSalvageProfile(targetId);
}

export function listSalvageVariantProfiles(): OperationSalvageVariantProfile[] {
  const ids = SALVAGE_VARIANT_IDS.length
    ? SALVAGE_VARIANT_IDS
    : ['SALVAGE_HULL_STRIP', 'SALVAGE_COMPONENT_RECOVERY', 'SALVAGE_CARGO_RECLAMATION'];
  return ids.map((variantId) => getSalvageVariantProfile(variantId));
}

function resolveVariantLabel(variantId: string): string {
  if (MINING_VARIANT_PRESETS[variantId]?.label) return MINING_VARIANT_PRESETS[variantId].label;
  if (PVP_VARIANT_PRESETS[variantId]?.label) return PVP_VARIANT_PRESETS[variantId].label;
  if (SALVAGE_VARIANT_PRESETS[variantId]?.label) return SALVAGE_VARIANT_PRESETS[variantId].label;
  return getGameplayVariant(variantId)?.id || variantId;
}

function toSelectionOption(variantId: string, availability: StarCitizenAvailability): OperationVariantSelectionOption {
  const badge = getVariantDisplayBadge(variantId);
  return {
    id: variantId,
    label: resolveVariantLabel(variantId),
    available: availability.available,
    reason: availability.reason,
    badgeLabel: badge.label,
    badgeTone: badge.tone,
    confidence: availability.confidence,
    sourceCount: availability.sourceCount,
    lastReviewedAt: availability.lastReviewedAt,
    legacyUnmapped: availability.legacyUnmapped,
  };
}

export function listReleaseFilteredArchetypeVariantOptions(
  archetypeId: OperationArchetypeId,
  releaseTrack: OperationReleaseTrack = 'LIVE_4_6',
  options: Omit<StarCitizenAvailabilityOptions, 'releaseTrack'> & { includeLocked?: boolean } = {}
): OperationVariantSelectionOption[] {
  const archetype = getOperationArchetype(archetypeId);
  const entries = (archetype.variantOptions || []).map((variantId) => {
    const availability = getVariantAvailability(variantId, {
      releaseTrack,
      sc47PreviewEnabled: options.sc47PreviewEnabled,
      experimentalEnabled: options.experimentalEnabled,
    });
    return toSelectionOption(variantId, availability);
  });
  if (options.includeLocked) return entries;
  const availableEntries = entries.filter((entry) => entry.available);
  if (availableEntries.length > 0) return availableEntries;
  return entries;
}

export function listReleaseFilteredVariantIds(
  archetypeId: OperationArchetypeId,
  releaseTrack: OperationReleaseTrack = 'LIVE_4_6',
  options: Omit<StarCitizenAvailabilityOptions, 'releaseTrack'> = {}
): string[] {
  return listReleaseFilteredArchetypeVariantOptions(archetypeId, releaseTrack, options).map((entry) => entry.id);
}

export const OperationArchetypeRegistry: Readonly<Record<OperationArchetypeId, OperationArchetypeDefinition>> = {
  INDUSTRIAL_MINING: {
    id: 'INDUSTRIAL_MINING',
    label: 'Industrial Mining',
    description: 'Live 4.6-aligned mining, haul, and refinery orchestration with logistics discipline.',
    loopCategory: 'INDUSTRY',
    variantOptions: listMiningVariantProfiles().map((entry) => entry.id),
    defaults: {
      posture: 'CASUAL',
      status: 'PLANNING',
      classification: 'INTERNAL',
      commsTemplateId: 'SQUAD_NETS',
      ttlProfileId: 'TTL-OP-CASUAL',
      domains: { fps: false, ground: true, airSpace: true, logistics: true },
    },
    wizardSteps: DEFAULT_WIZARD_STEPS,
    seedBundle: {
      objectives: [
        { title: 'Deliver contracted ore volume to refinery target.', priority: 'HIGH' },
        { title: 'Maintain escort integrity across extraction and haul windows.', priority: 'HIGH' },
        { title: 'Capture scouting telemetry and route adjustments across mining tiers.', priority: 'MED' },
      ],
      phases: [
        { title: 'Muster', timeHint: 'T-30m' },
        { title: 'Prospecting', timeHint: 'T+00m' },
        { title: 'Extraction', timeHint: 'T+20m' },
        { title: 'Haul and Refine', timeHint: 'T+80m' },
        { title: 'Debrief', timeHint: 'T+140m' },
      ],
      tasks: [
        { domain: 'LOGISTICS', title: 'Assign hauler rotation and cargo escort lanes.' },
        { domain: 'INTEL', title: 'Verify route hazards and congestion windows.' },
        { domain: 'COMMAND', title: 'Publish extraction cadence and fallback trigger.' },
        { domain: 'GROUND', title: 'Confirm tier-specific extraction package (ship, ROC, or hand) is mission-ready.' },
      ],
      requirementRules: [
        {
          enforcement: 'HARD',
          kind: 'COMMS',
          predicate: { commsRequired: true },
          message: 'Mining operation requires comms-ready crew with acknowledgment protocol.',
        },
        {
          enforcement: 'SOFT',
          kind: 'CAPABILITY',
          predicate: { capabilityAny: ['mining', 'hauler', 'escort', 'roc', 'hand_mining'] },
          message: 'Preferred capability mix includes extraction, hauling, escort, and recovery coverage.',
        },
      ],
      roleMandates: [
        { role: 'Mining Lead', minCount: 1, enforcement: 'HARD', requiredLoadoutTags: ['mining', 'scanner'] },
        { role: 'Prospector', minCount: 2, enforcement: 'SOFT', requiredLoadoutTags: ['mining'] },
        { role: 'Hauler', minCount: 2, enforcement: 'SOFT', requiredLoadoutTags: ['cargo'] },
        { role: 'Escort', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['combat'] },
        { role: 'Recovery', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['medical', 'tractor'] },
      ],
      loadoutMandates: [
        { label: 'Mining Laser Baseline', tagsAny: ['mining'], appliesToRoles: ['Mining Lead', 'Prospector'], enforcement: 'SOFT' },
        { label: 'Hauler Sustainment Baseline', tagsAny: ['cargo', 'tractor'], appliesToRoles: ['Hauler'], enforcement: 'SOFT' },
        { label: 'Recovery Baseline', tagsAny: ['medical', 'tractor'], appliesToRoles: ['Recovery'], enforcement: 'SOFT' },
      ],
      assetMandates: [
        { assetTag: 'mining', minCount: 2, enforcement: 'HARD' },
        { assetTag: 'hauler', minCount: 2, enforcement: 'SOFT' },
        { assetTag: 'escort', minCount: 1, enforcement: 'SOFT' },
        { assetTag: 'recovery', minCount: 1, enforcement: 'SOFT' },
      ],
      readinessGates: [
        { label: 'Route Confirmation', ownerRole: 'Logistics Lead', required: true },
        { label: 'Refinery Plan Locked', ownerRole: 'Mining Lead', required: true },
        { label: 'Escort Ready', ownerRole: 'Escort Lead', required: true },
        { label: 'Rescue Coverage Confirmed', ownerRole: 'Medical Lead', required: true },
        { label: 'Extraction Tier Package Ready', ownerRole: 'Operations Lead', required: true },
      ],
    },
  },
  INDUSTRIAL_SALVAGE: {
    id: 'INDUSTRIAL_SALVAGE',
    label: 'Industrial Salvage',
    description: 'Structured salvage recovery across hull strip, components, cargo, and contested reclamation.',
    loopCategory: 'INDUSTRY',
    variantOptions: listSalvageVariantProfiles().map((entry) => entry.id),
    defaults: {
      posture: 'CASUAL',
      status: 'PLANNING',
      classification: 'INTERNAL',
      commsTemplateId: 'SQUAD_NETS',
      ttlProfileId: 'TTL-OP-CASUAL',
      domains: { fps: false, ground: true, airSpace: true, logistics: true },
    },
    wizardSteps: DEFAULT_WIZARD_STEPS,
    seedBundle: {
      objectives: [
        { title: 'Recover target salvage value while maintaining claim and custody integrity.', priority: 'HIGH' },
        { title: 'Minimize salvage cycle time and avoid contamination losses.', priority: 'HIGH' },
        { title: 'Preserve crew and asset integrity under legal/threat constraints.', priority: 'MED' },
      ],
      phases: [
        { title: 'Muster', timeHint: 'T-30m' },
        { title: 'Claim + Recon', timeHint: 'T-10m' },
        { title: 'Extraction Window', timeHint: 'T+00m' },
        { title: 'Sort + Haul', timeHint: 'T+45m' },
        { title: 'Sell/Process', timeHint: 'T+90m' },
        { title: 'Debrief', timeHint: 'T+120m' },
      ],
      tasks: [
        { domain: 'INTEL', title: 'Validate claim status, legal exposure, and threat picture.' },
        { domain: 'LOGISTICS', title: 'Assign salvage lanes, cargo sort policy, and haul cadence.' },
        { domain: 'COMMAND', title: 'Set extraction cadence, disengage triggers, and custody controls.' },
        { domain: 'AIR_SPACE', title: 'Verify escort and interception coverage for salvage lanes.' },
      ],
      requirementRules: [
        {
          enforcement: 'HARD',
          kind: 'COMMS',
          predicate: { commsRequired: true },
          message: 'Salvage operations require comms discipline and manifest acknowledgments.',
        },
        {
          enforcement: 'SOFT',
          kind: 'CAPABILITY',
          predicate: { capabilityAny: ['salvage', 'tractor', 'cargo', 'escort'] },
          message: 'Preferred capability mix includes salvage, tractor, cargo handling, and escort.',
        },
      ],
      roleMandates: [
        { role: 'Salvage Lead', minCount: 1, enforcement: 'HARD', requiredLoadoutTags: ['salvage', 'scanner'] },
        { role: 'Strip Crew', minCount: 2, enforcement: 'SOFT', requiredLoadoutTags: ['salvage'] },
        { role: 'Tractor Operator', minCount: 2, enforcement: 'SOFT', requiredLoadoutTags: ['tractor', 'cargo'] },
        { role: 'Manifest Officer', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['logistics', 'comms'] },
        { role: 'Escort', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['combat'] },
      ],
      loadoutMandates: [
        { label: 'Salvage Beam Baseline', tagsAny: ['salvage'], appliesToRoles: ['Salvage Lead', 'Strip Crew'], enforcement: 'SOFT' },
        { label: 'Tractor Cargo Baseline', tagsAny: ['tractor', 'cargo'], appliesToRoles: ['Tractor Operator'], enforcement: 'SOFT' },
        { label: 'Manifest Control Baseline', tagsAny: ['comms', 'logistics'], appliesToRoles: ['Manifest Officer'], enforcement: 'SOFT' },
      ],
      assetMandates: [
        { assetTag: 'salvage', minCount: 1, enforcement: 'HARD' },
        { assetTag: 'tractor', minCount: 1, enforcement: 'SOFT' },
        { assetTag: 'hauler', minCount: 1, enforcement: 'SOFT' },
        { assetTag: 'escort', minCount: 1, enforcement: 'SOFT' },
      ],
      readinessGates: [
        { label: 'Claim Validation Complete', ownerRole: 'Salvage Lead', required: true },
        { label: 'Custody Manifest Ready', ownerRole: 'Manifest Officer', required: true },
        { label: 'Escort Coverage Confirmed', ownerRole: 'Escort Lead', required: true },
        { label: 'Processing Route Locked', ownerRole: 'Logistics Lead', required: true },
        { label: 'Legal Exposure Reviewed', ownerRole: 'Command', required: true },
      ],
    },
  },
  PVP_ORG_V_ORG: {
    id: 'PVP_ORG_V_ORG',
    label: 'Org vs Org PvP',
    description: 'Structured opposing-force combat planning abstraction with command-blinded visibility for non-command roles.',
    loopCategory: 'PVP',
    variantOptions: listPvpVariantProfiles().map((entry) => entry.id),
    defaults: {
      posture: 'FOCUSED',
      status: 'PLANNING',
      classification: 'INTERNAL',
      commsTemplateId: 'COMMAND_NET',
      ttlProfileId: 'TTL-OP-FOCUSED',
      domains: { fps: true, ground: true, airSpace: true, logistics: true },
    },
    wizardSteps: DEFAULT_WIZARD_STEPS,
    seedBundle: {
      objectives: [
        { title: 'Win objective control window against opposing org.', priority: 'CRITICAL' },
        { title: 'Sustain command tempo with reserve and medevac continuity.', priority: 'HIGH' },
        { title: 'Maintain opsec discipline while preserving command visibility on opposing force data.', priority: 'HIGH' },
      ],
      phases: [
        { title: 'Intel Prep', timeHint: 'T-45m' },
        { title: 'Staging', timeHint: 'T-15m' },
        { title: 'Contact', timeHint: 'T+00m' },
        { title: 'Objective Push', timeHint: 'T+20m' },
        { title: 'Disengage', timeHint: 'T+65m' },
        { title: 'AAR', timeHint: 'T+95m' },
      ],
      tasks: [
        { domain: 'INTEL', title: 'Lock rally points, threat vectors, and reserve routes.' },
        { domain: 'COMMAND', title: 'Publish command intent and escalation ladder.' },
        { domain: 'LOGISTICS', title: 'Pre-assign sustainment/QRF timings and evac lanes.' },
        { domain: 'COMMAND', title: 'Verify deconfliction lanes and fratricide controls before contact.' },
      ],
      requirementRules: [
        {
          enforcement: 'HARD',
          kind: 'COMMS',
          predicate: { commsRequired: true },
          message: 'Org-v-org scenario requires strict comms discipline and acknowledgments.',
        },
        {
          enforcement: 'HARD',
          kind: 'ROLE',
          predicate: { roleIn: ['Commander', 'Squad Lead', 'Assault', 'Support', 'Medevac', 'Recon', 'EWAR'] },
          message: 'Roster requires command, assault, support, recon, EWAR, and medevac roles.',
        },
        {
          enforcement: 'SOFT',
          kind: 'COMPOSITION',
          predicate: { composition: { assault: 4, support: 2, reserve: 2 } },
          message: 'Recommended composition keeps strike, sustainment, and reserve balance.',
        },
      ],
      roleMandates: [
        { role: 'Commander', minCount: 1, enforcement: 'HARD', requiredLoadoutTags: ['command', 'comms'] },
        { role: 'Squad Lead', minCount: 2, enforcement: 'HARD', requiredLoadoutTags: ['lead', 'comms'] },
        { role: 'Assault', minCount: 4, enforcement: 'SOFT', requiredLoadoutTags: ['combat'] },
        { role: 'Support', minCount: 2, enforcement: 'SOFT', requiredLoadoutTags: ['support'] },
        { role: 'Recon', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['intel', 'scanner'] },
        { role: 'EWAR', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['comms', 'ewar'] },
        { role: 'Medevac', minCount: 1, enforcement: 'SOFT', requiredLoadoutTags: ['medical'] },
      ],
      loadoutMandates: [
        { label: 'Strike Package Baseline', tagsAny: ['combat', 'breach'], appliesToRoles: ['Assault'], enforcement: 'SOFT' },
        { label: 'Medical Sustainment Baseline', tagsAny: ['medical'], appliesToRoles: ['Medevac'], enforcement: 'SOFT' },
        { label: 'Comms Hardening Baseline', tagsAny: ['comms', 'encrypt'], appliesToRoles: ['Commander', 'Squad Lead', 'EWAR'], enforcement: 'SOFT' },
      ],
      assetMandates: [
        { assetTag: 'strike', minCount: 2, enforcement: 'HARD' },
        { assetTag: 'transport', minCount: 1, enforcement: 'SOFT' },
        { assetTag: 'medical', minCount: 1, enforcement: 'SOFT' },
        { assetTag: 'qrf', minCount: 1, enforcement: 'SOFT' },
      ],
      readinessGates: [
        { label: 'ROE Acknowledged', ownerRole: 'Commander', required: true },
        { label: 'Comms Green', ownerRole: 'Comms Lead', required: true },
        { label: 'Rally Points Confirmed', ownerRole: 'Intel Lead', required: true },
        { label: 'QRF Plan Ready', ownerRole: 'Support Lead', required: true },
        { label: 'Evac Plan Confirmed', ownerRole: 'Medical Lead', required: true },
        { label: 'Counter-Intel Sweep Complete', ownerRole: 'Intel Lead', required: true },
      ],
    },
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Custom Operation',
    description: 'Freeform operation setup with minimal defaults.',
    loopCategory: 'CUSTOM',
    variantOptions: [],
    defaults: {
      posture: 'CASUAL',
      status: 'PLANNING',
      classification: 'INTERNAL',
      commsTemplateId: 'SQUAD_NETS',
      ttlProfileId: 'TTL-OP-CASUAL',
      domains: { fps: true, ground: true, airSpace: false, logistics: true },
    },
    wizardSteps: DEFAULT_WIZARD_STEPS,
    seedBundle: {
      objectives: [],
      phases: [],
      tasks: [],
      requirementRules: [],
      roleMandates: [],
      loadoutMandates: [],
      assetMandates: [],
      readinessGates: [],
    },
  },
};

export function listOperationArchetypes(): OperationArchetypeDefinition[] {
  return Object.values(OperationArchetypeRegistry);
}

export function getOperationArchetype(archetypeId: string | undefined): OperationArchetypeDefinition {
  if (!archetypeId) return OperationArchetypeRegistry.CUSTOM;
  return OperationArchetypeRegistry[archetypeId as OperationArchetypeId] || OperationArchetypeRegistry.CUSTOM;
}

export function buildRedactedOpponentProjection(input: {
  orgName?: string;
  estimatedStrength?: string;
  doctrineSummary?: string;
}): OperationSecurityProjection {
  const orgName = String(input.orgName || 'Opposing Org').trim() || 'Opposing Org';
  const strengthToken = String(input.estimatedStrength || '').trim().toLowerCase();
  const redactedStrengthBand: OperationSecurityProjection['redactedStrengthBand'] =
    strengthToken.includes('high') || strengthToken.includes('heavy')
      ? 'HIGH'
      : strengthToken.includes('med')
      ? 'MEDIUM'
      : strengthToken.includes('low') || strengthToken.includes('light')
      ? 'LOW'
      : 'UNKNOWN';
  return {
    redactedOpponentLabel: `${orgName} (redacted)`,
    redactedStrengthBand,
    notes: input.doctrineSummary ? 'Opponent doctrine details restricted to command view.' : undefined,
  };
}
