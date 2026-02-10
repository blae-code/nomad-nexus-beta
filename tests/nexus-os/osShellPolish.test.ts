import { describe, expect, it } from 'vitest';
import { buildBootPlan, resolveBootMode } from '../../src/nexus-os/ui/os/bootStateMachine';
import { resolveLifecycleThrottleMs, shouldRunLifecycleWork } from '../../src/nexus-os/ui/os/backgroundPerformance';

describe('Nexus OS shell polish primitives', () => {
  it('resolves boot mode from session recency', () => {
    const now = Date.UTC(2026, 1, 9, 12, 0, 0);
    const freshSession = new Date(now - 5 * 60 * 1000).toISOString();
    const staleSession = new Date(now - 2 * 60 * 60 * 1000).toISOString();

    expect(resolveBootMode(freshSession, now)).toBe('resume');
    expect(resolveBootMode(staleSession, now)).toBe('cold');
    expect(resolveBootMode(undefined, now)).toBe('cold');
  });

  it('builds deterministic boot plans for cold and resume flows', () => {
    const cold = buildBootPlan('cold', false);
    const resume = buildBootPlan('resume', false);

    expect(cold.steps.map((entry) => entry.phase)).toEqual([
      'power_on',
      'self_check',
      'workspace_restore',
      'ready',
    ]);
    expect(resume.steps.map((entry) => entry.phase)).toEqual([
      'power_on',
      'workspace_restore',
      'ready',
    ]);
  });

  it('applies lifecycle-aware throttling and execution guards', () => {
    expect(resolveLifecycleThrottleMs(60000, 'foreground')).toBe(60000);
    expect(resolveLifecycleThrottleMs(60000, 'background')).toBe(150000);
    expect(resolveLifecycleThrottleMs(60000, 'suspended')).toBe(360000);

    expect(shouldRunLifecycleWork('foreground')).toBe(true);
    expect(shouldRunLifecycleWork('background')).toBe(true);
    expect(shouldRunLifecycleWork('suspended')).toBe(false);
    expect(shouldRunLifecycleWork('closed')).toBe(false);
  });
});
