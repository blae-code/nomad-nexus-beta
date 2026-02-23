import type {
  OperationContentConfidence,
  OperationReleaseTrack,
} from '../schemas/opSchemas';

export interface StarCitizenSourceReference {
  id: string;
  label: string;
  url: string;
  observedAt: string;
}

export interface StarCitizenContentMeta {
  minTrack: OperationReleaseTrack;
  confidence: OperationContentConfidence;
  sourceRefs: StarCitizenSourceReference[];
  lastReviewedAt: string;
  note?: string;
}

export interface ResolvedStarCitizenContentMeta extends StarCitizenContentMeta {
  key: string;
  legacyUnmapped: boolean;
}

export interface OperationContentBadge {
  id: 'LIVE_4_6' | 'TENTATIVE_4_7' | 'EXPERIMENTAL' | 'LEGACY_UNMAPPED';
  label: string;
  tone: 'ok' | 'warning' | 'danger' | 'neutral';
  tooltip: string;
}

export interface StarCitizenAvailability {
  key: string;
  available: boolean;
  reason?: string;
  badge: OperationContentBadge;
  confidence: OperationContentConfidence;
  minTrack: OperationReleaseTrack;
  sourceRefs: StarCitizenSourceReference[];
  sourceCount: number;
  lastReviewedAt: string;
  legacyUnmapped: boolean;
}

export interface StarCitizenAvailabilityOptions {
  releaseTrack: OperationReleaseTrack;
  sc47PreviewEnabled?: boolean;
  experimentalEnabled?: boolean;
}

const SOURCE_PATCH_NOTES: StarCitizenSourceReference = {
  id: 'PATCH_NOTES_HUB',
  label: 'RSI Patch Notes Hub',
  url: 'https://robertsspaceindustries.com/patch-notes',
  observedAt: '2026-02-23',
};

const SOURCE_COMM_LINK: StarCitizenSourceReference = {
  id: 'COMM_LINK_FEED',
  label: 'RSI Comm-Link Feed',
  url: 'https://robertsspaceindustries.com/comm-link',
  observedAt: '2026-02-23',
};

const SOURCE_ROADMAP_ROUNDUP: StarCitizenSourceReference = {
  id: 'ROADMAP_ROUNDUP_2026_02_11',
  label: 'Roadmap Roundup - February 11, 2026',
  url: 'https://robertsspaceindustries.com/comm-link/transmission/21013-Roadmap-Roundup-February-11-2026',
  observedAt: '2026-02-11',
};

const SOURCE_INDUSTRIAL_POST: StarCitizenSourceReference = {
  id: 'INDUSTRIAL_MISSIONS_POST',
  label: 'Alpha 4.6 Industrial Missions Spectrum Post',
  url: 'https://robertsspaceindustries.com/spectrum/community/SC/forum/3/thread/alpha-4-6-introducing-new-industrial-missions/7627710',
  observedAt: '2026-02-23',
};

const COMMON_LIVE_SOURCES = [SOURCE_PATCH_NOTES, SOURCE_COMM_LINK, SOURCE_INDUSTRIAL_POST];
const COMMON_PREVIEW_SOURCES = [SOURCE_COMM_LINK, SOURCE_ROADMAP_ROUNDUP];

const VARIANT_RELEASE_META: Readonly<Record<string, StarCitizenContentMeta>> = Object.freeze({
  MINING_GEO: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_ASTEROID_0G: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_SHIP_SURFACE: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_SHIP_MOON: {
    minTrack: 'LIVE_4_6',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_ROC_SURFACE: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_HAND_CAVE: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  MINING_PLANETARY_RING: {
    minTrack: 'LIVE_4_6',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  PVP_CQB_RAID: {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  PVP_CQB_BOARDING: {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  CONVOY_ESCORT: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  SALVAGE_HULL_STRIP: {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  SALVAGE_RECOVERY_HOT_ZONE: {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  SALVAGE_COMPONENT_RECOVERY: {
    minTrack: 'LIVE_4_6',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  SALVAGE_CARGO_RECLAMATION: {
    minTrack: 'LIVE_4_6',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  SALVAGE_SURFACE_WRECK_RECOVERY: {
    minTrack: 'PREVIEW_4_7',
    confidence: 'SPECULATIVE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
    note: 'Surface wreck drone-heavy salvage loop is intentionally experimental.',
  },
  SALVAGE_BLACKBOX_RETRIEVAL: {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
});

const METHOD_RELEASE_META: Readonly<Record<string, StarCitizenContentMeta>> = Object.freeze({
  'MINING:SHIP_LASER': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'MINING:ROC_BEAM': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'MINING:HAND_TOOL': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'SALVAGE:SCRAPER': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'SALVAGE:TRACTOR': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'SALVAGE:MULTI_TOOL': {
    minTrack: 'LIVE_4_6',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'SALVAGE:SALVAGE_DRONE': {
    minTrack: 'PREVIEW_4_7',
    confidence: 'SPECULATIVE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
    note: 'Drone extraction is preserved for experimentation and legacy hydration only.',
  },
  'PVP:RAID': {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'PVP:BOARDING': {
    minTrack: 'PREVIEW_4_7',
    confidence: 'HIGH_CONFIDENCE',
    sourceRefs: COMMON_PREVIEW_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
  'PVP:CONVOY_ESCORT': {
    minTrack: 'LIVE_4_6',
    confidence: 'CONFIRMED',
    sourceRefs: COMMON_LIVE_SOURCES,
    lastReviewedAt: '2026-02-23',
  },
});

function trackRank(track: OperationReleaseTrack): number {
  return track === 'PREVIEW_4_7' ? 2 : 1;
}

function resolveLegacyMeta(key: string): ResolvedStarCitizenContentMeta {
  return {
    key,
    legacyUnmapped: true,
    minTrack: 'LIVE_4_6',
    confidence: 'SPECULATIVE',
    sourceRefs: [],
    lastReviewedAt: '2026-02-23',
    note: 'Legacy operation payload does not map to canonical variant/method metadata.',
  };
}

function resolveBadge(meta: ResolvedStarCitizenContentMeta): OperationContentBadge {
  if (meta.legacyUnmapped) {
    return {
      id: 'LEGACY_UNMAPPED',
      label: 'LEGACY_UNMAPPED',
      tone: 'warning',
      tooltip: 'Legacy record preserved. Not mapped to current canonical Star Citizen operation metadata.',
    };
  }
  if (meta.confidence === 'SPECULATIVE') {
    return {
      id: 'EXPERIMENTAL',
      label: 'EXPERIMENTAL',
      tone: 'danger',
      tooltip: 'Speculative content. Keep behind explicit experimental enablement.',
    };
  }
  if (meta.minTrack === 'PREVIEW_4_7') {
    return {
      id: 'TENTATIVE_4_7',
      label: '4.7 TENTATIVE',
      tone: 'warning',
      tooltip: 'Tentative/high-confidence preview content for 4.7 planning.',
    };
  }
  return {
    id: 'LIVE_4_6',
    label: 'LIVE 4.6',
    tone: 'ok',
    tooltip: 'Confirmed Live 4.6-aligned content.',
  };
}

function resolveAvailability(
  meta: ResolvedStarCitizenContentMeta,
  options: StarCitizenAvailabilityOptions
): { available: boolean; reason?: string } {
  if (meta.legacyUnmapped) {
    return { available: true };
  }
  const sc47PreviewEnabled = options.sc47PreviewEnabled ?? true;
  const experimentalEnabled = options.experimentalEnabled ?? false;
  if (meta.minTrack === 'PREVIEW_4_7' && !sc47PreviewEnabled) {
    return { available: false, reason: '4.7 preview content is disabled by feature flag.' };
  }
  if (trackRank(options.releaseTrack) < trackRank(meta.minTrack)) {
    return { available: false, reason: 'Variant is not available for the selected release track.' };
  }
  if (meta.confidence === 'SPECULATIVE' && !experimentalEnabled) {
    return { available: false, reason: 'Speculative gameplay is hidden unless experimental mode is enabled.' };
  }
  return { available: true };
}

function resolveAvailabilityPayload(
  key: string,
  meta: ResolvedStarCitizenContentMeta,
  options: StarCitizenAvailabilityOptions
): StarCitizenAvailability {
  const availability = resolveAvailability(meta, options);
  return {
    key,
    available: availability.available,
    reason: availability.reason,
    badge: resolveBadge(meta),
    confidence: meta.confidence,
    minTrack: meta.minTrack,
    sourceRefs: meta.sourceRefs,
    sourceCount: meta.sourceRefs.length,
    lastReviewedAt: meta.lastReviewedAt,
    legacyUnmapped: meta.legacyUnmapped,
  };
}

export function getVariantReleaseMeta(variantId: string | undefined): ResolvedStarCitizenContentMeta {
  const key = String(variantId || '').trim();
  if (!key) return resolveLegacyMeta('UNKNOWN_VARIANT');
  const meta = VARIANT_RELEASE_META[key];
  if (!meta) return resolveLegacyMeta(key);
  return {
    key,
    legacyUnmapped: false,
    ...meta,
  };
}

export function getMethodReleaseMeta(
  loopId: 'MINING' | 'SALVAGE' | 'PVP',
  methodId: string | undefined
): ResolvedStarCitizenContentMeta {
  const method = String(methodId || '').trim();
  const key = `${loopId}:${method || 'UNKNOWN_METHOD'}`;
  const meta = METHOD_RELEASE_META[key];
  if (!meta) return resolveLegacyMeta(key);
  return {
    key,
    legacyUnmapped: false,
    ...meta,
  };
}

export function getVariantDisplayBadge(variantId: string | undefined): OperationContentBadge {
  return resolveBadge(getVariantReleaseMeta(variantId));
}

export function getVariantBadge(variantId: string | undefined): OperationContentBadge {
  return getVariantDisplayBadge(variantId);
}

export function getMethodDisplayBadge(
  loopId: 'MINING' | 'SALVAGE' | 'PVP',
  methodId: string | undefined
): OperationContentBadge {
  return resolveBadge(getMethodReleaseMeta(loopId, methodId));
}

export function getVariantAvailability(
  variantId: string | undefined,
  options: StarCitizenAvailabilityOptions
): StarCitizenAvailability {
  const meta = getVariantReleaseMeta(variantId);
  return resolveAvailabilityPayload(meta.key, meta, options);
}

export function getMethodAvailability(
  loopId: 'MINING' | 'SALVAGE' | 'PVP',
  methodId: string | undefined,
  options: StarCitizenAvailabilityOptions
): StarCitizenAvailability {
  const meta = getMethodReleaseMeta(loopId, methodId);
  return resolveAvailabilityPayload(meta.key, meta, options);
}

export function isVariantAvailableForTrack(
  variantId: string | undefined,
  releaseTrack: OperationReleaseTrack,
  options: Omit<StarCitizenAvailabilityOptions, 'releaseTrack'> = {}
): boolean {
  return getVariantAvailability(variantId, { releaseTrack, ...options }).available;
}

export function isMethodAvailableForTrack(
  loopId: 'MINING' | 'SALVAGE' | 'PVP',
  methodId: string | undefined,
  releaseTrack: OperationReleaseTrack,
  options: Omit<StarCitizenAvailabilityOptions, 'releaseTrack'> = {}
): boolean {
  return getMethodAvailability(loopId, methodId, { releaseTrack, ...options }).available;
}
