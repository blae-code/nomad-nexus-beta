import type { TacticalMapDockId, TacticalMapMode } from '../schemas/mapSchemas';

export type TacticalMapShortcutAction =
  | { type: 'SET_MODE'; mode: TacticalMapMode }
  | { type: 'OPEN_ACTIONS' }
  | { type: 'REPLAY_BACK' }
  | { type: 'REPLAY_FORWARD' }
  | { type: 'EXECUTE_CRITICAL_CALLOUT' }
  | { type: 'NONE' };

const MODE_DOCKS: Readonly<Record<TacticalMapMode, TacticalMapDockId[]>> = Object.freeze({
  ESSENTIAL: ['SUMMARY', 'ACTIONS'],
  COMMAND: ['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE'],
  FULL: ['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE', 'LOGISTICS', 'TIMELINE'],
});

export function resolveTacticalMapDefaultMode(bridgeId: string | undefined): TacticalMapMode {
  return String(bridgeId || '').trim().toUpperCase() === 'COMMAND' ? 'COMMAND' : 'ESSENTIAL';
}

export function tacticalMapDockIdsForMode(mode: TacticalMapMode): TacticalMapDockId[] {
  return [...MODE_DOCKS[mode]];
}

export function resolveTacticalMapShortcut(input: {
  key: string;
  shiftKey?: boolean;
  isFormTarget?: boolean;
  mode: TacticalMapMode;
}): TacticalMapShortcutAction {
  if (input.isFormTarget) return { type: 'NONE' };
  if (input.key === '1') return { type: 'SET_MODE', mode: 'ESSENTIAL' };
  if (input.key === '2') return { type: 'SET_MODE', mode: 'COMMAND' };
  if (input.key === '3') return { type: 'SET_MODE', mode: 'FULL' };
  if (input.key === '.') return { type: 'OPEN_ACTIONS' };
  if (input.key === '[' && input.mode === 'FULL') return { type: 'REPLAY_BACK' };
  if (input.key === ']' && input.mode === 'FULL') return { type: 'REPLAY_FORWARD' };
  if (input.shiftKey && input.key.toLowerCase() === 'c') return { type: 'EXECUTE_CRITICAL_CALLOUT' };
  return { type: 'NONE' };
}
