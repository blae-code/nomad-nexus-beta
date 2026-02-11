import { describe, expect, it } from 'vitest';
import { parseCqbVoiceCommand } from '../../src/nexus-os/services/cqbVoiceCommandService';

describe('cqbVoiceCommandService', () => {
  it('maps canonical brevity phrase to CQB macro event', () => {
    const result = parseCqbVoiceCommand('CQB-01', 'Set security 360 now');
    expect(result.status).toBe('MATCHED');
    expect(result.eventType).toBe('SET_SECURITY');
    expect(result.payload.coverage360).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('extracts directional payload from contact callouts', () => {
    const result = parseCqbVoiceCommand('CQB-02', 'Contact front two hostiles');
    expect(result.status).toBe('MATCHED');
    expect(result.eventType).toBe('CONTACT');
    expect(result.payload.direction).toBe('front');
    expect(result.payload.count).toBe(2);
  });

  it('returns suggestions when command cannot be parsed', () => {
    const result = parseCqbVoiceCommand('CQB-03', 'blueberry pancake protocol');
    expect(result.status).toBe('UNRECOGNIZED');
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    expect(result.reason).toContain('No known CQB brevity phrase');
  });
});
