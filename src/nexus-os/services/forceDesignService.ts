/**
 * Force Design Service (MVP)
 *
 * Utility-first analysis for roster and fit-profile composition.
 * This is intentionally explainable and conservative, not an optimizer.
 */

import type {
  CoverageCellStatus,
  CoverageSourceRef,
  CoverageMatrix,
  FitElement,
  FitProfile,
  ForceAnalysis,
  ForceGap,
} from '../schemas/fitForceSchemas';
import { getOperationById } from './operationService';
import { getFitProfileById } from './fitProfileService';
import { listAssetSlots, listRSVPEntries, listRSVPPolicies } from './rsvpService';

interface RequirementTarget {
  id: string;
  kind: 'ROLE' | 'CAPABILITY';
  tag: string;
  requiredCount: number;
}

interface AnalysisElement {
  id: string;
  label: string;
  countPlanned: number;
  roleTags: string[];
  capabilityTags: string[];
  sourceRefs: CoverageSourceRef[];
  dependencyRefs: Array<{ dependsOn: string; reason: string }>;
}

interface ForceAnalysisCacheEntry {
  key: string;
  analysis: ForceAnalysis;
  createdAtMs: number;
}

const ROSTER_ANALYSIS_CACHE_WINDOW_MS = 5000;
const ROSTER_ANALYSIS_CACHE_MAX_AGE_MS = 20000;
const rosterAnalysisCache = new Map<string, ForceAnalysisCacheEntry>();

function normalizeToken(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))];
}

function stringifySorted(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stringifySorted(entry)).sort().join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([key, entry]) => `${key}:${stringifySorted(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function buildRosterAnalysisCacheKey(opId: string, payload: unknown, nowMs: number): string {
  const bucket = Math.floor(nowMs / ROSTER_ANALYSIS_CACHE_WINDOW_MS);
  return `${opId}:${bucket}:${stringifySorted(payload)}`;
}

function elementFromFitProfile(fit: FitProfile): AnalysisElement[] {
  if (fit.scope === 'INDIVIDUAL') {
    return (fit.platforms || []).map((platform) => ({
      id: platform.id,
      label: platform.shipNameSnapshot || platform.shipSpecId || platform.id,
      countPlanned: 1,
      roleTags: dedupeTags(fit.roleTags || []),
      capabilityTags: dedupeTags(fit.capabilityTags || []),
      sourceRefs: [{ kind: 'fit_profile', id: fit.id }, { kind: 'element', id: platform.id }],
      dependencyRefs: (fit.dependencies || []).map((dependency) => ({
        dependsOn: dependency.dependsOn,
        reason: dependency.reason,
      })),
    }));
  }

  return (fit.elements || []).map((element) => ({
    id: element.id,
    label: element.label,
    countPlanned: Math.max(1, Number(element.countPlanned || 1)),
    roleTags: dedupeTags([...(fit.roleTags || []), ...(element.roleTags || [])]),
    capabilityTags: dedupeTags([...(fit.capabilityTags || []), ...(element.capabilityTags || [])]),
    sourceRefs: [{ kind: 'fit_profile', id: fit.id }, { kind: 'element', id: element.id }],
    dependencyRefs: (fit.dependencies || []).map((dependency) => ({
      dependsOn: dependency.dependsOn,
      reason: dependency.reason,
    })),
  }));
}

function collectRequirementTargets(opId: string): RequirementTarget[] {
  const operation = getOperationById(opId);
  const rules = listRSVPPolicies().find((policy) => policy.opId === opId)?.rules || [];
  const targets: RequirementTarget[] = [];

  for (const rule of rules) {
    const minCount = Math.max(1, Number(rule.predicate.minCount || 1));
    if (rule.kind === 'ROLE') {
      for (const role of rule.predicate.roleIn || []) {
        targets.push({
          id: `role:${normalizeToken(role)}`,
          kind: 'ROLE',
          tag: role,
          requiredCount: minCount,
        });
      }
    }
    if (rule.kind === 'CAPABILITY') {
      for (const capability of rule.predicate.capabilityAny || []) {
        targets.push({
          id: `cap:${normalizeToken(capability)}`,
          kind: 'CAPABILITY',
          tag: capability,
          requiredCount: minCount,
        });
      }
    }
    if (rule.kind === 'ASSET') {
      for (const capability of rule.predicate.shipTagsAny || []) {
        targets.push({
          id: `cap:${normalizeToken(capability)}`,
          kind: 'CAPABILITY',
          tag: capability,
          requiredCount: minCount,
        });
      }
    }
  }

  if (operation) {
    if (operation.domains.fps || operation.domains.ground) {
      targets.push({ id: 'cap:escort', kind: 'CAPABILITY', tag: 'escort', requiredCount: 1 });
      targets.push({ id: 'role:security', kind: 'ROLE', tag: 'security', requiredCount: 1 });
    }
    if (operation.domains.airSpace) {
      targets.push({ id: 'cap:air_cover', kind: 'CAPABILITY', tag: 'air_cover', requiredCount: 1 });
    }
    if (operation.domains.logistics) {
      targets.push({ id: 'cap:transport', kind: 'CAPABILITY', tag: 'transport', requiredCount: 1 });
      targets.push({ id: 'cap:logistics', kind: 'CAPABILITY', tag: 'logistics', requiredCount: 1 });
    }
  }

  const deduped = new Map<string, RequirementTarget>();
  for (const target of targets) {
    const key = `${target.kind}:${normalizeToken(target.tag)}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, target);
      continue;
    }
    deduped.set(key, { ...existing, requiredCount: Math.max(existing.requiredCount, target.requiredCount) });
  }
  return [...deduped.values()].sort((a, b) => {
    const kindCompare = a.kind.localeCompare(b.kind);
    if (kindCompare !== 0) return kindCompare;
    return a.tag.localeCompare(b.tag);
  });
}

function coverageStatus(matchedCount: number, requiredCount: number): CoverageCellStatus {
  if (matchedCount <= 0) return 'absent';
  if (matchedCount < requiredCount) return 'thin';
  if (matchedCount > requiredCount) return 'redundant';
  return 'covered';
}

export function computeCoverageMatrix(
  elements: AnalysisElement[],
  requiredTargets: RequirementTarget[]
): CoverageMatrix {
  const columns = elements.map((element) => ({ id: element.id, label: element.label }));
  const rows = requiredTargets.map((target) => {
    const normalizedTag = normalizeToken(target.tag);
    const matchingElements = elements.filter((element) => {
      const candidateTags =
        target.kind === 'ROLE'
          ? element.roleTags.map(normalizeToken)
          : element.capabilityTags.map(normalizeToken);
      return candidateTags.includes(normalizedTag);
    });
    const matchedCount = matchingElements.reduce((sum, element) => sum + Math.max(1, element.countPlanned), 0);
    const overallStatus = coverageStatus(matchedCount, target.requiredCount);
    const sourceRefs = dedupeCoverageSourceRefs(
      matchingElements.flatMap((element) => element.sourceRefs || [{ kind: 'element', id: element.id }])
    );

    return {
      id: target.id,
      label: target.tag,
      kind: target.kind,
      requiredCount: target.requiredCount,
      matchedCount,
      overallStatus,
      sourceRefs,
      ruleTrace: {
        normalizedTag,
        matchedElementIds: matchingElements.map((entry) => entry.id),
        targetId: target.id,
      },
      cells: elements.map((element) => {
        const candidateTags =
          target.kind === 'ROLE'
            ? element.roleTags.map(normalizeToken)
            : element.capabilityTags.map(normalizeToken);
        const hasTag = candidateTags.includes(normalizedTag);
        if (!hasTag) return { columnId: element.id, status: 'absent' as CoverageCellStatus };
        if (matchedCount < target.requiredCount) return { columnId: element.id, status: 'thin' as CoverageCellStatus };
        if (matchedCount > target.requiredCount) return { columnId: element.id, status: 'redundant' as CoverageCellStatus };
        return { columnId: element.id, status: 'covered' as CoverageCellStatus };
      }),
    };
  });

  return { columns, rows };
}

function dedupeCoverageSourceRefs(refs: CoverageSourceRef[]): CoverageSourceRef[] {
  const seen = new Set<string>();
  const deduped: CoverageSourceRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  return deduped.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
}

export function computeDependencyGraph(elements: AnalysisElement[]) {
  const nodes: ForceAnalysis['dependencyGraph']['nodes'] = elements.map((element) => ({
    id: element.id,
    label: element.label,
    kind: 'ELEMENT',
  }));
  const edges: ForceAnalysis['dependencyGraph']['edges'] = [];

  const escortProvider = elements.find((element) =>
    element.capabilityTags.map(normalizeToken).includes('escort')
  );
  const transportProvider = elements.find((element) =>
    element.capabilityTags.map(normalizeToken).includes('transport')
  );

  for (const element of elements) {
    for (const dependency of element.dependencyRefs) {
      const targetElement =
        elements.find((candidate) => candidate.id === dependency.dependsOn) ||
        elements.find((candidate) => candidate.label === dependency.dependsOn) ||
        null;
      if (!targetElement) continue;
      edges.push({
        id: `dep:${element.id}->${targetElement.id}:${dependency.reason}`,
        from: element.id,
        to: targetElement.id,
        reason: dependency.reason,
      });
    }

    const caps = element.capabilityTags.map(normalizeToken);
    if (caps.includes('interdiction') && escortProvider && escortProvider.id !== element.id) {
      edges.push({
        id: `dep:${element.id}->${escortProvider.id}:escort_cover`,
        from: element.id,
        to: escortProvider.id,
        reason: 'Interdiction element typically needs escort cover.',
      });
    }
    if (caps.includes('medical') && transportProvider && transportProvider.id !== element.id) {
      edges.push({
        id: `dep:${element.id}->${transportProvider.id}:patient_movement`,
        from: element.id,
        to: transportProvider.id,
        reason: 'Medical element depends on transport lane for extraction.',
      });
    }
  }

  return { nodes, edges };
}

function buildGapsFromCoverage(matrix: CoverageMatrix): ForceGap[] {
  const gaps: ForceGap[] = [];
  for (const row of matrix.rows) {
    if (row.overallStatus === 'covered' || row.overallStatus === 'redundant') continue;
    const severity = row.overallStatus === 'absent' ? 'HIGH' : 'MED';
    gaps.push({
      kind: row.kind,
      severity,
      message:
        row.overallStatus === 'absent'
          ? `Missing ${row.kind.toLowerCase()} coverage for "${row.label}".`
          : `Thin ${row.kind.toLowerCase()} coverage for "${row.label}" (${row.matchedCount}/${row.requiredCount}).`,
      suggestedActions:
        row.kind === 'CAPABILITY'
          ? [`Add asset with capability tag "${row.label}".`, 'Attach fit profile with explicit capability tags.']
          : [`Add role-tagged element for "${row.label}".`],
    });
  }
  return gaps;
}

function buildSustainmentHints(elements: AnalysisElement[]): ForceAnalysis['sustainmentHints'] {
  const allCaps = elements.flatMap((element) => element.capabilityTags.map(normalizeToken));
  const hasTransport = allCaps.includes('transport');
  const hasLogistics = allCaps.includes('logistics');
  const hasMedical = allCaps.includes('medical');
  const hasEscort = allCaps.includes('escort');

  return [
    {
      label: 'Movement Sustainment',
      band: hasTransport ? 'HIGH' : hasLogistics ? 'MED' : 'LOW',
      note: hasTransport
        ? 'Transport-tagged elements present for movement sustainment.'
        : 'No explicit transport element; movement sustainment uncertain.',
    },
    {
      label: 'Medical Sustainment',
      band: hasMedical ? 'MED' : 'LOW',
      note: hasMedical
        ? 'Medical-tagged capability detected.'
        : 'No medical-tagged capability detected.',
    },
    {
      label: 'Protection Envelope',
      band: hasEscort ? 'MED' : 'LOW',
      note: hasEscort
        ? 'Escort-tagged capability available.'
        : 'Escort protection may be insufficient for contested routes.',
    },
  ];
}

function confidenceFromElements(elements: AnalysisElement[]): ForceAnalysis['confidenceSummary'] {
  if (!elements.length) return { band: 'LOW', note: 'No force elements available for analysis.' };
  const withCaps = elements.filter((element) => element.capabilityTags.length > 0).length;
  const ratio = withCaps / elements.length;
  if (ratio >= 0.8) return { band: 'HIGH', note: 'Most elements have explicit capability tags.' };
  if (ratio >= 0.45) return { band: 'MED', note: 'Analysis confidence is moderate; some capability tags are missing.' };
  return { band: 'LOW', note: 'Analysis confidence is low due to sparse capability data.' };
}

export function analyzeFitProfile(fitProfileId: string, nowMs = Date.now()): ForceAnalysis {
  const fit = getFitProfileById(fitProfileId);
  if (!fit) {
    return {
      fitProfileId,
      generatedAt: new Date(nowMs).toISOString(),
      coverageMatrix: { columns: [], rows: [] },
      dependencyGraph: { nodes: [], edges: [] },
      sustainmentHints: [{ label: 'No Data', band: 'LOW', note: `Fit profile ${fitProfileId} not found.` }],
      gaps: [{ kind: 'CAPABILITY', severity: 'HIGH', message: 'Cannot analyze missing fit profile.' }],
      confidenceSummary: { band: 'LOW', note: 'Missing fit profile.' },
    };
  }

  const elements = elementFromFitProfile(fit);
  const inferredTargets: RequirementTarget[] = dedupeTags([
    ...(fit.roleTags || []).map((tag) => `ROLE:${tag}`),
    ...(fit.capabilityTags || []).map((tag) => `CAPABILITY:${tag}`),
  ]).map((token) => {
    const [kind, tag] = token.split(':');
    return {
      id: `${kind}:${normalizeToken(tag)}`,
      kind: kind === 'ROLE' ? 'ROLE' : 'CAPABILITY',
      tag,
      requiredCount: 1,
    };
  });

  const coverageMatrix = computeCoverageMatrix(elements, inferredTargets);
  const dependencyGraph = computeDependencyGraph(elements);
  const sustainmentHints = buildSustainmentHints(elements);
  const gaps = buildGapsFromCoverage(coverageMatrix);

  return {
    fitProfileId,
    generatedAt: new Date(nowMs).toISOString(),
    coverageMatrix,
    dependencyGraph,
    sustainmentHints,
    gaps,
    confidenceSummary: confidenceFromElements(elements),
  };
}

export function analyzeRoster(opId: string, nowMs = Date.now()): ForceAnalysis {
  const slots = listAssetSlots(opId);
  const entries = listRSVPEntries(opId);
  const cacheKey = buildRosterAnalysisCacheKey(
    opId,
    {
      slots: slots.map((slot) => ({
        id: slot.id,
        fitProfileId: slot.fitProfileId,
        tags: slot.capabilitySnapshot?.tags || [],
        updatedAt: slot.updatedAt,
      })),
      entries: entries.map((entry) => ({
        id: entry.id,
        rolePrimary: entry.rolePrimary,
        roleSecondary: entry.roleSecondary || [],
        status: entry.status,
        updatedAt: entry.updatedAt,
      })),
      rules: listRSVPPolicies()
        .find((policy) => policy.opId === opId)
        ?.rules.map((rule) => ({
          id: rule.id,
          kind: rule.kind,
          enforcement: rule.enforcement,
          predicate: rule.predicate,
        })) || [],
    },
    nowMs
  );
  const cached = rosterAnalysisCache.get(cacheKey);
  if (cached && nowMs - cached.createdAtMs <= ROSTER_ANALYSIS_CACHE_MAX_AGE_MS) {
    return cached.analysis;
  }
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const elements: AnalysisElement[] = [];

  for (const slot of slots) {
    const entry = entryById.get(slot.rsvpEntryId);
    const fit = slot.fitProfileId ? getFitProfileById(slot.fitProfileId) : null;
    const fitElements = fit ? elementFromFitProfile(fit) : [];
    const fitRoleTags = fitElements.flatMap((element) => element.roleTags);
    const fitCaps = fitElements.flatMap((element) => element.capabilityTags);
    const slotCaps = slot.capabilitySnapshot?.tags || [];

    elements.push({
      id: slot.id,
      label: slot.assetName || slot.assetId || slot.id,
      countPlanned: 1,
      roleTags: dedupeTags([entry?.rolePrimary || '', ...fitRoleTags]),
      capabilityTags: dedupeTags([...slotCaps, ...fitCaps]),
      sourceRefs: dedupeCoverageSourceRefs([
        { kind: 'asset_slot', id: slot.id },
        { kind: 'rsvp_entry', id: slot.rsvpEntryId },
        ...(slot.fitProfileId ? [{ kind: 'fit_profile' as const, id: slot.fitProfileId }] : []),
      ]),
      dependencyRefs: fit ? fit.dependencies.map((dependency) => ({ dependsOn: dependency.dependsOn, reason: dependency.reason })) : [],
    });
  }

  // If no assets yet, fall back to individual RSVP participants.
  if (!elements.length) {
    for (const entry of entries) {
      elements.push({
        id: entry.id,
        label: entry.userId,
        countPlanned: 1,
        roleTags: dedupeTags([entry.rolePrimary, ...(entry.roleSecondary || [])]),
        capabilityTags: [],
        sourceRefs: [{ kind: 'rsvp_entry', id: entry.id }],
        dependencyRefs: [],
      });
    }
  }

  const requiredTargets = collectRequirementTargets(opId);
  const coverageMatrix = computeCoverageMatrix(elements, requiredTargets);
  const dependencyGraph = computeDependencyGraph(elements);
  const sustainmentHints = buildSustainmentHints(elements);
  const gaps = buildGapsFromCoverage(coverageMatrix);

  if (dependencyGraph.edges.length === 0 && elements.length > 1) {
    gaps.push({
      kind: 'DEPENDENCY',
      severity: 'LOW',
      message: 'No explicit dependencies declared; coordination assumptions may be incomplete.',
      suggestedActions: ['Declare fit dependencies for critical elements.'],
    });
  }
  if (elements.length >= 40) {
    gaps.push({
      kind: 'SUSTAINMENT',
      severity: 'LOW',
      message: `Large roster (${elements.length} elements): review coverage row trace metadata for deterministic diagnostics.`,
      suggestedActions: ['Use coverage row ruleTrace/sourceRefs to inspect matching provenance by requirement.'],
    });
  }

  const analysis: ForceAnalysis = {
    opId,
    generatedAt: new Date(nowMs).toISOString(),
    coverageMatrix,
    dependencyGraph,
    sustainmentHints,
    gaps,
    confidenceSummary: confidenceFromElements(elements),
  };
  rosterAnalysisCache.set(cacheKey, {
    key: cacheKey,
    analysis,
    createdAtMs: nowMs,
  });
  if (rosterAnalysisCache.size > 20) {
    const oldest = [...rosterAnalysisCache.entries()].sort((a, b) => a[1].createdAtMs - b[1].createdAtMs)[0];
    if (oldest) rosterAnalysisCache.delete(oldest[0]);
  }
  return analysis;
}

/**
 * Requirement linkage helper:
 * exposes available role/capability tags so policy authors can reference strings.
 */
export function getOperationTagAvailability(opId: string): {
  roleTags: Array<{ tag: string; count: number }>;
  capabilityTags: Array<{ tag: string; count: number }>;
} {
  const analysis = analyzeRoster(opId);
  const roleCount = new Map<string, number>();
  const capCount = new Map<string, number>();

  for (const row of analysis.coverageMatrix.rows) {
    if (row.kind === 'ROLE') roleCount.set(row.label, row.matchedCount);
    if (row.kind === 'CAPABILITY') capCount.set(row.label, row.matchedCount);
  }

  return {
    roleTags: [...roleCount.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
    capabilityTags: [...capCount.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}
