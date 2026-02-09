/**
 * Pack Service (Adaptability Layer)
 *
 * Purpose:
 * - Load and validate versioned packs.
 * - Provide pack-aware registry projections without mutating canonical registries.
 * - Allow gameplay evolution (enable/disable behavior) without source rewrites.
 */

import {
  CommsTemplateRegistry,
  GameplayVariantRegistry,
  ReportTemplateRegistry,
  TTLProfileRegistry,
  type CommsTemplateDefinition,
  type GameplayVariantDefinition,
  type TTLProfileDefinition,
} from '../registries';
import type { RequirementRule } from '../schemas/opSchemas';
import type { FeatureFlag, PackKind, PackManifest } from '../schemas/packSchemas';
import type { ReportTemplate } from '../schemas/reportSchemas';

export interface PackValidationResult {
  compatible: boolean;
  reason: string;
}

export interface RsvpPolicyTemplate {
  id: string;
  label: string;
  postureHint: 'FOCUSED' | 'CASUAL';
  rules: RequirementRule[];
}

interface PackRuleEffects {
  disableGameplayVariantIds?: string[];
  disableCommsTemplateIds?: string[];
  disableTtlProfileIds?: string[];
  disableReportTemplateIds?: string[];
  rsvpPolicyTemplates?: RsvpPolicyTemplate[];
}

interface PackAwareGameplayVariantsResult {
  variants: GameplayVariantDefinition[];
  disabledVariantIds: string[];
  warnings: string[];
}

const PACK_MANIFESTS: PackManifest[] = [
  {
    id: 'pack-redscar-field-ops',
    kind: 'GAMEPLAY_VARIANT',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    enabledByDefault: false,
  },
  {
    id: 'pack-redscar-command-comms-discipline',
    kind: 'COMMS_TEMPLATE',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    enabledByDefault: true,
  },
  {
    id: 'pack-redscar-focused-rsvp-policy',
    kind: 'RSVP_POLICY',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    enabledByDefault: true,
  },
  {
    id: 'pack-redscar-short-cqb-ttl',
    kind: 'TTL_PROFILE',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x'],
    enabledByDefault: false,
  },
  {
    id: 'pack-redscar-report-templates',
    kind: 'REPORT_TEMPLATE',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    enabledByDefault: true,
  },
];

const PACK_RULES: Record<string, PackRuleEffects> = {
  'pack-redscar-field-ops': {
    // Example of pack-based runtime behavior swap without editing registries.
    disableGameplayVariantIds: ['TRAINING_CQB_LIVE_FIRE'],
  },
  'pack-redscar-command-comms-discipline': {
    // Hide emergency template in strict doctrine mode unless explicitly needed.
    disableCommsTemplateIds: [],
  },
  'pack-redscar-focused-rsvp-policy': {
    rsvpPolicyTemplates: [
      {
        id: 'rsvp-focused-assault-core',
        label: 'Focused Assault Core',
        postureHint: 'FOCUSED',
        rules: [
          {
            id: 'template-focused-comms-hard',
            enforcement: 'HARD',
            kind: 'COMMS',
            predicate: { commsRequired: true },
            message: 'Comms-ready participation is mandatory.',
          },
          {
            id: 'template-focused-capability-soft',
            enforcement: 'SOFT',
            kind: 'CAPABILITY',
            predicate: { capabilityAny: ['medical', 'interdiction', 'transport'] },
            message: 'Recommended: bring at least one high-impact capability tag.',
          },
        ],
      },
    ],
  },
  'pack-redscar-short-cqb-ttl': {
    disableTtlProfileIds: [],
  },
  'pack-redscar-report-templates': {
    disableReportTemplateIds: [],
  },
};

const FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'flag_variant_pvp_cqb_raid_enabled',
    description: 'Enable PVP_CQB_RAID gameplay variant for active pack set.',
    enabled: true,
  },
  {
    id: 'flag_variant_training_cqb_live_fire_enabled',
    description: 'Enable TRAINING_CQB_LIVE_FIRE variant in current doctrine pack.',
    enabled: true,
  },
];

const FEATURE_FLAG_VARIANT_DISABLE_WHEN_FALSE: Record<string, string[]> = {
  flag_variant_pvp_cqb_raid_enabled: ['PVP_CQB_RAID'],
  flag_variant_training_cqb_live_fire_enabled: ['TRAINING_CQB_LIVE_FIRE'],
};

const packEnabledOverrides = new Map<string, boolean>();
const featureFlagOverrides = new Map<string, boolean>();

function normalizeToken(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function versionMatchesPattern(gameVersion: string, pattern: string): boolean {
  const normalizedGameVersion = normalizeToken(gameVersion);
  const normalizedPattern = normalizeToken(pattern);
  if (!normalizedPattern || normalizedPattern === '*') return true;
  if (normalizedPattern.endsWith('.x')) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedGameVersion.startsWith(prefix);
  }
  return normalizedGameVersion === normalizedPattern;
}

function isPackEnabledByRuntime(pack: PackManifest): boolean {
  if (packEnabledOverrides.has(pack.id)) return Boolean(packEnabledOverrides.get(pack.id));
  return pack.enabledByDefault;
}

function isFeatureFlagEnabled(flag: FeatureFlag): boolean {
  if (featureFlagOverrides.has(flag.id)) return Boolean(featureFlagOverrides.get(flag.id));
  return flag.enabled;
}

export function loadPacks(): PackManifest[] {
  return [...PACK_MANIFESTS];
}

export function listFeatureFlags(): FeatureFlag[] {
  return FEATURE_FLAGS.map((flag) => ({
    ...flag,
    enabled: isFeatureFlagEnabled(flag),
  }));
}

export function setPackEnabled(packId: string, enabled: boolean): boolean {
  const found = PACK_MANIFESTS.some((pack) => pack.id === packId);
  if (!found) return false;
  packEnabledOverrides.set(packId, Boolean(enabled));
  return true;
}

export function setFeatureFlagEnabled(flagId: string, enabled: boolean): boolean {
  const found = FEATURE_FLAGS.some((flag) => flag.id === flagId);
  if (!found) return false;
  featureFlagOverrides.set(flagId, Boolean(enabled));
  return true;
}

export function validatePackCompatibility(pack: PackManifest, gameVersion: string): PackValidationResult {
  const compatible = pack.compatibleGameVersions.some((pattern) => versionMatchesPattern(gameVersion, pattern));
  return {
    compatible,
    reason: compatible
      ? `Pack ${pack.id} is compatible with ${gameVersion}.`
      : `Pack ${pack.id} is not compatible with ${gameVersion}.`,
  };
}

export function getActivePacks(kind: PackKind, gameVersion: string): PackManifest[] {
  return PACK_MANIFESTS.filter((pack) => pack.kind === kind)
    .filter((pack) => isPackEnabledByRuntime(pack))
    .filter((pack) => validatePackCompatibility(pack, gameVersion).compatible);
}

function collectActivePackRules(kind: PackKind, gameVersion: string): PackRuleEffects[] {
  return getActivePacks(kind, gameVersion)
    .map((pack) => PACK_RULES[pack.id])
    .filter(Boolean);
}

/**
 * Registry helper: project gameplay variants under active packs + feature flags.
 */
export function getPackAwareGameplayVariants(gameVersion: string): PackAwareGameplayVariantsResult {
  const activeRules = collectActivePackRules('GAMEPLAY_VARIANT', gameVersion);
  const disabled = new Set<string>();
  const warnings: string[] = [];

  for (const rule of activeRules) {
    for (const variantId of rule.disableGameplayVariantIds || []) disabled.add(variantId);
  }

  for (const flag of FEATURE_FLAGS) {
    const enabled = isFeatureFlagEnabled(flag);
    if (enabled) continue;
    const ids = FEATURE_FLAG_VARIANT_DISABLE_WHEN_FALSE[flag.id] || [];
    ids.forEach((id) => disabled.add(id));
    warnings.push(`Feature flag ${flag.id} disabled variant(s): ${ids.join(', ') || 'none'}.`);
  }

  const variants = GameplayVariantRegistry.filter((variant) => !disabled.has(variant.id));
  return {
    variants,
    disabledVariantIds: [...disabled],
    warnings,
  };
}

/**
 * Registry helper: project comms templates under active packs.
 */
export function getPackAwareCommsTemplates(gameVersion: string): CommsTemplateDefinition[] {
  const activeRules = collectActivePackRules('COMMS_TEMPLATE', gameVersion);
  const disabled = new Set<string>();
  for (const rule of activeRules) {
    for (const templateId of rule.disableCommsTemplateIds || []) disabled.add(templateId);
  }
  return Object.values(CommsTemplateRegistry).filter((template) => !disabled.has(template.id));
}

/**
 * Registry helper: project TTL profiles under active packs.
 */
export function getPackAwareTTLProfiles(gameVersion: string): TTLProfileDefinition[] {
  const activeRules = collectActivePackRules('TTL_PROFILE', gameVersion);
  const disabled = new Set<string>();
  for (const rule of activeRules) {
    for (const ttlProfileId of rule.disableTtlProfileIds || []) disabled.add(ttlProfileId);
  }
  return TTLProfileRegistry.filter((profile) => !disabled.has(profile.id));
}

/**
 * RSVP policy template helper for Ops/RSVP integration hooks.
 */
export function getPackAwareRsvpPolicyTemplates(gameVersion: string): RsvpPolicyTemplate[] {
  const activeRules = collectActivePackRules('RSVP_POLICY', gameVersion);
  return activeRules.flatMap((rule) => rule.rsvpPolicyTemplates || []);
}

/**
 * Registry helper: project report templates under active packs.
 */
export function getPackAwareReportTemplates(gameVersion: string): ReportTemplate[] {
  const activeRules = collectActivePackRules('REPORT_TEMPLATE', gameVersion);
  const disabled = new Set<string>();
  for (const rule of activeRules) {
    for (const templateId of rule.disableReportTemplateIds || []) disabled.add(templateId);
  }
  return (Object.values(ReportTemplateRegistry) as ReportTemplate[])
    .filter((template) => !disabled.has(template.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function resetPackServiceRuntimeState() {
  packEnabledOverrides.clear();
  featureFlagOverrides.clear();
}
