import { beforeEach, describe, expect, it } from 'vitest';
import {
  canActivateOperation,
  canControlLifecycle,
  canCreateOperation,
  deriveBaseOperationRoleView,
  evaluateReadinessGates,
  resolveOperationRoleView,
} from '../../src/components/nexus-os/services/operationAuthorityService';
import { createOperation, resetOperationServiceState } from '../../src/components/nexus-os/services/operationService';

describe('operationAuthorityService', () => {
  beforeEach(() => {
    resetOperationServiceState();
  });

  it('enforces create threshold at SCOUT+ unless override roles apply', () => {
    expect(canCreateOperation({ actorId: 'pilot-1', rank: 'VAGRANT', roles: [] }).allowed).toBe(false);
    expect(canCreateOperation({ actorId: 'pilot-2', rank: 'SCOUT', roles: [] }).allowed).toBe(true);
    expect(canCreateOperation({ actorId: 'pilot-3', rank: 'VAGRANT', roles: ['operations'] }).allowed).toBe(true);
  });

  it('allows lifecycle control by command authority, rank, or override role', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Authority Check',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      permissions: {
        commanderIds: ['cmd-1'],
      },
    });

    expect(canControlLifecycle({ actorId: 'cmd-1', rank: 'VAGRANT' }, op).allowed).toBe(true);
    expect(canControlLifecycle({ actorId: 'rank-1', rank: 'SCOUT' }, op).allowed).toBe(true);
    expect(canControlLifecycle({ actorId: 'ops-1', rank: 'VAGRANT', roles: ['operations'] }, op).allowed).toBe(true);
    expect(canControlLifecycle({ actorId: 'guest-1', rank: 'VAGRANT', roles: [] }, op).allowed).toBe(false);
  });

  it('derives role views and allows only lower-privilege previews', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Role View Check',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    expect(deriveBaseOperationRoleView({ actorId: 'owner-1', rank: 'VAGRANT' }, op)).toBe('COMMAND');
    expect(deriveBaseOperationRoleView({ actorId: 'lead-1', rank: 'VAGRANT', roles: ['squad_lead'] }, op)).toBe('LEAD');
    expect(deriveBaseOperationRoleView({ actorId: 'member-1', rank: 'VAGRANT', roles: [] }, op)).toBe('PARTICIPANT');

    const commandPreview = resolveOperationRoleView({
      context: { actorId: 'owner-1', rank: 'VAGRANT' },
      operation: op,
      previewRoleView: 'PARTICIPANT',
    });
    expect(commandPreview.roleView).toBe('PARTICIPANT');
    expect(commandPreview.previewApplied).toBe(true);

    const participantPreview = resolveOperationRoleView({
      context: { actorId: 'member-1', rank: 'VAGRANT', roles: [] },
      operation: op,
      previewRoleView: 'COMMAND',
    });
    expect(participantPreview.roleView).toBe('PARTICIPANT');
    expect(participantPreview.previewApplied).toBe(false);
  });

  it('blocks activation with incomplete required readiness gates unless override reason exists', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Gate Check',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      readinessGates: [
        {
          id: 'gate_1',
          label: 'Route Confirmed',
          ownerRole: 'Logistics Lead',
          required: true,
          status: 'PENDING',
          note: '',
          updatedAt: new Date().toISOString(),
          updatedBy: 'owner-1',
        },
      ],
    });

    const evalResult = evaluateReadinessGates(op.readinessGates);
    expect(evalResult.ready).toBe(false);

    const blocked = canActivateOperation({ actorId: 'owner-1', rank: 'SCOUT' }, op);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/override/i);

    const overridden = canActivateOperation({ actorId: 'owner-1', rank: 'SCOUT' }, op, 'Command override for training lane');
    expect(overridden.allowed).toBe(true);
  });
});

