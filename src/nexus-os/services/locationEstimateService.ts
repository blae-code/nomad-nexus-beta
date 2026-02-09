/**
 * Location Estimate Service (scaffold)
 *
 * Conservative merge logic for declared + inferred location streams.
 * This service intentionally avoids omniscient assumptions.
 */

import type { LocationEstimate, LocationEstimateSource, VisibilityScope } from '../schemas/coreSchemas';
import { clampConfidence, isStaleAt } from '../schemas/coreSchemas';

export interface LocationMergeInput {
  subjectId: string;
  declared?: LocationEstimate | null;
  inferred?: LocationEstimate | null;
  nowMs?: number;
}

export type LocationConfidenceBand = 'LOW' | 'MED' | 'HIGH';
export type LocationDisplayState = 'DECLARED' | 'INFERRED' | 'STALE';

export interface RenderableLocationEstimate extends LocationEstimate {
  ageSeconds: number;
  ttlRemainingSeconds: number;
  isActive: boolean;
  confidenceBand: LocationConfidenceBand;
  displayState: LocationDisplayState;
  primarySourceType: LocationEstimateSource['sourceType'] | 'UNKNOWN';
}

export interface LocationViewContext {
  viewerScope?: VisibilityScope;
  allowedSubjectIds?: string[];
  includeStale?: boolean;
}

const VISIBILITY_RANK: Record<VisibilityScope, number> = {
  PRIVATE: 0,
  SQUAD: 1,
  WING: 2,
  OP: 3,
  ORG: 4,
};

export function isLocationEstimateActive(estimate: LocationEstimate, nowMs = Date.now()): boolean {
  return !isStaleAt(estimate.updatedAt, estimate.ttlSeconds, nowMs);
}

export function confidenceToBand(confidence: number): LocationConfidenceBand {
  if (confidence >= 0.7) return 'HIGH';
  if (confidence >= 0.4) return 'MED';
  return 'LOW';
}

function isVisibleInScope(estimateScope: VisibilityScope, viewerScope: VisibilityScope): boolean {
  return VISIBILITY_RANK[estimateScope] <= VISIBILITY_RANK[viewerScope];
}

/**
 * Render adapter for map/presence views.
 * Always returns TTL/confidence-aware records; never elevates stale truth.
 */
export function getRenderableLocationEstimates(
  estimates: LocationEstimate[],
  viewContext: LocationViewContext = {},
  nowMs = Date.now()
): RenderableLocationEstimate[] {
  const viewerScope = viewContext.viewerScope || 'ORG';
  const allowedIds = new Set(viewContext.allowedSubjectIds || []);
  const includeStale = Boolean(viewContext.includeStale);

  return (estimates || [])
    .filter((estimate) => isVisibleInScope(estimate.visibilityScope, viewerScope))
    .filter((estimate) => (allowedIds.size > 0 ? allowedIds.has(estimate.subjectId) : true))
    .map((estimate) => {
      const updatedMs = new Date(estimate.updatedAt).getTime();
      const active = isLocationEstimateActive(estimate, nowMs);
      const ageSeconds = Number.isFinite(updatedMs) ? Math.max(0, Math.floor((nowMs - updatedMs) / 1000)) : 0;
      const ttlRemainingSeconds = Math.max(
        0,
        Number.isFinite(updatedMs) ? Math.ceil((updatedMs + estimate.ttlSeconds * 1000 - nowMs) / 1000) : 0
      );
      const confidence = clampConfidence(estimate.confidence);

      return {
        ...estimate,
        confidence,
        ageSeconds,
        ttlRemainingSeconds,
        isActive: active,
        confidenceBand: confidenceToBand(confidence),
        displayState: active ? estimate.mode : 'STALE',
        primarySourceType: estimate.sources?.[0]?.sourceType || 'UNKNOWN',
      };
    })
    .filter((estimate) => (includeStale ? true : estimate.isActive))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Merge declared and inferred estimates using conservative precedence:
 * declared (active) > inferred (active), and confidence is dampened on conflicts.
 */
export function mergeDeclaredAndInferred(input: LocationMergeInput): LocationEstimate | null {
  const nowMs = input.nowMs ?? Date.now();
  const declaredActive = input.declared && isLocationEstimateActive(input.declared, nowMs) ? input.declared : null;
  const inferredActive = input.inferred && isLocationEstimateActive(input.inferred, nowMs) ? input.inferred : null;

  if (!declaredActive && !inferredActive) return null;

  if (declaredActive && !inferredActive) {
    return {
      ...declaredActive,
      subjectId: input.subjectId,
      confidence: clampConfidence(declaredActive.confidence),
    };
  }

  if (!declaredActive && inferredActive) {
    return {
      ...inferredActive,
      subjectId: input.subjectId,
      confidence: clampConfidence(inferredActive.confidence),
    };
  }

  const declared = declaredActive as LocationEstimate;
  const inferred = inferredActive as LocationEstimate;

  const declaredKey = JSON.stringify(declared.bestGuessLocation || {});
  const inferredKey = JSON.stringify(inferred.bestGuessLocation || {});
  const conflict = declaredKey !== inferredKey;

  const mergedConfidence = conflict
    ? Math.min(clampConfidence(declared.confidence), clampConfidence(inferred.confidence), 0.6)
    : Math.max(clampConfidence(declared.confidence), clampConfidence(inferred.confidence));

  const mergedSources = [...(declared.sources || []), ...(inferred.sources || [])];
  const mergedUpdatedAt =
    new Date(declared.updatedAt).getTime() >= new Date(inferred.updatedAt).getTime() ? declared.updatedAt : inferred.updatedAt;

  return {
    subjectId: input.subjectId,
    bestGuessLocation: declared.bestGuessLocation,
    confidence: mergedConfidence,
    sources: mergedSources,
    mode: 'DECLARED',
    updatedAt: mergedUpdatedAt,
    ttlSeconds: Math.min(declared.ttlSeconds, inferred.ttlSeconds),
    visibilityScope: declared.visibilityScope,
  };
}
