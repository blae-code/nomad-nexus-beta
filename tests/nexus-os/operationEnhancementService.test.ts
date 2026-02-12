import { beforeEach, describe, expect, it } from 'vitest';
import {
  alignOperationEnhancementsToPosture,
  buildSeatDemands,
  computeOperationCandidateMatches,
  getOperationDoctrineProfile,
  getOperationMandateProfile,
  initializeOperationEnhancements,
  listOperationLeadAlerts,
  refreshOperationLeadAlerts,
  resetOperationEnhancementServiceState,
  setDoctrineSelection,
  upsertRoleMandate,
  upsertUserOperationPreference,
} from '../../src/nexus-os/services/operationEnhancementService';

describe('operationEnhancementService', () => {
  beforeEach(() => {
    resetOperationEnhancementServiceState();
  });

  it('initializes doctrine + mandate defaults and realigns on posture change', () => {
    const initialized = initializeOperationEnhancements('op-alpha', 'CASUAL', 'lead-1', 1_735_689_600_000);
    expect(initialized.doctrine.posture).toBe('CASUAL');
    expect(initialized.mandates.roleMandates.length).toBeGreaterThan(0);

    const aligned = alignOperationEnhancementsToPosture('op-alpha', 'FOCUSED', 'lead-1', 1_735_689_700_000);
    expect(aligned.doctrine.posture).toBe('FOCUSED');
    expect(aligned.mandates.roleMandates.some((mandate) => mandate.enforcement === 'HARD')).toBe(true);

    const profile = getOperationDoctrineProfile('op-alpha');
    expect(profile?.updatedBy).toBe('lead-1');
  });

  it('allows doctrine toggle + weight adjustments', () => {
    initializeOperationEnhancements('op-beta', 'FOCUSED', 'lead-2');
    const profile = getOperationDoctrineProfile('op-beta');
    const firstDoctrine = profile?.doctrineByLevel.INDIVIDUAL[0];
    expect(firstDoctrine).toBeTruthy();

    const updated = setDoctrineSelection(
      'op-beta',
      'INDIVIDUAL',
      String(firstDoctrine?.doctrineId),
      { enabled: false, weight: 0.35 },
      'lead-2'
    );
    const changed = updated.doctrineByLevel.INDIVIDUAL.find((entry) => entry.doctrineId === firstDoctrine?.doctrineId);
    expect(changed?.enabled).toBe(false);
    expect(changed?.weight).toBe(0.35);
  });

  it('scores preference-aligned users highest for demanded roles', () => {
    initializeOperationEnhancements('op-gamma', 'FOCUSED', 'lead-3');
    upsertUserOperationPreference({
      userId: 'user-gunner',
      preferredRoles: ['Gunner'],
      activityTags: ['turret', 'ship-combat'],
      postureAffinity: 'FOCUSED',
      notifyOptIn: true,
    });
    upsertUserOperationPreference({
      userId: 'user-medic',
      preferredRoles: ['Medic'],
      activityTags: ['triage'],
      postureAffinity: 'CASUAL',
      notifyOptIn: true,
    });

    const matches = computeOperationCandidateMatches({
      opId: 'op-gamma',
      posture: 'FOCUSED',
      demands: [{ role: 'Gunner', qty: 2, source: 'OPEN_SEAT' }],
      candidates: [
        { userId: 'user-gunner', role: 'Gunner', loadoutTags: ['ship-combat', 'comms'], availability: 'READY' },
        { userId: 'user-medic', role: 'Medic', loadoutTags: ['medical', 'comms'], availability: 'READY' },
      ],
    });

    expect(matches[0].userId).toBe('user-gunner');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('honors hard loadout mandates when matching candidates', () => {
    initializeOperationEnhancements('op-delta', 'FOCUSED', 'lead-4');
    upsertRoleMandate(
      'op-delta',
      {
        role: 'Gunner',
        minCount: 1,
        enforcement: 'HARD',
        requiredLoadoutTags: ['ship-combat'],
      },
      'lead-4'
    );

    const matches = computeOperationCandidateMatches({
      opId: 'op-delta',
      posture: 'FOCUSED',
      demands: [{ role: 'Gunner', qty: 1, source: 'ROLE_MANDATE' }],
      candidates: [
        { userId: 'user-a', role: 'Gunner', loadoutTags: ['ship-combat', 'comms'], availability: 'READY' },
        { userId: 'user-b', role: 'Gunner', loadoutTags: ['repair'], availability: 'READY' },
      ],
    });

    const blocked = matches.find((entry) => entry.userId === 'user-b');
    expect(blocked?.blockedByHardMandate).toBe(true);
  });

  it('builds lead alerts and filters notification recipients from preferences', () => {
    initializeOperationEnhancements('op-epsilon', 'FOCUSED', 'lead-5');
    upsertUserOperationPreference({
      userId: 'notify-me',
      preferredRoles: ['Pilot'],
      activityTags: ['escort'],
      postureAffinity: 'ANY',
      notifyOptIn: true,
    });
    upsertUserOperationPreference({
      userId: 'dont-notify',
      preferredRoles: ['Pilot'],
      activityTags: ['escort'],
      postureAffinity: 'ANY',
      notifyOptIn: false,
    });

    const demands = buildSeatDemands({
      openSeats: [{ roleNeeded: 'Pilot', openQty: 2 }],
      mandates: getOperationMandateProfile('op-epsilon'),
    });

    const alerts = refreshOperationLeadAlerts({
      opId: 'op-epsilon',
      posture: 'FOCUSED',
      demands,
      candidates: [
        { userId: 'notify-me', role: 'Pilot', loadoutTags: ['comms'], availability: 'READY' },
        { userId: 'dont-notify', role: 'Pilot', loadoutTags: ['comms'], availability: 'READY' },
      ],
      nowMs: 1_735_689_900_000,
    });

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].notifiedUserIds).toContain('notify-me');
    expect(alerts[0].notifiedUserIds).not.toContain('dont-notify');
    expect(listOperationLeadAlerts('op-epsilon').length).toBe(alerts.length);
  });
});

