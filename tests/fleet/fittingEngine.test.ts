import { describe, expect, it } from 'vitest';
import {
  FITTING_LIBRARY,
  applyScenarioModifiers,
  computeFitOutcome,
  createFitDraft,
  normalizeFitCommentEntry,
  normalizeFitPlanEntry,
  summarizeTeamFits,
} from '../../src/components/fleet/fittingEngine.js';

describe('fittingEngine', () => {
  it('creates a default draft and computes baseline outcome', () => {
    const draft = createFitDraft('ship');
    expect(draft.fitType).toBe('ship');
    const outcome = computeFitOutcome(draft, FITTING_LIBRARY);
    expect(outcome.template).toBeTruthy();
    expect(outcome.score).toBeGreaterThanOrEqual(0);
    expect(outcome.score).toBeLessThanOrEqual(100);
    expect(outcome.requiredCount).toBeGreaterThan(0);
  });

  it('applies module stat deltas and penalizes missing required slots', () => {
    const draft = createFitDraft('ship');
    draft.templateId = 'light_fighter';
    draft.slotAssignments = {
      nose_weapon: 'laser_repeaters',
      wing_weapon_l: 'laser_repeaters',
      wing_weapon_r: 'laser_repeaters',
      shield_gen: 'adaptive_shield',
      power_plant: 'balanced_core',
      utility_mount: 'ecm_suite',
    };
    const full = computeFitOutcome(draft, FITTING_LIBRARY);
    expect(full.missingRequiredSlots.length).toBe(0);

    const partial = computeFitOutcome({ ...draft, slotAssignments: { nose_weapon: 'laser_repeaters' } }, FITTING_LIBRARY);
    expect(partial.missingRequiredSlots.length).toBeGreaterThan(0);
    expect(partial.score).toBeLessThan(full.score);
  });

  it('normalizes plan/comment logs and summarizes team fit coverage', () => {
    const plan = normalizeFitPlanEntry({
      id: 'log-1',
      actor_member_profile_id: 'member-1',
      created_date: '2026-02-08T10:00:00.000Z',
      details: {
        fit_plan_id: 'fit-1',
        fit_type: 'vehicle',
        title: 'Convoy Spearhead',
        scope_type: 'wing',
        scope_id: 'wing-2',
        role_tag: 'assault',
        template_id: 'combat_rover',
        slot_assignments: { main_turret: 'autocannon' },
        score: 72,
        stats: { dps: 60, shield: 66, mobility: 50, utility: 45, sustain: 55 },
        version: 2,
      },
    });
    expect(plan?.fitPlanId).toBe('fit-1');
    expect(plan?.type).toBe('vehicle');
    expect(plan?.scopeType).toBe('wing');
    expect(plan?.version).toBe(2);

    const comment = normalizeFitCommentEntry({
      id: 'log-2',
      actor_member_profile_id: 'member-2',
      details: {
        fit_plan_id: 'fit-1',
        message: 'Swap to composite armor for escort duty.',
      },
    });
    expect(comment?.fitPlanId).toBe('fit-1');
    expect(comment?.message).toContain('composite');

    const summary = summarizeTeamFits([
      { type: 'vehicle', scopeType: 'wing', roleTag: 'assault', score: 72 },
      { type: 'ship', scopeType: 'squad', roleTag: 'interceptor', score: 81 },
      { type: 'fps', scopeType: 'squad', roleTag: 'medic', score: 69 },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.byType.vehicle).toBe(1);
    expect(summary.byScope.squad).toBe(2);
    expect(summary.avgScore).toBe(74);
  });

  it('applies scenario modifiers to stats and computes delta', () => {
    const result = applyScenarioModifiers(
      { dps: 60, shield: 55, mobility: 70, utility: 45, sustain: 50 },
      { threat: 85, travel: 75, attrition: 80 }
    );
    expect(result.sourceScore).toBe(56);
    expect(result.adjustedScore).toBeGreaterThan(result.sourceScore);
    expect(result.scoreDelta).toBeGreaterThan(0);
    expect(result.adjusted.mobility).toBeGreaterThanOrEqual(0);
    expect(result.adjusted.mobility).toBeLessThanOrEqual(100);
  });
});
