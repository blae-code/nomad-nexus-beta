import type { CqbEventType } from '../../schemas/coreSchemas';

export const BREVITY_LABELS: Partial<Record<CqbEventType, string>> = {
  KISS: 'KISS',
  ROGER: 'ROGER',
  STAND_BY: 'Stand by/Wait One',
  WILCO: 'WILCO',
  CLEAR_COMMS: 'Clear comms',
  SAY_AGAIN: 'Say again',
  ON_ME: 'On Me',
  MOVE_OUT: 'Move out/Step off',
  SET_SECURITY: 'Set security',
  HOLD: 'Hold',
  SELF_CHECK: 'Self check',
  WEAPON_DRY: 'weapon dry',
  SET: 'Set',
  GREEN: 'Green',
  RELOADING: 'Reloading',
  CROSSING: 'Crossing',
  CEASE_FIRE: 'cease fire',
  CHECK_FIRE: 'check fire',
};

export type MacroGroup = 'CONTROL' | 'ACK' | 'MOVEMENT' | 'SECURITY' | 'WEAPONS' | 'SAFETY' | 'TACTICAL';

export const BREVITY_GROUP_BY_EVENT: Partial<Record<CqbEventType, MacroGroup>> = {
  CLEAR_COMMS: 'CONTROL',
  SAY_AGAIN: 'CONTROL',
  STAND_BY: 'CONTROL',
  KISS: 'CONTROL',
  ROGER: 'ACK',
  WILCO: 'ACK',
  ON_ME: 'MOVEMENT',
  MOVE_OUT: 'MOVEMENT',
  HOLD: 'MOVEMENT',
  SET: 'MOVEMENT',
  GREEN: 'MOVEMENT',
  SET_SECURITY: 'SECURITY',
  SELF_CHECK: 'SECURITY',
  RELOADING: 'WEAPONS',
  WEAPON_DRY: 'WEAPONS',
  CEASE_FIRE: 'WEAPONS',
  CHECK_FIRE: 'WEAPONS',
  CROSSING: 'SAFETY',
};

export function getBrevityLabel(eventType: CqbEventType): string {
  return BREVITY_LABELS[eventType] || eventType.replace(/_/g, ' ');
}
