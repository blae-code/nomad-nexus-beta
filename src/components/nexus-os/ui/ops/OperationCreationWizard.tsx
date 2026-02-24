import React, { useEffect, useMemo, useState } from 'react';
import type { DataClassification } from '../../schemas/crossOrgSchemas';
import type {
  Operation,
  OperationArchetypeId,
  OperationReleaseTrack,
  OperationMiningEnvironment,
  OperationMiningExtractionMethod,
  OperationMiningTier,
  OperationPvpEngagementProfile,
  OperationPvpEnvironment,
  OperationPvpOpsecLevel,
  OperationSalvageEnvironment,
  OperationSalvageExtractionMethod,
  OperationSalvageMode,
  OperationReadinessGate,
  OperationScenarioConfig,
} from '../../schemas/opSchemas';
import {
  buildRedactedOpponentProjection,
  getMiningVariantProfile,
  getPvpVariantProfile,
  getSalvageVariantProfile,
  getOperationArchetype,
  listReleaseFilteredArchetypeVariantOptions,
  listOperationArchetypes,
} from '../../registries/operationArchetypeRegistry';
import {
  getMethodAvailability,
  getMethodDisplayBadge,
} from '../../registries/starCitizenReleaseRegistry';
import { CommsTemplateRegistry, type CommsTemplateId } from '../../registries/commsTemplateRegistry';
import {
  appendOperationEvent,
  createOperation,
  createOperationTemplateFromOperation,
  setFocusOperation,
} from '../../services/operationService';
import {
  createObjective,
  createPhase,
  createTask,
} from '../../services/planningService';
import {
  getOrCreateRSVPPolicy,
  updateRSVPPolicy,
} from '../../services/rsvpService';
import {
  initializeOperationEnhancements,
  upsertAssetMandate,
  upsertLoadoutMandate,
  upsertRoleMandate,
} from '../../services/operationEnhancementService';
import { canCreateOperation } from '../../services/operationAuthorityService';
import {
  buildOperationIcsFilename,
  buildOperationScheduleIcs,
  validateOperationSchedule,
} from '../../services/operationScheduleService';
import {
  isOperationExperimentalGameplayEnabled,
  isOperationSc47PreviewEnabled,
  setOperationExperimentalGameplayEnabled,
  setOperationSc47PreviewEnabled,
} from '../../services/operationFeatureFlagService';
import type { CqbActorProfile } from '../cqb/cqbTypes';
import { NexusBadge, NexusButton } from '../primitives';
import {
  applyFoundryQuickStartPreset,
  deriveFoundryStepStatuses,
  FOUNDRY_STEPS,
  type FoundryQuickStartPreset,
  type FoundryStepStatus,
  type FoundryWizardStep,
} from './operationFoundryRuntime';
import {
  foundryStepStatusTokenIcon,
  operationRiskBandTokenIcon,
} from './operationTokenSemantics';

type WizardStep = FoundryWizardStep;
const STEPS: WizardStep[] = FOUNDRY_STEPS;
const MINING_TIER_OPTIONS: OperationMiningTier[] = ['SHIP_SPACE', 'SHIP_SURFACE', 'ROC_GEO', 'HAND_MINING', 'RING_SWEEP'];
const MINING_ENVIRONMENT_OPTIONS: OperationMiningEnvironment[] = [
  'SPACE_BELT',
  'PLANETARY_SURFACE',
  'MOON_SURFACE',
  'PLANETARY_RING',
  'CAVE_INTERIOR',
];
const MINING_METHOD_OPTIONS: OperationMiningExtractionMethod[] = ['SHIP_LASER', 'ROC_BEAM', 'HAND_TOOL'];
const RELEASE_TRACK_OPTIONS: OperationReleaseTrack[] = ['LIVE_4_6', 'PREVIEW_4_7'];
const PVP_ENVIRONMENT_OPTIONS: OperationPvpEnvironment[] = ['SPACE', 'SURFACE', 'INTERIOR', 'MIXED'];
const PVP_PROFILE_OPTIONS: OperationPvpEngagementProfile[] = ['RAID', 'BOARDING', 'CONVOY_ESCORT', 'INTERDICTION', 'DEFENSE'];
const PVP_OPSEC_OPTIONS: OperationPvpOpsecLevel[] = ['STANDARD', 'RESTRICTED', 'BLACK'];
const SALVAGE_MODE_OPTIONS: OperationSalvageMode[] = ['HULL_STRIP', 'COMPONENT_RECOVERY', 'CARGO_RETRIEVAL', 'BLACKBOX_RECOVERY', 'CONTESTED_RECOVERY'];
const SALVAGE_ENVIRONMENT_OPTIONS: OperationSalvageEnvironment[] = ['SPACE_DERELICT', 'SURFACE_WRECK', 'DEBRIS_FIELD', 'CONTESTED_ZONE'];
const SALVAGE_METHOD_OPTIONS: OperationSalvageExtractionMethod[] = ['SCRAPER', 'TRACTOR', 'SALVAGE_DRONE', 'MULTI_TOOL'];

interface OperationCreationWizardProps {
  actorId: string;
  actorProfile?: CqbActorProfile;
  onCreated?: (operation: Operation) => void;
  onError?: (message: string) => void;
}

function parseCsv(value: string): string[] {
  return [...new Set(String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

function nowLocalInput(hoursAhead = 0): string {
  const next = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  next.setSeconds(0, 0);
  return next.toISOString().slice(0, 16);
}

function toNumberInput(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function stepStatusTone(status: FoundryStepStatus): 'ok' | 'warning' | 'danger' {
  if (status === 'DONE') return 'ok';
  if (status === 'READY') return 'warning';
  return 'danger';
}

export default function OperationCreationWizard({
  actorId,
  actorProfile,
  onCreated,
  onError,
}: OperationCreationWizardProps) {
  const actorContext = useMemo(
    () => ({
      actorId,
      rank: actorProfile?.rank,
      roles: Array.isArray(actorProfile?.roles) ? actorProfile?.roles : [],
      orgId: actorProfile?.orgId,
      isAdmin: Boolean(actorProfile?.isAdmin),
    }),
    [actorId, actorProfile?.rank, actorProfile?.orgId, actorProfile?.isAdmin, actorProfile?.roles]
  );
  const createPermission = useMemo(
    () => canCreateOperation(actorContext),
    [actorContext.actorId, actorContext.rank, actorContext.orgId, actorContext.isAdmin, actorContext.roles?.join('|')]
  );
  const defaultMiningVariant = useMemo(
    () => getOperationArchetype('INDUSTRIAL_MINING').variantOptions[0] || 'MINING_GEO',
    []
  );
  const defaultPvpVariant = useMemo(
    () => getOperationArchetype('PVP_ORG_V_ORG').variantOptions[0] || 'PVP_CQB_RAID',
    []
  );
  const defaultSalvageVariant = useMemo(
    () => getOperationArchetype('INDUSTRIAL_SALVAGE').variantOptions[0] || 'SALVAGE_HULL_STRIP',
    []
  );
  const defaultMiningProfile = useMemo(() => getMiningVariantProfile(defaultMiningVariant), [defaultMiningVariant]);
  const defaultPvpProfile = useMemo(() => getPvpVariantProfile(defaultPvpVariant), [defaultPvpVariant]);
  const defaultSalvageProfile = useMemo(() => getSalvageVariantProfile(defaultSalvageVariant), [defaultSalvageVariant]);

  const [stepIndex, setStepIndex] = useState(0);
  const [archetypeId, setArchetypeId] = useState<OperationArchetypeId>('INDUSTRIAL_MINING');
  const [nameInput, setNameInput] = useState('Operation');
  const [hostOrgInput, setHostOrgInput] = useState(actorProfile?.orgId || 'ORG-LOCAL');
  const [invitedOrgsInput, setInvitedOrgsInput] = useState('');
  const [classificationInput, setClassificationInput] = useState<DataClassification>('INTERNAL');
  const [startInput, setStartInput] = useState(nowLocalInput(1));
  const [endInput, setEndInput] = useState(nowLocalInput(3));
  const [timezoneInput, setTimezoneInput] = useState('UTC');
  const [releaseTrackInput, setReleaseTrackInput] = useState<OperationReleaseTrack>('LIVE_4_6');
  const [sc47PreviewEnabled, setSc47PreviewEnabledState] = useState<boolean>(() => isOperationSc47PreviewEnabled());
  const [experimentalGameplayEnabled, setExperimentalGameplayEnabledState] = useState<boolean>(() => isOperationExperimentalGameplayEnabled());
  const [variantInput, setVariantInput] = useState(defaultMiningVariant);
  const [miningTierInput, setMiningTierInput] = useState<OperationMiningTier>(defaultMiningProfile.tier);
  const [miningEnvironmentInput, setMiningEnvironmentInput] = useState<OperationMiningEnvironment>(defaultMiningProfile.environment);
  const [miningMethodInput, setMiningMethodInput] = useState<OperationMiningExtractionMethod>(defaultMiningProfile.extractionMethod);
  const [miningRouteInput, setMiningRouteInput] = useState(defaultMiningProfile.defaultRoutePlan);
  const [miningRefineryInput, setMiningRefineryInput] = useState(defaultMiningProfile.defaultRefineryPlan);
  const [miningEscortInput, setMiningEscortInput] = useState(defaultMiningProfile.defaultEscortPolicy);
  const [miningStagingNodeInput, setMiningStagingNodeInput] = useState('system-stanton');
  const [miningOreTargetsInput, setMiningOreTargetsInput] = useState('Quantanium, Bexalite');
  const [miningHazardsInput, setMiningHazardsInput] = useState('piracy, weather');
  const [miningThreatBandInput, setMiningThreatBandInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [miningRescueCoverageInput, setMiningRescueCoverageInput] = useState('Dedicated rescue lane and medevac coverage.');
  const [miningYieldInput, setMiningYieldInput] = useState('180');
  const [miningUnitValueInput, setMiningUnitValueInput] = useState('7600');
  const [miningFuelCostInput, setMiningFuelCostInput] = useState('90000');
  const [miningRiskReserveInput, setMiningRiskReserveInput] = useState('50000');
  const [miningEvidenceInput, setMiningEvidenceInput] = useState('');
  const [miningFractureRateInput, setMiningFractureRateInput] = useState('82');
  const [miningOverchargeInput, setMiningOverchargeInput] = useState('0');
  const [miningRecoveredInput, setMiningRecoveredInput] = useState('0');
  const [miningIdleHaulInput, setMiningIdleHaulInput] = useState('10');
  const [miningRefineryQueueInput, setMiningRefineryQueueInput] = useState('25');
  const [miningRegolithEnabled, setMiningRegolithEnabled] = useState(true);
  const [miningRegolithSourceInput, setMiningRegolithSourceInput] = useState<'NONE' | 'MANUAL' | 'REGOLITH'>('REGOLITH');
  const [miningRegolithSessionInput, setMiningRegolithSessionInput] = useState('');
  const [miningRegolithWorkOrderInput, setMiningRegolithWorkOrderInput] = useState('');
  const [miningRegolithFindsInput, setMiningRegolithFindsInput] = useState('');
  const [salvageModeInput, setSalvageModeInput] = useState<OperationSalvageMode>(defaultSalvageProfile.mode);
  const [salvageEnvironmentInput, setSalvageEnvironmentInput] = useState<OperationSalvageEnvironment>(defaultSalvageProfile.environment);
  const [salvageMethodInput, setSalvageMethodInput] = useState<OperationSalvageExtractionMethod>(defaultSalvageProfile.extractionMethod);
  const [salvageObjectiveInput, setSalvageObjectiveInput] = useState(defaultSalvageProfile.defaultObjectiveType);
  const [salvageTargetWreckInput, setSalvageTargetWreckInput] = useState('Large derelict hull');
  const [salvageClaimInput, setSalvageClaimInput] = useState('Private contract claim');
  const [salvageRouteInput, setSalvageRouteInput] = useState(defaultSalvageProfile.defaultRoutePlan);
  const [salvageProcessingInput, setSalvageProcessingInput] = useState(defaultSalvageProfile.defaultProcessingPlan);
  const [salvageEscortInput, setSalvageEscortInput] = useState(defaultSalvageProfile.defaultEscortPolicy);
  const [salvageInventoryInput, setSalvageInventoryInput] = useState(defaultSalvageProfile.defaultInventoryPolicy);
  const [salvageHazardsInput, setSalvageHazardsInput] = useState('contested space, debris collision');
  const [salvageThreatBandInput, setSalvageThreatBandInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [salvageLegalRiskInput, setSalvageLegalRiskInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [salvageInterdictionRiskInput, setSalvageInterdictionRiskInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [salvageHullRecoveredInput, setSalvageHullRecoveredInput] = useState('72');
  const [salvageComponentsInput, setSalvageComponentsInput] = useState('14');
  const [salvageCargoRecoveredInput, setSalvageCargoRecoveredInput] = useState('120');
  const [salvageCycleTimeInput, setSalvageCycleTimeInput] = useState('16');
  const [salvageContaminationInput, setSalvageContaminationInput] = useState('0');
  const [salvageRmcInput, setSalvageRmcInput] = useState('340');
  const [salvageCmInput, setSalvageCmInput] = useState('120');
  const [salvageCargoInput, setSalvageCargoInput] = useState('90');
  const [salvageGrossAuecInput, setSalvageGrossAuecInput] = useState('1850000');
  const [salvageFuelCostInput, setSalvageFuelCostInput] = useState('150000');
  const [salvageProcessingCostInput, setSalvageProcessingCostInput] = useState('120000');
  const [salvageRiskReserveInput, setSalvageRiskReserveInput] = useState('80000');
  const [salvageEvidenceInput, setSalvageEvidenceInput] = useState('');
  const [salvageCompanionEnabled, setSalvageCompanionEnabled] = useState(true);
  const [salvageCompanionSourceInput, setSalvageCompanionSourceInput] = useState<'NONE' | 'MANUAL'>('MANUAL');
  const [salvageCompanionRefsInput, setSalvageCompanionRefsInput] = useState('');
  const [pvpEnvironmentInput, setPvpEnvironmentInput] = useState<OperationPvpEnvironment>(defaultPvpProfile.environment);
  const [pvpEngagementInput, setPvpEngagementInput] = useState<OperationPvpEngagementProfile>(defaultPvpProfile.engagementProfile);
  const [pvpObjectiveInput, setPvpObjectiveInput] = useState(defaultPvpProfile.defaultObjectiveType);
  const [pvpCommandIntentInput, setPvpCommandIntentInput] = useState(defaultPvpProfile.defaultCommandIntent);
  const [pvpRoeInput, setPvpRoeInput] = useState(defaultPvpProfile.defaultRoe);
  const [pvpOpsecInput, setPvpOpsecInput] = useState<OperationPvpOpsecLevel>('RESTRICTED');
  const [pvpRallyPointsInput, setPvpRallyPointsInput] = useState('RP-ALPHA, RP-BRAVO');
  const [pvpIngressInput, setPvpIngressInput] = useState(defaultPvpProfile.defaultIngressPlan);
  const [pvpQrfInput, setPvpQrfInput] = useState(defaultPvpProfile.defaultQrfPlan);
  const [pvpSustainmentInput, setPvpSustainmentInput] = useState(defaultPvpProfile.defaultSustainmentPlan);
  const [pvpEvacInput, setPvpEvacInput] = useState(defaultPvpProfile.defaultEvacPlan);
  const [pvpDeconflictionInput, setPvpDeconflictionInput] = useState('Fire lanes and IFF gates published.');
  const [pvpIntelRefsInput, setPvpIntelRefsInput] = useState('');
  const [pvpFriendlyPlannedInput, setPvpFriendlyPlannedInput] = useState('18');
  const [pvpHostileEstimatedInput, setPvpHostileEstimatedInput] = useState('16');
  const [pvpQrfReserveInput, setPvpQrfReserveInput] = useState('4');
  const [pvpMedevacReserveInput, setPvpMedevacReserveInput] = useState('2');
  const [pvpThreatBandInput, setPvpThreatBandInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [pvpCyberRiskInput, setPvpCyberRiskInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [pvpDeceptionRiskInput, setPvpDeceptionRiskInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [pvpObjectiveControlInput, setPvpObjectiveControlInput] = useState('65');
  const [pvpCasualtyCapInput, setPvpCasualtyCapInput] = useState('8');
  const [pvpCurrentCasualtiesInput, setPvpCurrentCasualtiesInput] = useState('0');
  const [pvpCommsDisruptionsInput, setPvpCommsDisruptionsInput] = useState('0');
  const [pvpReactionLatencyInput, setPvpReactionLatencyInput] = useState('9');
  const [pvpCompanionEnabled, setPvpCompanionEnabled] = useState(true);
  const [pvpCompanionSourceInput, setPvpCompanionSourceInput] = useState<'NONE' | 'MANUAL'>('MANUAL');
  const [pvpCompanionRefsInput, setPvpCompanionRefsInput] = useState('');
  const [pvpOpponentInput, setPvpOpponentInput] = useState('Opposing Org');
  const [pvpOpponentDoctrineInput, setPvpOpponentDoctrineInput] = useState('');
  const [pvpOpponentStrengthInput, setPvpOpponentStrengthInput] = useState('medium strike package');
  const [pvpOpponentAssetProfileInput, setPvpOpponentAssetProfileInput] = useState('');
  const [pvpOpponentIntelConfidenceInput, setPvpOpponentIntelConfidenceInput] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [commsTemplateInput, setCommsTemplateInput] = useState<CommsTemplateId>('SQUAD_NETS');
  const [ttlProfileInput, setTtlProfileInput] = useState('TTL-OP-CASUAL');
  const [gateRows, setGateRows] = useState<Array<Pick<OperationReadinessGate, 'label' | 'ownerRole' | 'required'>>>([]);
  const [icsPreview, setIcsPreview] = useState('');
  const [errorText, setErrorText] = useState('');
  const [createdOpId, setCreatedOpId] = useState('');
  const [saveAsTemplateAfterCreate, setSaveAsTemplateAfterCreate] = useState(false);
  const [foundryTemplateNameInput, setFoundryTemplateNameInput] = useState('Operation Foundry Template');

  const stepId = STEPS[stepIndex];
  const archetype = useMemo(() => getOperationArchetype(archetypeId), [archetypeId]);
  const scheduleValidation = useMemo(
    () =>
      validateOperationSchedule({
        plannedStartAt: startInput,
        plannedEndAt: endInput,
        timezone: timezoneInput,
      }),
    [startInput, endInput, timezoneInput]
  );
  const variantOptions = useMemo(
    () =>
      listReleaseFilteredArchetypeVariantOptions(archetypeId, releaseTrackInput, {
        includeLocked: true,
        sc47PreviewEnabled,
        experimentalEnabled: experimentalGameplayEnabled,
      }),
    [archetypeId, releaseTrackInput, sc47PreviewEnabled, experimentalGameplayEnabled]
  );
  const firstVariantOption = variantOptions[0];
  const firstAvailableVariantOption = variantOptions.find((entry) => entry.available) || firstVariantOption;
  const effectiveVariant = variantInput || firstAvailableVariantOption?.id || archetype.variantOptions[0] || 'CUSTOM';
  const selectedVariantOption = variantOptions.find((entry) => entry.id === effectiveVariant) || null;
  const selectedVariantLockedReason = selectedVariantOption && !selectedVariantOption.available
    ? selectedVariantOption.reason || 'Variant is currently locked for this track.'
    : '';
  const selectedMethodAvailability = useMemo(
    () =>
      getMethodAvailability('SALVAGE', salvageMethodInput, {
        releaseTrack: releaseTrackInput,
        sc47PreviewEnabled,
        experimentalEnabled: experimentalGameplayEnabled,
      }),
    [releaseTrackInput, salvageMethodInput, sc47PreviewEnabled, experimentalGameplayEnabled]
  );
  const selectedMethodBadge = useMemo(
    () => getMethodDisplayBadge('SALVAGE', salvageMethodInput),
    [salvageMethodInput]
  );
  const salvageMethodOptions = useMemo(
    () =>
      SALVAGE_METHOD_OPTIONS.map((option) => {
        const availability = getMethodAvailability('SALVAGE', option, {
          releaseTrack: releaseTrackInput,
          sc47PreviewEnabled,
          experimentalEnabled: experimentalGameplayEnabled,
        });
        const badge = getMethodDisplayBadge('SALVAGE', option);
        return {
          id: option,
          availability,
          badge,
        };
      }),
    [releaseTrackInput, sc47PreviewEnabled, experimentalGameplayEnabled]
  );
  const effectiveGates = gateRows.length > 0 ? gateRows : archetype.seedBundle.readinessGates;

  const scenarioConfig = useMemo<OperationScenarioConfig>(() => {
    if (archetypeId === 'INDUSTRIAL_MINING') {
      return {
        mining: {
          variantId: effectiveVariant,
          tier: miningTierInput,
          environment: miningEnvironmentInput,
          extractionMethod: miningMethodInput,
          oreTargets: parseCsv(miningOreTargetsInput),
          routePlan: miningRouteInput.trim(),
          refineryPlan: miningRefineryInput.trim(),
          escortPolicy: miningEscortInput.trim(),
          stagingNodeId: miningStagingNodeInput.trim() || undefined,
          hazardTags: parseCsv(miningHazardsInput),
          riskProfile: {
            threatBand: miningThreatBandInput,
            hazardTags: parseCsv(miningHazardsInput),
            rescueCoverage: miningRescueCoverageInput.trim(),
          },
          regolithLink: {
            enabled: miningRegolithEnabled,
            source: miningRegolithEnabled ? miningRegolithSourceInput : 'NONE',
            sessionId: miningRegolithSessionInput.trim() || undefined,
            workOrderId: miningRegolithWorkOrderInput.trim() || undefined,
            scoutingFindRefs: parseCsv(miningRegolithFindsInput),
          },
          telemetryProjection: {
            fractureSuccessRatePct: toNumberInput(miningFractureRateInput),
            overchargeIncidents: toNumberInput(miningOverchargeInput),
            recoveredScu: toNumberInput(miningRecoveredInput),
            idleHaulMinutes: toNumberInput(miningIdleHaulInput),
            refineryQueueMinutes: toNumberInput(miningRefineryQueueInput),
          },
          economics: {
            estimatedYieldScu: toNumberInput(miningYieldInput),
            estimatedUnitValueAuec: toNumberInput(miningUnitValueInput),
            estimatedFuelCostAuec: toNumberInput(miningFuelCostInput),
            estimatedRiskReserveAuec: toNumberInput(miningRiskReserveInput),
            evidenceRefs: parseCsv(miningEvidenceInput),
          },
        },
      };
    }
    if (archetypeId === 'INDUSTRIAL_SALVAGE') {
      return {
        salvage: {
          variantId: effectiveVariant,
          mode: salvageModeInput,
          environment: salvageEnvironmentInput,
          extractionMethod: salvageMethodInput,
          objectiveType: salvageObjectiveInput.trim(),
          targetWreckType: salvageTargetWreckInput.trim(),
          claimJurisdiction: salvageClaimInput.trim(),
          routePlan: salvageRouteInput.trim(),
          processingPlan: salvageProcessingInput.trim(),
          escortPolicy: salvageEscortInput.trim(),
          inventoryPolicy: salvageInventoryInput.trim(),
          hazardTags: parseCsv(salvageHazardsInput),
          riskProfile: {
            threatBand: salvageThreatBandInput,
            legalExposure: salvageLegalRiskInput,
            interdictionRisk: salvageInterdictionRiskInput,
            hazardTags: parseCsv(salvageHazardsInput),
          },
          telemetryProjection: {
            hullRecoveredPct: toNumberInput(salvageHullRecoveredInput),
            componentsRecovered: toNumberInput(salvageComponentsInput),
            cargoRecoveredScu: toNumberInput(salvageCargoRecoveredInput),
            cycleTimeMinutes: toNumberInput(salvageCycleTimeInput),
            contaminationIncidents: toNumberInput(salvageContaminationInput),
          },
          economics: {
            projectedRmcScu: toNumberInput(salvageRmcInput),
            projectedCmScu: toNumberInput(salvageCmInput),
            projectedCargoScu: toNumberInput(salvageCargoInput),
            projectedGrossAuec: toNumberInput(salvageGrossAuecInput),
            projectedFuelCostAuec: toNumberInput(salvageFuelCostInput),
            projectedProcessingCostAuec: toNumberInput(salvageProcessingCostInput),
            projectedRiskReserveAuec: toNumberInput(salvageRiskReserveInput),
            evidenceRefs: parseCsv(salvageEvidenceInput),
          },
          companionLink: {
            enabled: salvageCompanionEnabled,
            source: salvageCompanionEnabled ? salvageCompanionSourceInput : 'NONE',
            externalRefs: parseCsv(salvageCompanionRefsInput),
          },
        },
      };
    }
    if (archetypeId === 'PVP_ORG_V_ORG') {
      return {
        pvp: {
          variantId: effectiveVariant,
          environment: pvpEnvironmentInput,
          engagementProfile: pvpEngagementInput,
          objectiveType: pvpObjectiveInput.trim(),
          commandIntent: pvpCommandIntentInput.trim(),
          rulesOfEngagement: pvpRoeInput.trim(),
          opsecLevel: pvpOpsecInput,
          rallyPoints: parseCsv(pvpRallyPointsInput),
          ingressPlan: pvpIngressInput.trim(),
          qrfPlan: pvpQrfInput.trim(),
          sustainmentPlan: pvpSustainmentInput.trim(),
          evacPlan: pvpEvacInput.trim(),
          deconflictionPlan: pvpDeconflictionInput.trim(),
          intelRefs: parseCsv(pvpIntelRefsInput),
          forceProjection: {
            friendlyPlanned: toNumberInput(pvpFriendlyPlannedInput),
            hostileEstimated: toNumberInput(pvpHostileEstimatedInput),
            qrfReserve: toNumberInput(pvpQrfReserveInput),
            medevacReserve: toNumberInput(pvpMedevacReserveInput),
          },
          riskProfile: {
            threatBand: pvpThreatBandInput,
            cyberEwarRisk: pvpCyberRiskInput,
            deceptionRisk: pvpDeceptionRiskInput,
          },
          telemetryProjection: {
            objectiveControlTargetPct: toNumberInput(pvpObjectiveControlInput),
            casualtyCap: toNumberInput(pvpCasualtyCapInput),
            currentCasualties: toNumberInput(pvpCurrentCasualtiesInput),
            commsDisruptions: toNumberInput(pvpCommsDisruptionsInput),
            reactionLatencySec: toNumberInput(pvpReactionLatencyInput),
          },
          companionLink: {
            enabled: pvpCompanionEnabled,
            source: pvpCompanionEnabled ? pvpCompanionSourceInput : 'NONE',
            externalRefs: parseCsv(pvpCompanionRefsInput),
          },
          opposingForce: {
            orgName: pvpOpponentInput.trim() || 'Opposing Org',
            doctrineSummary: pvpOpponentDoctrineInput.trim(),
            estimatedStrength: pvpOpponentStrengthInput.trim() || 'unknown',
            assetProfile: pvpOpponentAssetProfileInput.trim(),
            intelConfidence: pvpOpponentIntelConfidenceInput,
          },
        },
      };
    }
    return {};
  }, [
    archetypeId,
    effectiveVariant,
    miningTierInput,
    miningEnvironmentInput,
    miningMethodInput,
    miningOreTargetsInput,
    miningRouteInput,
    miningRefineryInput,
    miningEscortInput,
    miningStagingNodeInput,
    miningHazardsInput,
    miningThreatBandInput,
    miningRescueCoverageInput,
    miningRegolithEnabled,
    miningRegolithSourceInput,
    miningRegolithSessionInput,
    miningRegolithWorkOrderInput,
    miningRegolithFindsInput,
    miningFractureRateInput,
    miningOverchargeInput,
    miningRecoveredInput,
    miningIdleHaulInput,
    miningRefineryQueueInput,
    miningYieldInput,
    miningUnitValueInput,
    miningFuelCostInput,
    miningRiskReserveInput,
    miningEvidenceInput,
    salvageModeInput,
    salvageEnvironmentInput,
    salvageMethodInput,
    salvageObjectiveInput,
    salvageTargetWreckInput,
    salvageClaimInput,
    salvageRouteInput,
    salvageProcessingInput,
    salvageEscortInput,
    salvageInventoryInput,
    salvageHazardsInput,
    salvageThreatBandInput,
    salvageLegalRiskInput,
    salvageInterdictionRiskInput,
    salvageHullRecoveredInput,
    salvageComponentsInput,
    salvageCargoRecoveredInput,
    salvageCycleTimeInput,
    salvageContaminationInput,
    salvageRmcInput,
    salvageCmInput,
    salvageCargoInput,
    salvageGrossAuecInput,
    salvageFuelCostInput,
    salvageProcessingCostInput,
    salvageRiskReserveInput,
    salvageEvidenceInput,
    salvageCompanionEnabled,
    salvageCompanionSourceInput,
    salvageCompanionRefsInput,
    pvpEnvironmentInput,
    pvpEngagementInput,
    pvpObjectiveInput,
    pvpCommandIntentInput,
    pvpRoeInput,
    pvpOpsecInput,
    pvpRallyPointsInput,
    pvpIngressInput,
    pvpQrfInput,
    pvpSustainmentInput,
    pvpEvacInput,
    pvpDeconflictionInput,
    pvpIntelRefsInput,
    pvpFriendlyPlannedInput,
    pvpHostileEstimatedInput,
    pvpQrfReserveInput,
    pvpMedevacReserveInput,
    pvpThreatBandInput,
    pvpCyberRiskInput,
    pvpDeceptionRiskInput,
    pvpObjectiveControlInput,
    pvpCasualtyCapInput,
    pvpCurrentCasualtiesInput,
    pvpCommsDisruptionsInput,
    pvpReactionLatencyInput,
    pvpCompanionEnabled,
    pvpCompanionSourceInput,
    pvpCompanionRefsInput,
    pvpOpponentInput,
    pvpOpponentDoctrineInput,
    pvpOpponentStrengthInput,
    pvpOpponentAssetProfileInput,
    pvpOpponentIntelConfidenceInput,
  ]);

  const isStepComplete = (step: WizardStep): boolean => {
    if (step === 'ARCHETYPE') return createPermission.allowed;
    if (step === 'IDENTITY') return Boolean(nameInput.trim()) && scheduleValidation.valid;
    if (step === 'SCENARIO') {
      if (selectedVariantOption && !selectedVariantOption.available) return false;
      if (archetypeId === 'INDUSTRIAL_MINING') {
        return (
          Boolean(miningRouteInput.trim()) &&
          Boolean(miningRefineryInput.trim()) &&
          Boolean(miningEscortInput.trim()) &&
          parseCsv(miningOreTargetsInput).length > 0
        );
      }
      if (archetypeId === 'INDUSTRIAL_SALVAGE') {
        return (
          Boolean(salvageObjectiveInput.trim()) &&
          Boolean(salvageRouteInput.trim()) &&
          Boolean(salvageProcessingInput.trim()) &&
          Boolean(salvageClaimInput.trim()) &&
          selectedMethodAvailability.available
        );
      }
      if (archetypeId === 'PVP_ORG_V_ORG') {
        return (
          Boolean(pvpObjectiveInput.trim()) &&
          Boolean(pvpCommandIntentInput.trim()) &&
          Boolean(pvpRoeInput.trim()) &&
          Boolean(pvpOpponentInput.trim()) &&
          toNumberInput(pvpFriendlyPlannedInput) > 0 &&
          toNumberInput(pvpHostileEstimatedInput) > 0
        );
      }
    }
    if (step === 'FORCE') {
      return archetype.seedBundle.roleMandates.length + archetype.seedBundle.assetMandates.length > 0;
    }
    if (step === 'COMMS') {
      return Boolean(commsTemplateInput) && Boolean(ttlProfileInput.trim());
    }
    if (step === 'READINESS') {
      return effectiveGates.length > 0 && effectiveGates.every((gate) => Boolean(gate.label.trim()) && Boolean(gate.ownerRole.trim()));
    }
    return createPermission.allowed
      && scheduleValidation.valid
      && (!selectedVariantOption || selectedVariantOption.available)
      && (archetypeId !== 'INDUSTRIAL_SALVAGE' || selectedMethodAvailability.available);
  };

  const canAdvance = (): boolean => isStepComplete(stepId);

  const stepStatuses = useMemo(
    () =>
      deriveFoundryStepStatuses({
        ARCHETYPE: isStepComplete('ARCHETYPE'),
        IDENTITY: isStepComplete('IDENTITY'),
        SCENARIO: isStepComplete('SCENARIO'),
        FORCE: isStepComplete('FORCE'),
        COMMS: isStepComplete('COMMS'),
        READINESS: isStepComplete('READINESS'),
        REVIEW: isStepComplete('REVIEW'),
      }),
    [
      createPermission.allowed,
      nameInput,
      scheduleValidation.valid,
      selectedVariantOption?.available,
      archetypeId,
      miningRouteInput,
      miningRefineryInput,
      miningEscortInput,
      miningOreTargetsInput,
      salvageObjectiveInput,
      salvageRouteInput,
      salvageProcessingInput,
      salvageClaimInput,
      selectedMethodAvailability.available,
      pvpObjectiveInput,
      pvpCommandIntentInput,
      pvpRoeInput,
      pvpOpponentInput,
      pvpFriendlyPlannedInput,
      pvpHostileEstimatedInput,
      archetype.seedBundle.roleMandates.length,
      archetype.seedBundle.assetMandates.length,
      commsTemplateInput,
      ttlProfileInput,
      effectiveGates,
    ]
  );

  const applyQuickStartPreset = (preset: FoundryQuickStartPreset) => {
    const next = applyFoundryQuickStartPreset(
      preset,
      {
        startInput,
        endInput,
        commsTemplateInput,
        ttlProfileInput,
        gateRows: effectiveGates.map((gate) => ({
          label: gate.label,
          ownerRole: gate.ownerRole,
          required: Boolean(gate.required),
        })),
      },
      Date.now()
    );
    setStartInput(next.startInput);
    setEndInput(next.endInput);
    setCommsTemplateInput(next.commsTemplateInput);
    setTtlProfileInput(next.ttlProfileInput);
    setGateRows(next.gateRows);
  };

  const goStep = (offset: number) => {
    if (offset > 0 && !canAdvance()) {
      setErrorText('Complete required fields before continuing.');
      return;
    }
    setErrorText('');
    setStepIndex((current) => Math.max(0, Math.min(STEPS.length - 1, current + offset)));
  };

  const selectArchetype = (nextId: OperationArchetypeId) => {
    const next = getOperationArchetype(nextId);
    const nextVariantOptions = listReleaseFilteredArchetypeVariantOptions(nextId, releaseTrackInput, {
      includeLocked: false,
      sc47PreviewEnabled,
      experimentalEnabled: experimentalGameplayEnabled,
    });
    const nextVariant = nextVariantOptions[0]?.id
      || next.variantOptions[0]
      || (nextId === 'INDUSTRIAL_MINING'
        ? defaultMiningVariant
        : nextId === 'INDUSTRIAL_SALVAGE'
        ? defaultSalvageVariant
        : nextId === 'PVP_ORG_V_ORG'
        ? defaultPvpVariant
        : 'CUSTOM');
    setArchetypeId(nextId);
    setCommsTemplateInput(next.defaults.commsTemplateId);
    setTtlProfileInput(next.defaults.ttlProfileId);
    setVariantInput(nextVariant);
    setGateRows(next.seedBundle.readinessGates);
    if (nextId === 'INDUSTRIAL_MINING') {
      const preset = getMiningVariantProfile(nextVariant || defaultMiningVariant);
      setMiningTierInput(preset.tier);
      setMiningEnvironmentInput(preset.environment);
      setMiningMethodInput(preset.extractionMethod);
      setMiningRouteInput(preset.defaultRoutePlan);
      setMiningRefineryInput(preset.defaultRefineryPlan);
      setMiningEscortInput(preset.defaultEscortPolicy);
    }
    if (nextId === 'INDUSTRIAL_SALVAGE') {
      const preset = getSalvageVariantProfile(nextVariant || defaultSalvageVariant);
      setSalvageModeInput(preset.mode);
      setSalvageEnvironmentInput(preset.environment);
      setSalvageMethodInput(preset.extractionMethod);
      setSalvageObjectiveInput(preset.defaultObjectiveType);
      setSalvageRouteInput(preset.defaultRoutePlan);
      setSalvageProcessingInput(preset.defaultProcessingPlan);
      setSalvageEscortInput(preset.defaultEscortPolicy);
      setSalvageInventoryInput(preset.defaultInventoryPolicy);
    }
    if (nextId === 'PVP_ORG_V_ORG') {
      const preset = getPvpVariantProfile(nextVariant || defaultPvpVariant);
      setPvpEnvironmentInput(preset.environment);
      setPvpEngagementInput(preset.engagementProfile);
      setPvpObjectiveInput(preset.defaultObjectiveType);
      setPvpCommandIntentInput(preset.defaultCommandIntent);
      setPvpRoeInput(preset.defaultRoe);
      setPvpIngressInput(preset.defaultIngressPlan);
      setPvpQrfInput(preset.defaultQrfPlan);
      setPvpEvacInput(preset.defaultEvacPlan);
      setPvpSustainmentInput(preset.defaultSustainmentPlan);
    }
  };

  const updateScenarioVariant = (nextVariant: string) => {
    const variantEntry = variantOptions.find((entry) => entry.id === nextVariant);
    if (variantEntry && !variantEntry.available) {
      setErrorText(variantEntry.reason || 'Variant is locked for the selected release track.');
      return;
    }
    setVariantInput(nextVariant);
    setErrorText('');
    if (archetypeId === 'INDUSTRIAL_MINING') {
      const preset = getMiningVariantProfile(nextVariant);
      setMiningTierInput(preset.tier);
      setMiningEnvironmentInput(preset.environment);
      setMiningMethodInput(preset.extractionMethod);
      setMiningRouteInput(preset.defaultRoutePlan);
      setMiningRefineryInput(preset.defaultRefineryPlan);
      setMiningEscortInput(preset.defaultEscortPolicy);
      return;
    }
    if (archetypeId === 'INDUSTRIAL_SALVAGE') {
      const preset = getSalvageVariantProfile(nextVariant);
      setSalvageModeInput(preset.mode);
      setSalvageEnvironmentInput(preset.environment);
      setSalvageMethodInput(preset.extractionMethod);
      setSalvageObjectiveInput(preset.defaultObjectiveType);
      setSalvageRouteInput(preset.defaultRoutePlan);
      setSalvageProcessingInput(preset.defaultProcessingPlan);
      setSalvageEscortInput(preset.defaultEscortPolicy);
      setSalvageInventoryInput(preset.defaultInventoryPolicy);
      return;
    }
    if (archetypeId === 'PVP_ORG_V_ORG') {
      const preset = getPvpVariantProfile(nextVariant);
      setPvpEnvironmentInput(preset.environment);
      setPvpEngagementInput(preset.engagementProfile);
      setPvpObjectiveInput(preset.defaultObjectiveType);
      setPvpCommandIntentInput(preset.defaultCommandIntent);
      setPvpRoeInput(preset.defaultRoe);
      setPvpIngressInput(preset.defaultIngressPlan);
      setPvpQrfInput(preset.defaultQrfPlan);
      setPvpEvacInput(preset.defaultEvacPlan);
      setPvpSustainmentInput(preset.defaultSustainmentPlan);
    }
  };

  useEffect(() => {
    if (sc47PreviewEnabled) return;
    if (releaseTrackInput === 'PREVIEW_4_7') setReleaseTrackInput('LIVE_4_6');
  }, [releaseTrackInput, sc47PreviewEnabled]);

  useEffect(() => {
    if (!variantOptions.length) return;
    const selectedEntry = variantOptions.find((entry) => entry.id === variantInput);
    if (selectedEntry?.available) return;
    const fallback = variantOptions.find((entry) => entry.available)?.id || variantOptions[0]?.id;
    if (!fallback || fallback === variantInput) return;
    setVariantInput(fallback);
    if (archetypeId === 'INDUSTRIAL_MINING') {
      const preset = getMiningVariantProfile(fallback);
      setMiningTierInput(preset.tier);
      setMiningEnvironmentInput(preset.environment);
      setMiningMethodInput(preset.extractionMethod);
      setMiningRouteInput(preset.defaultRoutePlan);
      setMiningRefineryInput(preset.defaultRefineryPlan);
      setMiningEscortInput(preset.defaultEscortPolicy);
    } else if (archetypeId === 'INDUSTRIAL_SALVAGE') {
      const preset = getSalvageVariantProfile(fallback);
      setSalvageModeInput(preset.mode);
      setSalvageEnvironmentInput(preset.environment);
      setSalvageMethodInput(preset.extractionMethod);
      setSalvageObjectiveInput(preset.defaultObjectiveType);
      setSalvageRouteInput(preset.defaultRoutePlan);
      setSalvageProcessingInput(preset.defaultProcessingPlan);
      setSalvageEscortInput(preset.defaultEscortPolicy);
      setSalvageInventoryInput(preset.defaultInventoryPolicy);
    } else if (archetypeId === 'PVP_ORG_V_ORG') {
      const preset = getPvpVariantProfile(fallback);
      setPvpEnvironmentInput(preset.environment);
      setPvpEngagementInput(preset.engagementProfile);
      setPvpObjectiveInput(preset.defaultObjectiveType);
      setPvpCommandIntentInput(preset.defaultCommandIntent);
      setPvpRoeInput(preset.defaultRoe);
      setPvpIngressInput(preset.defaultIngressPlan);
      setPvpQrfInput(preset.defaultQrfPlan);
      setPvpEvacInput(preset.defaultEvacPlan);
      setPvpSustainmentInput(preset.defaultSustainmentPlan);
    }
  }, [archetypeId, variantInput, variantOptions]);

  const buildReadinessGates = (): OperationReadinessGate[] => {
    const nowIso = new Date().toISOString();
    return effectiveGates.map((gate, index) => ({
      id: `gate_${index + 1}`,
      label: gate.label,
      ownerRole: gate.ownerRole,
      required: Boolean(gate.required),
      status: 'PENDING',
      note: '',
      updatedAt: nowIso,
      updatedBy: actorId,
    }));
  };

  const seedOperation = (operation: Operation) => {
    const seed = archetype.seedBundle;
    seed.objectives.forEach((objective) => {
      createObjective({
        opId: operation.id,
        title: objective.title,
        priority: objective.priority,
        status: 'OPEN',
        createdBy: actorId,
      });
    });
    seed.phases.forEach((phase, index) => {
      createPhase({
        opId: operation.id,
        title: phase.title,
        timeHint: phase.timeHint,
        orderIndex: index,
        status: 'OPEN',
      });
    });
    seed.tasks.forEach((task) => {
      createTask({
        opId: operation.id,
        domain: task.domain,
        title: task.title,
        status: 'OPEN',
        createdBy: actorId,
      });
    });
    getOrCreateRSVPPolicy(operation.id, operation.posture);
    updateRSVPPolicy(
      operation.id,
      seed.requirementRules.map((rule, index) => ({
        id: `${archetype.id.toLowerCase()}_rule_${index + 1}`,
        enforcement: rule.enforcement,
        kind: rule.kind,
        predicate: rule.predicate,
        message: rule.message,
      }))
    );
    seed.roleMandates.forEach((mandate) => upsertRoleMandate(operation.id, mandate, actorId));
    seed.loadoutMandates.forEach((mandate) => upsertLoadoutMandate(operation.id, mandate, actorId));
    seed.assetMandates.forEach((mandate) => upsertAssetMandate(operation.id, mandate, actorId));
  };

  const createFromWizard = () => {
    try {
      setErrorText('');
      if (!createPermission.allowed) throw new Error(createPermission.reason);
      if (!scheduleValidation.valid) throw new Error(scheduleValidation.reason);
      if (selectedVariantOption && !selectedVariantOption.available) {
        throw new Error(selectedVariantOption.reason || 'Selected variant is not available for this release track.');
      }
      if (archetypeId === 'INDUSTRIAL_SALVAGE' && !selectedMethodAvailability.available) {
        throw new Error(selectedMethodAvailability.reason || 'Selected salvage extraction method is not available.');
      }
      const operation = createOperation({
        createdBy: actorId,
        name: nameInput.trim() || archetype.label,
        hostOrgId: hostOrgInput.trim() || actorProfile?.orgId || 'ORG-LOCAL',
        invitedOrgIds: parseCsv(invitedOrgsInput),
        classification: classificationInput,
        posture: archetype.defaults.posture,
        status: archetype.defaults.status,
        domains: archetype.defaults.domains,
        ao: { nodeId: 'system-stanton', note: `${archetype.label} operation` },
        commsTemplateId: commsTemplateInput,
        ttlProfileId: ttlProfileInput.trim() || archetype.defaults.ttlProfileId,
        archetypeId,
        releaseTrack: releaseTrackInput,
        schedule: {
          plannedStartAt: new Date(startInput).toISOString(),
          plannedEndAt: new Date(endInput).toISOString(),
          timezone: timezoneInput.trim() || 'UTC',
        },
        readinessGates: buildReadinessGates(),
        scenarioConfig,
        securityProjection:
          archetypeId === 'PVP_ORG_V_ORG'
            ? buildRedactedOpponentProjection({
                orgName: pvpOpponentInput,
                estimatedStrength: pvpOpponentStrengthInput,
                doctrineSummary: pvpOpponentDoctrineInput,
              })
            : undefined,
        notificationMode: 'IN_APP',
      });
      initializeOperationEnhancements(operation.id, operation.posture, actorId);
      seedOperation(operation);
      appendOperationEvent({
        opId: operation.id,
        kind: 'WIZARD_RELEASE_TRACK_SELECTED',
        payload: {
          releaseTrack: releaseTrackInput,
          sc47PreviewEnabled,
          experimentalGameplayEnabled,
          variantId: effectiveVariant,
        },
        createdBy: actorId,
      });
      setFocusOperation(actorId, operation.id);
      setCreatedOpId(operation.id);
      if (saveAsTemplateAfterCreate) {
        createOperationTemplateFromOperation(operation.id, actorId, {
          name: foundryTemplateNameInput.trim() || `${operation.name} Template`,
          description: `Saved from Operation Foundry for ${operation.name}.`,
        });
      }
      onCreated?.(operation);
    } catch (error: any) {
      const message = error?.message || 'Failed to create operation.';
      setErrorText(message);
      onError?.(message);
    }
  };

  const exportDraftIcs = () => {
    try {
      setErrorText('');
      const pseudoOp = {
        id: 'draft',
        name: nameInput.trim() || archetype.label,
        posture: archetype.defaults.posture,
        status: archetype.defaults.status,
        archetypeId,
        ao: { nodeId: 'system-stanton' },
        schedule: {
          plannedStartAt: new Date(startInput).toISOString(),
          plannedEndAt: new Date(endInput).toISOString(),
          timezone: timezoneInput.trim() || 'UTC',
        },
      } as unknown as Operation;
      const ics = buildOperationScheduleIcs(pseudoOp);
      setIcsPreview(ics);
      if (typeof window !== 'undefined') {
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = buildOperationIcsFilename(pseudoOp);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      const message = error?.message || 'ICS export failed.';
      setErrorText(message);
      onError?.(message);
    }
  };

  const canCreateOperationNow = createPermission.allowed
    && scheduleValidation.valid
    && (!selectedVariantOption || selectedVariantOption.available)
    && (archetypeId !== 'INDUSTRIAL_SALVAGE' || selectedMethodAvailability.available);

  const foundryRiskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'N/A' = useMemo(() => {
    if (archetypeId === 'INDUSTRIAL_MINING') return scenarioConfig.mining?.riskProfile?.threatBand || 'N/A';
    if (archetypeId === 'INDUSTRIAL_SALVAGE') return scenarioConfig.salvage?.riskProfile?.threatBand || 'N/A';
    if (archetypeId === 'PVP_ORG_V_ORG') return scenarioConfig.pvp?.riskProfile?.threatBand || 'N/A';
    return 'N/A';
  }, [archetypeId, scenarioConfig]);

  const launchReadout = useMemo(() => {
    const readinessRequired = effectiveGates.filter((gate) => gate.required).length;
    return {
      archetypeLabel: archetype.label,
      releaseTrackLabel: releaseTrackInput === 'LIVE_4_6' ? 'LIVE 4.6' : '4.7 PREVIEW',
      variantSupport: selectedVariantOption ? `${selectedVariantOption.badgeLabel} / ${selectedVariantOption.confidence}` : 'DEFAULT',
      scheduleOk: scheduleValidation.valid,
      scheduleReason: scheduleValidation.reason,
      seededObjectives: archetype.seedBundle.objectives.length,
      seededPhases: archetype.seedBundle.phases.length,
      seededTasks: archetype.seedBundle.tasks.length,
      readinessRequired,
      readinessTotal: effectiveGates.length,
      commsTemplateId: commsTemplateInput,
      ttlProfileId: ttlProfileInput.trim() || archetype.defaults.ttlProfileId,
      riskBand: foundryRiskBand,
    };
  }, [
    archetype,
    commsTemplateInput,
    effectiveGates,
    foundryRiskBand,
    releaseTrackInput,
    scheduleValidation.reason,
    scheduleValidation.valid,
    selectedVariantOption,
    ttlProfileInput,
  ]);

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 nexus-terminal-panel">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Operation Foundry</h4>
        <NexusBadge tone={createPermission.allowed ? 'ok' : 'locked'}>{createPermission.allowed ? 'READY' : 'LOCKED'}</NexusBadge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((step, index) => (
          <NexusButton key={step} size="sm" intent={stepIndex === index ? 'primary' : 'subtle'} onClick={() => setStepIndex(index)} className="inline-flex items-center gap-1.5">
            <img src={foundryStepStatusTokenIcon(stepStatuses[step])} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
            {index + 1}. {step}
            <NexusBadge tone={stepStatusTone(stepStatuses[step])}>{stepStatuses[step]}</NexusBadge>
          </NexusButton>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">Quick Start</span>
        <NexusButton size="sm" intent="subtle" onClick={() => applyQuickStartPreset('RAPID_DEPLOY')}>Rapid Deploy</NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => applyQuickStartPreset('DOCTRINE_LOCK')}>Doctrine Lock</NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => applyQuickStartPreset('TRAINING_LANE')}>Training Lane</NexusButton>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] gap-2">
        <div className="space-y-2">
      {stepId === 'ARCHETYPE' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
            {listOperationArchetypes().map((entry) => (
              <button key={entry.id} type="button" onClick={() => selectArchetype(entry.id)} className={`rounded border px-2 py-2 text-left ${archetypeId === entry.id ? 'border-sky-500/60 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}>
                <div className="text-sm text-zinc-200">{entry.label}</div>
                <div className="text-[11px] text-zinc-500">{entry.description}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
            <select
              value={releaseTrackInput}
              onChange={(event) => setReleaseTrackInput(event.target.value as OperationReleaseTrack)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            >
              {RELEASE_TRACK_OPTIONS.map((track) => (
                <option key={track} value={track} disabled={track === 'PREVIEW_4_7' && !sc47PreviewEnabled}>
                  {track === 'LIVE_4_6' ? 'LIVE 4.6' : '4.7 PREVIEW'}
                </option>
              ))}
            </select>
            <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={sc47PreviewEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setSc47PreviewEnabledState(enabled);
                  setOperationSc47PreviewEnabled(enabled);
                  if (!enabled && releaseTrackInput === 'PREVIEW_4_7') setReleaseTrackInput('LIVE_4_6');
                }}
              />
              4.7 preview content
            </label>
            <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={experimentalGameplayEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setExperimentalGameplayEnabledState(enabled);
                  setOperationExperimentalGameplayEnabled(enabled);
                }}
              />
              Experimental gameplay
            </label>
            <div className="h-8 px-2 rounded border border-zinc-800 bg-zinc-950/55 text-[11px] text-zinc-400 inline-flex items-center">
              Track: {releaseTrackInput === 'LIVE_4_6' ? 'LIVE 4.6' : '4.7 Preview'}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500">{createPermission.reason}</div>
        </div>
      ) : null}
      {stepId === 'IDENTITY' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
          <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2" placeholder="Operation name" />
          <input value={hostOrgInput} onChange={(event) => setHostOrgInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Host org id" />
          <input value={invitedOrgsInput} onChange={(event) => setInvitedOrgsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Invited org ids (csv)" />
          <select value={classificationInput} onChange={(event) => setClassificationInput(event.target.value as DataClassification)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
            <option value="INTERNAL">INTERNAL</option><option value="ALLIED">ALLIED</option><option value="PUBLIC">PUBLIC</option>
          </select>
          <input type="datetime-local" value={startInput} onChange={(event) => setStartInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
          <input type="datetime-local" value={endInput} onChange={(event) => setEndInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
          <input value={timezoneInput} onChange={(event) => setTimezoneInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
          <div className="text-[11px] text-zinc-500 flex items-center">{scheduleValidation.reason}</div>
        </div>
      ) : null}
      {stepId === 'SCENARIO' ? (
        <div className="space-y-2">
          <select value={effectiveVariant} onChange={(event) => updateScenarioVariant(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
            {(variantOptions.length ? variantOptions : [{ id: 'CUSTOM', label: 'CUSTOM', available: true, badgeLabel: 'LIVE 4.6', badgeTone: 'ok', confidence: 'CONFIRMED' as const, sourceCount: 0, lastReviewedAt: '2026-02-23', legacyUnmapped: false }]).map((variant) => (
              <option
                key={variant.id}
                value={variant.id}
                disabled={!variant.available && variant.id !== effectiveVariant}
              >
                {variant.label} [{variant.badgeLabel}]
              </option>
            ))}
          </select>
          {selectedVariantOption ? (
            <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-2">
                <span>Variant support:</span>
                <NexusBadge tone={selectedVariantOption.badgeTone}>{selectedVariantOption.badgeLabel}</NexusBadge>
                <span>Confidence: {selectedVariantOption.confidence}</span>
              </div>
              <div>
                Sources: {selectedVariantOption.sourceCount} | Source last reviewed: {selectedVariantOption.lastReviewedAt}
              </div>
            </div>
          ) : null}
          {selectedVariantLockedReason ? (
            <div className="rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200">
              {selectedVariantLockedReason}
            </div>
          ) : null}
          {archetypeId === 'INDUSTRIAL_MINING' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <select value={miningTierInput} onChange={(event) => setMiningTierInput(event.target.value as OperationMiningTier)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {MINING_TIER_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={miningEnvironmentInput} onChange={(event) => setMiningEnvironmentInput(event.target.value as OperationMiningEnvironment)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {MINING_ENVIRONMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={miningMethodInput} onChange={(event) => setMiningMethodInput(event.target.value as OperationMiningExtractionMethod)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {MINING_METHOD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <input value={miningStagingNodeInput} onChange={(event) => setMiningStagingNodeInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Staging node id" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <input value={miningRouteInput} onChange={(event) => setMiningRouteInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Mining route plan" />
                <input value={miningRefineryInput} onChange={(event) => setMiningRefineryInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Refinery plan" />
                <input value={miningEscortInput} onChange={(event) => setMiningEscortInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Escort policy" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <input value={miningOreTargetsInput} onChange={(event) => setMiningOreTargetsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ore targets (csv)" />
                <input value={miningHazardsInput} onChange={(event) => setMiningHazardsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Hazards (csv)" />
                <select value={miningThreatBandInput} onChange={(event) => setMiningThreatBandInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW threat</option>
                  <option value="MEDIUM">MEDIUM threat</option>
                  <option value="HIGH">HIGH threat</option>
                </select>
                <input value={miningRescueCoverageInput} onChange={(event) => setMiningRescueCoverageInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Rescue coverage" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <input value={miningYieldInput} onChange={(event) => setMiningYieldInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Estimated yield SCU" />
                <input value={miningUnitValueInput} onChange={(event) => setMiningUnitValueInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Unit value aUEC" />
                <input value={miningFuelCostInput} onChange={(event) => setMiningFuelCostInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Fuel cost aUEC" />
                <input value={miningRiskReserveInput} onChange={(event) => setMiningRiskReserveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Risk reserve aUEC" />
                <input value={miningEvidenceInput} onChange={(event) => setMiningEvidenceInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Evidence refs (csv)" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <input value={miningFractureRateInput} onChange={(event) => setMiningFractureRateInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Fracture success %" />
                <input value={miningOverchargeInput} onChange={(event) => setMiningOverchargeInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Overcharge incidents" />
                <input value={miningRecoveredInput} onChange={(event) => setMiningRecoveredInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Recovered SCU" />
                <input value={miningIdleHaulInput} onChange={(event) => setMiningIdleHaulInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Idle haul minutes" />
                <input value={miningRefineryQueueInput} onChange={(event) => setMiningRefineryQueueInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Refinery queue minutes" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
                  <input type="checkbox" checked={miningRegolithEnabled} onChange={(event) => setMiningRegolithEnabled(event.target.checked)} />
                  Regolith companion enabled
                </label>
                <select value={miningRegolithSourceInput} onChange={(event) => setMiningRegolithSourceInput(event.target.value as 'NONE' | 'MANUAL' | 'REGOLITH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" disabled={!miningRegolithEnabled}>
                  <option value="REGOLITH">REGOLITH</option>
                  <option value="MANUAL">MANUAL</option>
                  <option value="NONE">NONE</option>
                </select>
                <input value={miningRegolithSessionInput} onChange={(event) => setMiningRegolithSessionInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Regolith session id" disabled={!miningRegolithEnabled} />
                <input value={miningRegolithWorkOrderInput} onChange={(event) => setMiningRegolithWorkOrderInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Regolith work order id" disabled={!miningRegolithEnabled} />
                <input value={miningRegolithFindsInput} onChange={(event) => setMiningRegolithFindsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Scouting refs (csv)" disabled={!miningRegolithEnabled} />
              </div>
            </div>
          ) : null}
          {archetypeId === 'INDUSTRIAL_SALVAGE' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <select value={salvageModeInput} onChange={(event) => setSalvageModeInput(event.target.value as OperationSalvageMode)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {SALVAGE_MODE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={salvageEnvironmentInput} onChange={(event) => setSalvageEnvironmentInput(event.target.value as OperationSalvageEnvironment)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {SALVAGE_ENVIRONMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={salvageMethodInput} onChange={(event) => setSalvageMethodInput(event.target.value as OperationSalvageExtractionMethod)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {salvageMethodOptions.map((entry) => (
                    <option key={entry.id} value={entry.id} disabled={!entry.availability.available && entry.id !== salvageMethodInput}>
                      {entry.id} [{entry.badge.label}]
                    </option>
                  ))}
                </select>
                <input value={salvageObjectiveInput} onChange={(event) => setSalvageObjectiveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Salvage objective type" />
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-2">
                  <span>Extraction method support:</span>
                  <NexusBadge tone={selectedMethodBadge.tone}>{selectedMethodBadge.label}</NexusBadge>
                  <span>Confidence: {selectedMethodAvailability.confidence}</span>
                </div>
                <div>
                  Sources: {selectedMethodAvailability.sourceCount} | Source last reviewed: {selectedMethodAvailability.lastReviewedAt}
                </div>
                {!selectedMethodAvailability.available ? (
                  <div className="text-amber-200">{selectedMethodAvailability.reason || 'Method is locked for this release track.'}</div>
                ) : null}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <input value={salvageTargetWreckInput} onChange={(event) => setSalvageTargetWreckInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Target wreck type" />
                <input value={salvageClaimInput} onChange={(event) => setSalvageClaimInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Claim jurisdiction" />
                <input value={salvageRouteInput} onChange={(event) => setSalvageRouteInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Route plan" />
                <input value={salvageProcessingInput} onChange={(event) => setSalvageProcessingInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Processing plan" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <input value={salvageEscortInput} onChange={(event) => setSalvageEscortInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Escort policy" />
                <input value={salvageInventoryInput} onChange={(event) => setSalvageInventoryInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Inventory policy" />
                <input value={salvageHazardsInput} onChange={(event) => setSalvageHazardsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Hazards (csv)" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <select value={salvageThreatBandInput} onChange={(event) => setSalvageThreatBandInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW threat</option>
                  <option value="MEDIUM">MEDIUM threat</option>
                  <option value="HIGH">HIGH threat</option>
                </select>
                <select value={salvageLegalRiskInput} onChange={(event) => setSalvageLegalRiskInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW legal risk</option>
                  <option value="MEDIUM">MEDIUM legal risk</option>
                  <option value="HIGH">HIGH legal risk</option>
                </select>
                <select value={salvageInterdictionRiskInput} onChange={(event) => setSalvageInterdictionRiskInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW interdiction</option>
                  <option value="MEDIUM">MEDIUM interdiction</option>
                  <option value="HIGH">HIGH interdiction</option>
                </select>
                <input value={salvageHullRecoveredInput} onChange={(event) => setSalvageHullRecoveredInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Hull recovered target %" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <input value={salvageComponentsInput} onChange={(event) => setSalvageComponentsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Components recovered" />
                <input value={salvageCargoRecoveredInput} onChange={(event) => setSalvageCargoRecoveredInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Cargo recovered SCU" />
                <input value={salvageCycleTimeInput} onChange={(event) => setSalvageCycleTimeInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Cycle time min" />
                <input value={salvageContaminationInput} onChange={(event) => setSalvageContaminationInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Contamination incidents" />
                <input value={salvageEvidenceInput} onChange={(event) => setSalvageEvidenceInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Evidence refs (csv)" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-7 gap-2">
                <input value={salvageRmcInput} onChange={(event) => setSalvageRmcInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected RMC SCU" />
                <input value={salvageCmInput} onChange={(event) => setSalvageCmInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected CM SCU" />
                <input value={salvageCargoInput} onChange={(event) => setSalvageCargoInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected cargo SCU" />
                <input value={salvageGrossAuecInput} onChange={(event) => setSalvageGrossAuecInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected gross aUEC" />
                <input value={salvageFuelCostInput} onChange={(event) => setSalvageFuelCostInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected fuel cost aUEC" />
                <input value={salvageProcessingCostInput} onChange={(event) => setSalvageProcessingCostInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected processing cost aUEC" />
                <input value={salvageRiskReserveInput} onChange={(event) => setSalvageRiskReserveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Projected risk reserve aUEC" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
                  <input type="checkbox" checked={salvageCompanionEnabled} onChange={(event) => setSalvageCompanionEnabled(event.target.checked)} />
                  Salvage companion refs enabled
                </label>
                <select value={salvageCompanionSourceInput} onChange={(event) => setSalvageCompanionSourceInput(event.target.value as 'NONE' | 'MANUAL')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" disabled={!salvageCompanionEnabled}>
                  <option value="MANUAL">MANUAL</option>
                  <option value="NONE">NONE</option>
                </select>
                <input value={salvageCompanionRefsInput} onChange={(event) => setSalvageCompanionRefsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Companion refs (csv)" disabled={!salvageCompanionEnabled} />
              </div>
            </div>
          ) : null}
          {archetypeId === 'PVP_ORG_V_ORG' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <select value={pvpEnvironmentInput} onChange={(event) => setPvpEnvironmentInput(event.target.value as OperationPvpEnvironment)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {PVP_ENVIRONMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={pvpEngagementInput} onChange={(event) => setPvpEngagementInput(event.target.value as OperationPvpEngagementProfile)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {PVP_PROFILE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <select value={pvpOpsecInput} onChange={(event) => setPvpOpsecInput(event.target.value as OperationPvpOpsecLevel)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  {PVP_OPSEC_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <input value={pvpObjectiveInput} onChange={(event) => setPvpObjectiveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Objective type" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <input value={pvpCommandIntentInput} onChange={(event) => setPvpCommandIntentInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Command intent" />
                <input value={pvpRoeInput} onChange={(event) => setPvpRoeInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Rules of engagement" />
                <input value={pvpRallyPointsInput} onChange={(event) => setPvpRallyPointsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Rally points (csv)" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
                <input value={pvpIngressInput} onChange={(event) => setPvpIngressInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ingress plan" />
                <input value={pvpQrfInput} onChange={(event) => setPvpQrfInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="QRF plan" />
                <input value={pvpSustainmentInput} onChange={(event) => setPvpSustainmentInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Sustainment plan" />
                <input value={pvpEvacInput} onChange={(event) => setPvpEvacInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Evac plan" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <input value={pvpDeconflictionInput} onChange={(event) => setPvpDeconflictionInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Deconfliction plan" />
                <input value={pvpIntelRefsInput} onChange={(event) => setPvpIntelRefsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Intel refs (csv)" />
                <input value={pvpOpponentInput} onChange={(event) => setPvpOpponentInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Opposing org (command view)" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <input value={pvpFriendlyPlannedInput} onChange={(event) => setPvpFriendlyPlannedInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Friendly planned" />
                <input value={pvpHostileEstimatedInput} onChange={(event) => setPvpHostileEstimatedInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Hostile estimated" />
                <input value={pvpQrfReserveInput} onChange={(event) => setPvpQrfReserveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="QRF reserve" />
                <input value={pvpMedevacReserveInput} onChange={(event) => setPvpMedevacReserveInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Medevac reserve" />
                <input value={pvpOpponentStrengthInput} onChange={(event) => setPvpOpponentStrengthInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Opponent strength hint" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <select value={pvpThreatBandInput} onChange={(event) => setPvpThreatBandInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW threat</option>
                  <option value="MEDIUM">MEDIUM threat</option>
                  <option value="HIGH">HIGH threat</option>
                </select>
                <select value={pvpCyberRiskInput} onChange={(event) => setPvpCyberRiskInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW cyber/ewar</option>
                  <option value="MEDIUM">MEDIUM cyber/ewar</option>
                  <option value="HIGH">HIGH cyber/ewar</option>
                </select>
                <select value={pvpDeceptionRiskInput} onChange={(event) => setPvpDeceptionRiskInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">LOW deception</option>
                  <option value="MEDIUM">MEDIUM deception</option>
                  <option value="HIGH">HIGH deception</option>
                </select>
                <input value={pvpObjectiveControlInput} onChange={(event) => setPvpObjectiveControlInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Objective control target %" />
                <input value={pvpCasualtyCapInput} onChange={(event) => setPvpCasualtyCapInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Casualty cap" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
                <input value={pvpCurrentCasualtiesInput} onChange={(event) => setPvpCurrentCasualtiesInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Current casualties" />
                <input value={pvpCommsDisruptionsInput} onChange={(event) => setPvpCommsDisruptionsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Comms disruptions" />
                <input value={pvpReactionLatencyInput} onChange={(event) => setPvpReactionLatencyInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Reaction latency sec" />
                <input value={pvpOpponentDoctrineInput} onChange={(event) => setPvpOpponentDoctrineInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Opponent doctrine summary" />
                <input value={pvpOpponentAssetProfileInput} onChange={(event) => setPvpOpponentAssetProfileInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Opponent asset profile" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
                  <input type="checkbox" checked={pvpCompanionEnabled} onChange={(event) => setPvpCompanionEnabled(event.target.checked)} />
                  PvP companion refs enabled
                </label>
                <select value={pvpCompanionSourceInput} onChange={(event) => setPvpCompanionSourceInput(event.target.value as 'NONE' | 'MANUAL')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" disabled={!pvpCompanionEnabled}>
                  <option value="MANUAL">MANUAL</option>
                  <option value="NONE">NONE</option>
                </select>
                <select value={pvpOpponentIntelConfidenceInput} onChange={(event) => setPvpOpponentIntelConfidenceInput(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="LOW">Opponent intel LOW</option>
                  <option value="MEDIUM">Opponent intel MEDIUM</option>
                  <option value="HIGH">Opponent intel HIGH</option>
                </select>
                <input value={pvpCompanionRefsInput} onChange={(event) => setPvpCompanionRefsInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Companion refs (csv)" disabled={!pvpCompanionEnabled} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {stepId === 'FORCE' ? <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] text-zinc-300">
        Seed role mandates: {archetype.seedBundle.roleMandates.length} | seed asset mandates: {archetype.seedBundle.assetMandates.length}
      </div> : null}
      {stepId === 'COMMS' ? <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
        <select value={commsTemplateInput} onChange={(event) => setCommsTemplateInput(event.target.value as CommsTemplateId)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
          {(Object.keys(CommsTemplateRegistry) as CommsTemplateId[]).map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <input value={ttlProfileInput} onChange={(event) => setTtlProfileInput(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="TTL profile" />
        <div className="text-[11px] text-zinc-500 flex items-center">Notifications: in-app feed + badges</div>
      </div> : null}
      {stepId === 'READINESS' ? <div className="space-y-2">
        {effectiveGates.map((gate, index) => (
          <div key={`${gate.label}:${index}`} className="grid grid-cols-1 xl:grid-cols-3 gap-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
            <input value={gate.label} onChange={(event) => setGateRows((current) => {
              const next = [...(current.length ? current : effectiveGates)];
              next[index] = { ...next[index], label: event.target.value };
              return next;
            })} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
            <input value={gate.ownerRole} onChange={(event) => setGateRows((current) => {
              const next = [...(current.length ? current : effectiveGates)];
              next[index] = { ...next[index], ownerRole: event.target.value };
              return next;
            })} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
            <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
              <input type="checkbox" checked={gate.required} onChange={(event) => setGateRows((current) => {
                const next = [...(current.length ? current : effectiveGates)];
                next[index] = { ...next[index], required: event.target.checked };
                return next;
              })} /> Required
            </label>
          </div>
        ))}
      </div> : null}
      {stepId === 'REVIEW' ? <div className="space-y-2">
          <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] text-zinc-300">
            <div>Archetype: {archetype.label}</div>
            <div>Release track: {releaseTrackInput === 'LIVE_4_6' ? 'LIVE 4.6' : '4.7 PREVIEW'}</div>
            <div>Name: {nameInput}</div>
            <div>Window: {startInput} {'->'} {endInput} ({timezoneInput})</div>
            <div>Rules seeded: {archetype.seedBundle.requirementRules.length} | Readiness gates: {effectiveGates.length}</div>
            {selectedVariantOption ? (
              <div>
                Variant support: {selectedVariantOption.badgeLabel} ({selectedVariantOption.confidence}) | Sources: {selectedVariantOption.sourceCount}
              </div>
            ) : null}
            {archetypeId === 'INDUSTRIAL_MINING' ? (
              <div>
                Mining profile: {miningTierInput} / {miningEnvironmentInput} / {miningMethodInput} | Ore targets: {parseCsv(miningOreTargetsInput).length} | Regolith: {miningRegolithEnabled ? miningRegolithSourceInput : 'DISABLED'}
              </div>
            ) : null}
            {archetypeId === 'INDUSTRIAL_SALVAGE' ? (
              <div>
                Salvage profile: {salvageModeInput} / {salvageEnvironmentInput} / {salvageMethodInput} | Target: {salvageTargetWreckInput || 'N/A'} | Companion refs: {salvageCompanionEnabled ? parseCsv(salvageCompanionRefsInput).length : 0}
              </div>
            ) : null}
            {archetypeId === 'PVP_ORG_V_ORG' ? (
              <div>
                PvP profile: {pvpEnvironmentInput} / {pvpEngagementInput} / {pvpOpsecInput} | Force {toNumberInput(pvpFriendlyPlannedInput)} vs {toNumberInput(pvpHostileEstimatedInput)} | Companion refs: {pvpCompanionEnabled ? parseCsv(pvpCompanionRefsInput).length : 0}
              </div>
            ) : null}
          </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
            <label className="text-[11px] text-zinc-300 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={saveAsTemplateAfterCreate}
                onChange={(event) => setSaveAsTemplateAfterCreate(event.target.checked)}
              />
              Save as template after launch
            </label>
            <input
              value={foundryTemplateNameInput}
              onChange={(event) => setFoundryTemplateNameInput(event.target.value)}
              className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              placeholder="Template name"
              disabled={!saveAsTemplateAfterCreate}
            />
          </div>
          <div className="flex flex-wrap gap-2">
          <NexusButton size="sm" intent="subtle" onClick={exportDraftIcs}>Export Draft ICS</NexusButton>
          <NexusButton size="sm" intent="primary" disabled={!canCreateOperationNow} onClick={createFromWizard}>Launch Operation</NexusButton>
          {createdOpId ? <NexusBadge tone="ok">Created {createdOpId}</NexusBadge> : null}
          </div>
        </div>
        {icsPreview ? <textarea value={icsPreview} readOnly className="h-20 w-full resize-none rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[10px] text-zinc-500" /> : null}
      </div> : null}
        </div>
        <aside className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Launch Readout</div>
          <div className="space-y-1 text-[11px] text-zinc-300">
            <div>Archetype: {launchReadout.archetypeLabel}</div>
            <div>Track: {launchReadout.releaseTrackLabel}</div>
            <div>Variant: {launchReadout.variantSupport}</div>
            <div className="flex items-center gap-1.5">
              <img src={operationRiskBandTokenIcon(launchReadout.riskBand)} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
              <span>Risk: {launchReadout.riskBand}</span>
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px] text-zinc-400 space-y-0.5">
            <div>Schedule: {launchReadout.scheduleOk ? 'VALID' : 'INVALID'}</div>
            <div className="truncate">{launchReadout.scheduleReason}</div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px] text-zinc-400">
            Seed: {launchReadout.seededObjectives} objectives · {launchReadout.seededPhases} phases · {launchReadout.seededTasks} tasks
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px] text-zinc-400">
            Gates: {launchReadout.readinessRequired} required / {launchReadout.readinessTotal} total
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px] text-zinc-400">
            Comms: {launchReadout.commsTemplateId} · {launchReadout.ttlProfileId}
          </div>
        </aside>
      </div>
      {errorText ? <div className="rounded border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs text-red-300">{errorText}</div> : null}
      <div className="flex items-center justify-between gap-2">
        <NexusButton size="sm" intent="subtle" onClick={() => goStep(-1)} disabled={stepIndex === 0}>Back</NexusButton>
        <NexusBadge tone="neutral">{stepIndex + 1}/{STEPS.length}</NexusBadge>
        <NexusButton size="sm" intent="primary" onClick={() => goStep(1)} disabled={stepIndex >= STEPS.length - 1}>Next</NexusButton>
      </div>
    </section>
  );
}
