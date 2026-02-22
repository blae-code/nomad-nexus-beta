import { describe, expect, it } from 'vitest';
import {
  channelStatusTokenIcon,
  operatorStatusTokenIcon,
  operatorStatusTone,
  roleTokenIcon,
  squadTokenIcon,
  vehicleStatusTokenIcon,
  vehicleStatusTone,
  wingTokenIcon,
} from '../../src/components/nexus-os/ui/comms/commsTokenSemantics';

describe('commsTokenSemantics', () => {
  it('maps operator statuses to stable tones and icons', () => {
    expect(operatorStatusTone('TX')).toBe('warning');
    expect(operatorStatusTone('ON-NET')).toBe('ok');
    expect(operatorStatusTokenIcon('MUTED')).toContain('token-circle-grey.png');
  });

  it('maps vehicle and channel states to deterministic iconography', () => {
    expect(vehicleStatusTone('DEGRADED')).toBe('danger');
    expect(vehicleStatusTokenIcon('READY')).toContain('token-target-alt-green.png');
    expect(channelStatusTokenIcon('secure lane')).toContain('token-number-9-purple-1.png');
    expect(channelStatusTokenIcon('critical jam')).toContain('token-number-0-purple-2.png');
  });

  it('maps role and formation markers with optional state variants', () => {
    expect(roleTokenIcon('Medic')).toContain('token-hospital-green.png');
    expect(wingTokenIcon('CE', 'secure')).toContain('token-number-1-yellow.png');
    expect(squadTokenIcon('Squad Alpha', 'critical')).toContain('token-number-1-yellow.png');
  });
});
