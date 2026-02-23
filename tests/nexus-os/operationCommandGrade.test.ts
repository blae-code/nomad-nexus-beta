import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyCommsTemplate,
  cloneOperation,
  createOperation,
  createOperationTemplateFromOperation,
  instantiateOperationFromTemplate,
  listOperationAuditEvents,
  listOperationTemplates,
  resetOperationServiceState,
  setPosture,
  updateOperation,
  updateStatus,
} from '../../src/components/nexus-os/services/operationService';

describe('operation service command-grade workflows', () => {
  beforeEach(() => {
    resetOperationServiceState();
  });

  it('creates templates from operations and instantiates operations from templates', () => {
    const source = createOperation({
      createdBy: 'cmd-lead',
      name: 'Convoy Hammer',
      posture: 'FOCUSED',
      status: 'ACTIVE',
      classification: 'ALLIED',
      ao: { nodeId: 'system-pyro', note: 'Push convoy through corridor.' },
      archetypeId: 'PVP_ORG_V_ORG',
      releaseTrack: 'PREVIEW_4_7',
      schedule: {
        plannedStartAt: '2026-03-01T10:00:00.000Z',
        plannedEndAt: '2026-03-01T12:00:00.000Z',
        timezone: 'UTC',
      },
      readinessGates: [
        {
          id: 'gate_1',
          label: 'ROE Confirmed',
          ownerRole: 'Commander',
          required: true,
          status: 'READY',
          note: '',
          updatedAt: '2026-03-01T09:00:00.000Z',
          updatedBy: 'cmd-lead',
        },
      ],
    });

    const template = createOperationTemplateFromOperation(source.id, 'cmd-lead', {
      name: 'Convoy Hammer Template',
      description: 'Focused convoy pressure pattern.',
    });

    const instantiated = instantiateOperationFromTemplate(template.id, {
      createdBy: 'cmd-lead',
      name: 'Convoy Hammer Bravo',
    });

    expect(listOperationTemplates().length).toBe(1);
    expect(instantiated.id).not.toBe(source.id);
    expect(instantiated.name).toBe('Convoy Hammer Bravo');
    expect(instantiated.posture).toBe('FOCUSED');
    expect(instantiated.classification).toBe('ALLIED');
    expect(instantiated.ao.nodeId).toBe('system-pyro');
    expect(instantiated.archetypeId).toBe('PVP_ORG_V_ORG');
    expect(instantiated.releaseTrack).toBe('PREVIEW_4_7');
    expect(instantiated.schedule?.timezone).toBe('UTC');
    expect(instantiated.readinessGates?.length).toBe(1);
  });

  it('clones operations and records directional clone audit events', () => {
    const source = createOperation({
      createdBy: 'ce-warden',
      name: 'Strike Net',
      posture: 'FOCUSED',
      status: 'ACTIVE',
      ao: { nodeId: 'system-stanton' },
    });

    const clone = cloneOperation(source.id, { createdBy: 'ce-warden', name: 'Strike Net Clone' });
    const sourceAudit = listOperationAuditEvents(source.id);
    const cloneAudit = listOperationAuditEvents(clone.id);

    expect(clone.id).not.toBe(source.id);
    expect(clone.status).toBe('PLANNING');
    expect(sourceAudit.some((entry) => entry.action === 'OP_CLONED_TO')).toBe(true);
    expect(cloneAudit.some((entry) => entry.action === 'OP_CLONED_FROM')).toBe(true);
  });

  it('writes audit records for metadata and lifecycle mutations', () => {
    const op = createOperation({
      createdBy: 'gce-raven',
      name: 'Escort Matrix',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    updateOperation(op.id, { name: 'Escort Matrix Prime', ao: { nodeId: 'system-pyro' } }, 'gce-raven');
    updateStatus(op.id, 'ACTIVE', 'gce-raven');
    setPosture(op.id, 'FOCUSED', 'gce-raven');
    applyCommsTemplate(op.id, 'COMMAND_NET', 'gce-raven');

    const actions = listOperationAuditEvents(op.id).map((entry) => entry.action);
    expect(actions).toContain('OP_METADATA_UPDATED');
    expect(actions).toContain('OP_STATUS_UPDATED');
    expect(actions).toContain('OP_POSTURE_UPDATED');
    expect(actions).toContain('OP_COMMS_TEMPLATE_APPLIED');
  });
});

