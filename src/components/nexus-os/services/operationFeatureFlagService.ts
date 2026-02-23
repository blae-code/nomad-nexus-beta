const WIZARD_FLAG_KEY = 'nexus.os.flags.NX_OP_WIZARD_V2';
const EXECUTION_FLAG_KEY = 'nexus.os.flags.NX_OP_EXECUTION_BOARD_V2';
const SC47_PREVIEW_FLAG_KEY = 'nexus.os.flags.NX_OP_SC47_PREVIEW';
const EXPERIMENTAL_GAMEPLAY_FLAG_KEY = 'nexus.os.flags.NX_OP_EXPERIMENTAL_GAMEPLAY';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readBooleanFlag(key: string, fallback: boolean): boolean {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const token = raw.trim().toLowerCase();
    if (token === '1' || token === 'true' || token === 'yes' || token === 'on') return true;
    if (token === '0' || token === 'false' || token === 'no' || token === 'off') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeBooleanFlag(key: string, value: boolean) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // best effort only
  }
}

export function isOperationWizardV2Enabled(): boolean {
  return readBooleanFlag(WIZARD_FLAG_KEY, true);
}

export function setOperationWizardV2Enabled(enabled: boolean) {
  writeBooleanFlag(WIZARD_FLAG_KEY, enabled);
}

export function isOperationExecutionBoardV2Enabled(): boolean {
  return readBooleanFlag(EXECUTION_FLAG_KEY, true);
}

export function setOperationExecutionBoardV2Enabled(enabled: boolean) {
  writeBooleanFlag(EXECUTION_FLAG_KEY, enabled);
}

export function isOperationSc47PreviewEnabled(): boolean {
  return readBooleanFlag(SC47_PREVIEW_FLAG_KEY, true);
}

export function setOperationSc47PreviewEnabled(enabled: boolean) {
  writeBooleanFlag(SC47_PREVIEW_FLAG_KEY, enabled);
}

export function isOperationExperimentalGameplayEnabled(): boolean {
  return readBooleanFlag(EXPERIMENTAL_GAMEPLAY_FLAG_KEY, false);
}

export function setOperationExperimentalGameplayEnabled(enabled: boolean) {
  writeBooleanFlag(EXPERIMENTAL_GAMEPLAY_FLAG_KEY, enabled);
}
