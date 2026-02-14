import { describe, expect, it } from 'vitest';
import { deriveOperationStagePolicy } from '../../src/components/nexus-os/ui/ops/stagePolicy';
import type { Operation } from '../../src/components/nexus-os/schemas/opSchemas';

function makeOperation(status: Operation['status']): Operation {
  return {
    id: 'op-1',
    name: 'Policy Test Op',
    posture: 'FOCUSED',
    status,
    domains: { fps: true, ground: true, airSpace: false, logistics: true },
    createdBy: 'owner-1',
    createdAt: '2026-02-11T00:00:00.000Z',
    updatedAt: '2026-02-11T00:00:00.000Z',
    ao: { nodeId: 'system-stanton' },
    commsTemplateId: 'COMMAND_NET',
    ttlProfileId: 'TTL-OP-FOCUSED',
    permissions: {
      ownerIds: ['owner-1'],
      commanderIds: ['cmd-1'],
      participantIds: ['owner-1', 'cmd-1', 'member-1'],
    },
  };
}

describe('stagePolicy', () => {
  it('keeps planning editable for participants and lifecycle controls for command', () => {
    const planning = makeOperation('PLANNING');
    const participantPolicy = deriveOperationStagePolicy(planning, 'member-1');
    const commandPolicy = deriveOperationStagePolicy(planning, 'cmd-1');

    expect(participantPolicy.canEditPlan).toBe(true);
    expect(participantPolicy.canEditRequirements).toBe(true);
    expect(participantPolicy.canChangeLifecycle).toBe(false);

    expect(commandPolicy.canChangeLifecycle).toBe(true);
    expect(commandPolicy.isCommandRole).toBe(true);
  });

  it('locks active planning edits for non-command but allows command override', () => {
    const active = makeOperation('ACTIVE');
    const participantPolicy = deriveOperationStagePolicy(active, 'member-1');
    const commandPolicy = deriveOperationStagePolicy(active, 'owner-1');

    expect(participantPolicy.canEditPlan).toBe(false);
    expect(participantPolicy.canEditRequirements).toBe(false);
    expect(participantPolicy.canManageRoster).toBe(true);

    expect(commandPolicy.canEditPlan).toBe(true);
    expect(commandPolicy.canEditRequirements).toBe(true);
  });

  it('marks archived operations fully read-only', () => {
    const archived = makeOperation('ARCHIVED');
    const policy = deriveOperationStagePolicy(archived, 'owner-1');

    expect(policy.canEditPlan).toBe(false);
    expect(policy.canEditRequirements).toBe(false);
    expect(policy.canManageRoster).toBe(false);
    expect(policy.canPostComms).toBe(false);
    expect(policy.canChangeLifecycle).toBe(false);
  });
});


