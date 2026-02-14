/**
 * Adaptability / Pack Schemas
 *
 * Packs are versioned configuration overlays for gameplay evolution.
 * They must be validated against game version and can be toggled safely.
 */

export type PackKind =
  | 'GAMEPLAY_VARIANT'
  | 'COMMS_TEMPLATE'
  | 'RSVP_POLICY'
  | 'TTL_PROFILE'
  | 'REPORT_TEMPLATE';

export interface PackManifest {
  id: string;
  kind: PackKind;
  version: string;
  compatibleGameVersions: string[];
  enabledByDefault: boolean;
}

export interface FeatureFlagCondition {
  requiresPackId?: string;
  requiresData?: string[];
  minGameVersion?: string;
}

export interface FeatureFlag {
  id: string;
  description: string;
  enabled: boolean;
  conditions?: FeatureFlagCondition;
}

