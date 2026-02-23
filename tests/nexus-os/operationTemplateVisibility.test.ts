import { beforeEach, describe, expect, it } from 'vitest';
import {
  createOperationTemplate,
  listOperationTemplates,
  resetOperationServiceState,
} from '../../src/components/nexus-os/services/operationService';

describe('operation template visibility', () => {
  beforeEach(() => {
    resetOperationServiceState();
  });

  it('filters templates by org scope while retaining creator visibility', () => {
    const tplA = createOperationTemplate({
      createdBy: 'user-a',
      name: 'Template A',
      blueprint: {
        name: 'Op A',
        hostOrgId: 'ORG-A',
      },
    });
    const tplB = createOperationTemplate({
      createdBy: 'user-b',
      name: 'Template B',
      blueprint: {
        name: 'Op B',
        hostOrgId: 'ORG-B',
      },
    });
    const tplInvited = createOperationTemplate({
      createdBy: 'user-c',
      name: 'Template Invited',
      blueprint: {
        name: 'Op C',
        hostOrgId: 'ORG-C',
        invitedOrgIds: ['ORG-A'],
      },
    });

    const orgA = listOperationTemplates({ orgId: 'ORG-A', userId: 'user-a' });
    expect(orgA.map((entry) => entry.id)).toEqual(expect.arrayContaining([tplA.id, tplInvited.id]));
    expect(orgA.map((entry) => entry.id)).not.toContain(tplB.id);

    const orgB = listOperationTemplates({ orgId: 'ORG-B', userId: 'user-a' });
    expect(orgB.map((entry) => entry.id)).toContain(tplB.id);
    // creator sees own template even when org filter differs
    expect(orgB.map((entry) => entry.id)).toContain(tplA.id);
  });

  it('supports creator-only filtering as before', () => {
    createOperationTemplate({
      createdBy: 'user-a',
      name: 'Template A1',
      blueprint: { name: 'Op A1', hostOrgId: 'ORG-A' },
    });
    createOperationTemplate({
      createdBy: 'user-b',
      name: 'Template B1',
      blueprint: { name: 'Op B1', hostOrgId: 'ORG-A' },
    });
    const onlyA = listOperationTemplates({ createdBy: 'user-a' });
    expect(onlyA.every((entry) => entry.createdBy === 'user-a')).toBe(true);
  });
});

