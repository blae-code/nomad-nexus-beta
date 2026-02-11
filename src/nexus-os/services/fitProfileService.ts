/**
 * Fit Profile Service (MVP in-memory repository)
 *
 * Guardrails:
 * - Capability-first modeling, not "best build" optimization.
 * - Patch mismatch and unknown-state warnings are preserved, not suppressed.
 * - Source refs are metadata only; no scraping or telemetry assumptions.
 */

import type {
  FitChangeHistoryEntry,
  FitComponentSelection,
  FitProfile,
  FitScope,
  FitSourceRef,
  FitValidationState,
  SourceRefKind,
} from '../schemas/fitForceSchemas';
import type { ShipSpec } from '../schemas/referenceDataSchemas';
import { getDefaultReferenceGameVersion, getShipSpec } from './referenceDataService';
import { canManageOperation } from './operationService';
import { listAssetSlots, listRSVPEntries, updateAssetSlot } from './rsvpService';

export interface FitProfileCreateInput {
  scope: FitScope;
  name: string;
  description?: string;
  createdBy: string;
  gameVersion: string;
  sourceRefs?: FitSourceRef[];
  platforms?: FitProfile['platforms'];
  elements?: FitProfile['elements'];
  roleTags?: string[];
  capabilityTags?: string[];
  assumptions?: FitProfile['assumptions'];
  constraints?: FitProfile['constraints'];
  dependencies?: FitProfile['dependencies'];
  risks?: FitProfile['risks'];
}

export interface FitProfileUpdateInput {
  name?: string;
  description?: string;
  gameVersion?: string;
  sourceRefs?: FitSourceRef[];
  platforms?: FitProfile['platforms'];
  elements?: FitProfile['elements'];
  roleTags?: string[];
  capabilityTags?: string[];
  assumptions?: FitProfile['assumptions'];
  constraints?: FitProfile['constraints'];
  dependencies?: FitProfile['dependencies'];
  risks?: FitProfile['risks'];
  changedBy?: string;
  changeSummary?: string;
}

export interface FitProfileListFilters {
  scope?: FitScope;
  createdBy?: string;
}

export interface DerivedTagResult {
  roleTags: string[];
  capabilityTags: string[];
  warnings: string[];
}

type FitProfileListener = (profiles: FitProfile[]) => void;

export interface FitAttachmentCitation {
  kind: 'fit_profile' | 'asset_slot' | 'rsvp_entry';
  id: string;
}

export interface FitAttachmentResult {
  updatedSlots: ReturnType<typeof updateAssetSlot>[];
  warnings: string[];
  citations: FitAttachmentCitation[];
}

let fitProfileStore: FitProfile[] = [];
const fitProfileListeners = new Set<FitProfileListener>();

function normalizeToken(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function createFitProfileId(nowMs = Date.now()): string {
  return `fit_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSourceRef(kind: SourceRefKind, ref: string): FitSourceRef {
  return { kind, ref };
}

function sortProfiles(records: FitProfile[]): FitProfile[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function notifyListeners() {
  const snapshot = sortProfiles(fitProfileStore);
  for (const listener of fitProfileListeners) listener(snapshot);
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))];
}

function referencedShipSpecs(fit: Pick<FitProfile, 'platforms' | 'elements' | 'gameVersion'>): Array<{
  shipSpec: ShipSpec;
  warning?: string;
}> {
  const found: Array<{ shipSpec: ShipSpec; warning?: string }> = [];

  for (const platform of fit.platforms || []) {
    if (!platform.shipSpecId) continue;
    const match = getShipSpec(platform.shipSpecId, fit.gameVersion);
    if (!match.data) continue;
    found.push({
      shipSpec: match.data,
      warning: match.warnings.map((warning) => warning.message).join(' | ') || undefined,
    });
  }

  for (const element of fit.elements || []) {
    if (!element.shipSpecId) continue;
    const match = getShipSpec(element.shipSpecId, fit.gameVersion);
    if (!match.data) continue;
    found.push({
      shipSpec: match.data,
      warning: match.warnings.map((warning) => warning.message).join(' | ') || undefined,
    });
  }

  return found;
}

export function deriveCapabilityTags(
  fit: Pick<FitProfile, 'platforms' | 'elements' | 'roleTags' | 'capabilityTags' | 'gameVersion'>
): DerivedTagResult {
  const roleTags = dedupeTags(fit.roleTags || []);
  const capabilityTags = dedupeTags(fit.capabilityTags || []);
  const warnings: string[] = [];

  for (const element of fit.elements || []) {
    for (const tag of element.roleTags || []) roleTags.push(tag);
    for (const tag of element.capabilityTags || []) capabilityTags.push(tag);
  }

  const shipRefs = referencedShipSpecs(fit);
  for (const ref of shipRefs) {
    roleTags.push(...(ref.shipSpec.roleTags || []));
    capabilityTags.push(...(ref.shipSpec.capabilities || []));
    if (ref.warning) warnings.push(ref.warning);
  }

  return {
    roleTags: dedupeTags(roleTags),
    capabilityTags: dedupeTags(capabilityTags),
    warnings: dedupeTags(warnings),
  };
}

export function validateFitProfile(
  fit: Pick<
    FitProfile,
    'scope' | 'gameVersion' | 'platforms' | 'elements' | 'roleTags' | 'capabilityTags' | 'name'
  >
): FitValidationState {
  const patchMismatchWarnings: string[] = [];
  const unknowns: string[] = [];
  const currentReferenceVersion = getDefaultReferenceGameVersion();

  if (!fit.name?.trim()) unknowns.push('Profile name is missing.');
  if (!fit.gameVersion?.trim()) unknowns.push('Fit gameVersion is missing.');
  if (fit.gameVersion && currentReferenceVersion !== 'unknown' && fit.gameVersion !== currentReferenceVersion) {
    patchMismatchWarnings.push(
      `Fit profile uses ${fit.gameVersion} while reference baseline default is ${currentReferenceVersion}.`
    );
  }

  if (fit.scope === 'INDIVIDUAL') {
    if (!fit.platforms?.length) unknowns.push('No platform selected for individual fit.');
    for (const platform of fit.platforms || []) {
      if (!platform.shipSpecId && !platform.shipNameSnapshot) {
        unknowns.push(`Platform ${platform.id} has no shipSpecId or name snapshot.`);
      }
      for (const component of platform.components || []) {
        if (!component.componentSpecId && !component.componentNameSnapshot) {
          unknowns.push(`Platform ${platform.id} has component in slot ${component.slotTag} without source reference.`);
        }
      }
    }
  } else if (!fit.elements?.length) {
    unknowns.push('No force elements declared for group-scope fit.');
  }

  const tags = deriveCapabilityTags(fit);
  if (!tags.capabilityTags.length) unknowns.push('No capability tags derived or declared.');
  if (!tags.roleTags.length) unknowns.push('No role tags derived or declared.');
  patchMismatchWarnings.push(...tags.warnings);

  return {
    patchMismatchWarnings: dedupeTags(patchMismatchWarnings),
    unknowns: dedupeTags(unknowns),
  };
}

function normalizePlatforms(input: FitProfileCreateInput['platforms']): FitProfile['platforms'] {
  return (input || []).map((platform, index) => ({
    id: platform.id || `platform-${index + 1}`,
    shipSpecId: platform.shipSpecId,
    shipNameSnapshot: platform.shipNameSnapshot,
    components: (platform.components || []).map((component: FitComponentSelection) => ({
      componentSpecId: component.componentSpecId,
      componentNameSnapshot: component.componentNameSnapshot,
      slotTag: component.slotTag,
      notes: component.notes,
    })),
  }));
}

function normalizeElements(input: FitProfileCreateInput['elements']): FitProfile['elements'] {
  return (input || []).map((element, index) => ({
    id: element.id || `element-${index + 1}`,
    label: element.label || `Element ${index + 1}`,
    countPlanned: Math.max(1, Number(element.countPlanned || 1)),
    shipSpecId: element.shipSpecId,
    shipClassTag: element.shipClassTag,
    roleTags: dedupeTags(element.roleTags || []),
    capabilityTags: dedupeTags(element.capabilityTags || []),
    notes: element.notes,
  }));
}

function nextHistoryEntry(by: string, summary: string, nowMs = Date.now()): FitChangeHistoryEntry {
  return {
    at: new Date(nowMs).toISOString(),
    by,
    summary,
  };
}

export function createFitProfile(input: FitProfileCreateInput, nowMs = Date.now()): FitProfile {
  const platforms = normalizePlatforms(input.platforms);
  const elements = normalizeElements(input.elements);
  const tags = deriveCapabilityTags({
    platforms,
    elements,
    roleTags: input.roleTags || [],
    capabilityTags: input.capabilityTags || [],
    gameVersion: input.gameVersion,
  });

  const base: FitProfile = {
    id: createFitProfileId(nowMs),
    scope: input.scope,
    name: input.name.trim() || 'Untitled Fit Profile',
    description: input.description,
    createdBy: input.createdBy,
    createdAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
    gameVersion: input.gameVersion || getDefaultReferenceGameVersion(),
    sourceRefs: [...(input.sourceRefs || [createSourceRef('USER', 'manual_profile_creation')])],
    platforms,
    elements,
    roleTags: tags.roleTags,
    capabilityTags: tags.capabilityTags,
    assumptions: [...(input.assumptions || [])],
    constraints: [...(input.constraints || [])],
    dependencies: [...(input.dependencies || [])],
    risks: [...(input.risks || [])],
    validation: { patchMismatchWarnings: [], unknowns: [] },
    changeHistory: [nextHistoryEntry(input.createdBy, 'Fit profile created', nowMs)],
  };

  base.validation = validateFitProfile(base);
  fitProfileStore = sortProfiles([base, ...fitProfileStore]);
  notifyListeners();
  return base;
}

export function updateFitProfile(id: string, patch: FitProfileUpdateInput, nowMs = Date.now()): FitProfile {
  const existing = fitProfileStore.find((entry) => entry.id === id);
  if (!existing) throw new Error(`FitProfile ${id} not found`);

  const nextPlatforms = patch.platforms ? normalizePlatforms(patch.platforms) : existing.platforms;
  const nextElements = patch.elements ? normalizeElements(patch.elements) : existing.elements;
  const derivedTags = deriveCapabilityTags({
    platforms: nextPlatforms,
    elements: nextElements,
    roleTags: patch.roleTags ?? existing.roleTags,
    capabilityTags: patch.capabilityTags ?? existing.capabilityTags,
    gameVersion: patch.gameVersion || existing.gameVersion,
  });

  const updated: FitProfile = {
    ...existing,
    name: patch.name?.trim() || existing.name,
    description: patch.description ?? existing.description,
    gameVersion: patch.gameVersion || existing.gameVersion,
    sourceRefs: patch.sourceRefs || existing.sourceRefs,
    platforms: nextPlatforms,
    elements: nextElements,
    roleTags: derivedTags.roleTags,
    capabilityTags: derivedTags.capabilityTags,
    assumptions: patch.assumptions || existing.assumptions,
    constraints: patch.constraints || existing.constraints,
    dependencies: patch.dependencies || existing.dependencies,
    risks: patch.risks || existing.risks,
    updatedAt: new Date(nowMs).toISOString(),
    changeHistory: [
      ...existing.changeHistory,
      nextHistoryEntry(
        patch.changedBy || existing.createdBy,
        patch.changeSummary || 'Fit profile updated',
        nowMs
      ),
    ],
    validation: { patchMismatchWarnings: [], unknowns: [] },
  };

  updated.validation = validateFitProfile(updated);
  fitProfileStore = sortProfiles(fitProfileStore.map((entry) => (entry.id === id ? updated : entry)));
  notifyListeners();
  return updated;
}

export function listFitProfiles(filters: FitProfileListFilters = {}): FitProfile[] {
  return sortProfiles(fitProfileStore).filter((entry) => {
    if (filters.scope && entry.scope !== filters.scope) return false;
    if (filters.createdBy && normalizeToken(entry.createdBy) !== normalizeToken(filters.createdBy)) return false;
    return true;
  });
}

export function getFitProfileById(id: string): FitProfile | null {
  return fitProfileStore.find((entry) => entry.id === id) || null;
}

/**
 * Attach fit profile to all asset slots under one RSVP entry.
 */
export function attachFitProfileToRSVP(
  opId: string,
  rsvpEntryId: string,
  fitProfileId: string,
  nowMs = Date.now()
): FitAttachmentResult {
  const fit = getFitProfileById(fitProfileId);
  if (!fit) throw new Error(`FitProfile ${fitProfileId} not found`);
  const derived = deriveCapabilityTags(fit);
  const slots = listAssetSlots(opId).filter((slot) => slot.rsvpEntryId === rsvpEntryId);
  if (!slots.length) throw new Error(`No asset slots found for RSVP entry ${rsvpEntryId}`);

  const updatedSlots = slots.map((slot) =>
    updateAssetSlot(
      slot.id,
      {
        fitProfileId,
        capabilitySnapshot: {
          ...slot.capabilitySnapshot,
          tags: dedupeTags([...(slot.capabilitySnapshot.tags || []), ...derived.capabilityTags]),
        },
      },
      nowMs
    )
  );

  return {
    updatedSlots,
    warnings: [...derived.warnings, ...fit.validation.patchMismatchWarnings],
    citations: [
      { kind: 'fit_profile', id: fitProfileId },
      { kind: 'rsvp_entry', id: rsvpEntryId },
      ...updatedSlots.map((slot) => ({ kind: 'asset_slot' as const, id: slot.id })),
    ],
  };
}

export function attachFitProfileToAssetSlot(
  opId: string,
  assetSlotId: string,
  fitProfileId: string,
  actorId: string,
  nowMs = Date.now()
): FitAttachmentResult {
  const normalizedActor = String(actorId || '').trim();
  if (!normalizedActor) throw new Error('attachFitProfileToAssetSlot requires actorId');
  const slot = listAssetSlots(opId).find((entry) => entry.id === assetSlotId);
  if (!slot) throw new Error(`Asset slot ${assetSlotId} not found for op ${opId}`);
  const ownerRsvp = listRSVPEntries(opId).find((entry) => entry.id === slot.rsvpEntryId) || null;
  const isOwner = ownerRsvp?.userId === normalizedActor;
  const managePermission = canManageOperation(opId, normalizedActor);
  if (!isOwner && !managePermission.allowed) {
    throw new Error('Fit attachment denied: requires slot ownership or operation command permission.');
  }
  return attachFitProfileToRSVP(opId, slot.rsvpEntryId, fitProfileId, nowMs);
}

export function importLink(kind: SourceRefKind, url: string): FitSourceRef {
  // Metadata-only source reference. No scraping performed in Nexus OS core.
  return createSourceRef(kind, url);
}

export function subscribeFitProfiles(listener: FitProfileListener): () => void {
  fitProfileListeners.add(listener);
  return () => fitProfileListeners.delete(listener);
}

export function resetFitProfileServiceState() {
  fitProfileStore = [];
  notifyListeners();
}
