import { describe, expect, it } from 'vitest';
import { mapModeLayerDefaults } from '../../src/components/nexus-os/services/tacticalMapPreferenceService';
import {
  resolveTacticalMapDefaultMode,
  resolveTacticalMapShortcut,
  tacticalMapDockIdsForMode,
} from '../../src/components/nexus-os/services/tacticalMapInteractionService';

describe('tactical map progressive modes', () => {
  it('maps bridge defaults to progressive mode layers and dock tabs', () => {
    expect(resolveTacticalMapDefaultMode('COMMAND')).toBe('COMMAND');
    expect(resolveTacticalMapDefaultMode('OPS')).toBe('ESSENTIAL');

    expect(mapModeLayerDefaults('ESSENTIAL')).toEqual({
      presence: true,
      controlZones: true,
      ops: true,
      intel: false,
      comms: false,
      logistics: false,
    });
    expect(mapModeLayerDefaults('COMMAND')).toEqual({
      presence: true,
      controlZones: true,
      ops: true,
      intel: true,
      comms: true,
      logistics: false,
    });
    expect(mapModeLayerDefaults('FULL')).toEqual({
      presence: true,
      controlZones: true,
      ops: true,
      intel: true,
      comms: true,
      logistics: true,
    });

    expect(tacticalMapDockIdsForMode('ESSENTIAL')).toEqual(['SUMMARY', 'ACTIONS']);
    expect(tacticalMapDockIdsForMode('COMMAND')).toEqual(['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE']);
    expect(tacticalMapDockIdsForMode('FULL')).toEqual(['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE', 'LOGISTICS', 'TIMELINE']);
  });

  it('resolves keyboard shortcuts for progressive command tempo', () => {
    expect(resolveTacticalMapShortcut({ key: '1', mode: 'COMMAND' })).toEqual({ type: 'SET_MODE', mode: 'ESSENTIAL' });
    expect(resolveTacticalMapShortcut({ key: '2', mode: 'ESSENTIAL' })).toEqual({ type: 'SET_MODE', mode: 'COMMAND' });
    expect(resolveTacticalMapShortcut({ key: '3', mode: 'COMMAND' })).toEqual({ type: 'SET_MODE', mode: 'FULL' });
    expect(resolveTacticalMapShortcut({ key: '.', mode: 'COMMAND' })).toEqual({ type: 'OPEN_ACTIONS' });
    expect(resolveTacticalMapShortcut({ key: '[', mode: 'FULL' })).toEqual({ type: 'REPLAY_BACK' });
    expect(resolveTacticalMapShortcut({ key: ']', mode: 'FULL' })).toEqual({ type: 'REPLAY_FORWARD' });
    expect(resolveTacticalMapShortcut({ key: 'c', shiftKey: true, mode: 'COMMAND' })).toEqual({ type: 'EXECUTE_CRITICAL_CALLOUT' });
    expect(resolveTacticalMapShortcut({ key: 'c', shiftKey: true, mode: 'COMMAND', isFormTarget: true })).toEqual({ type: 'NONE' });
  });
});

