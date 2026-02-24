import type { CommsTemplateId } from '../../registries/commsTemplateRegistry';

export type FoundryWizardStep = 'ARCHETYPE' | 'IDENTITY' | 'SCENARIO' | 'FORCE' | 'COMMS' | 'READINESS' | 'REVIEW';
export type FoundryStepStatus = 'BLOCKED' | 'READY' | 'DONE';
export type FoundryQuickStartPreset = 'RAPID_DEPLOY' | 'DOCTRINE_LOCK' | 'TRAINING_LANE';

export const FOUNDRY_STEPS: FoundryWizardStep[] = ['ARCHETYPE', 'IDENTITY', 'SCENARIO', 'FORCE', 'COMMS', 'READINESS', 'REVIEW'];

export interface FoundryStepCompletionInput {
  ARCHETYPE: boolean;
  IDENTITY: boolean;
  SCENARIO: boolean;
  FORCE: boolean;
  COMMS: boolean;
  READINESS: boolean;
  REVIEW: boolean;
}

export interface FoundryReadinessGateDraft {
  label: string;
  ownerRole: string;
  required: boolean;
}

export interface FoundryQuickStartState {
  startInput: string;
  endInput: string;
  commsTemplateInput: CommsTemplateId;
  ttlProfileInput: string;
  gateRows: FoundryReadinessGateDraft[];
}

function localInputFromMs(ms: number): string {
  const d = new Date(ms);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function deriveFoundryStepStatuses(
  completion: FoundryStepCompletionInput
): Record<FoundryWizardStep, FoundryStepStatus> {
  const statuses = {} as Record<FoundryWizardStep, FoundryStepStatus>;
  let blockedByPrevious = false;
  for (const step of FOUNDRY_STEPS) {
    if (blockedByPrevious) {
      statuses[step] = 'BLOCKED';
      continue;
    }
    if (completion[step]) {
      statuses[step] = 'DONE';
      continue;
    }
    statuses[step] = 'READY';
    blockedByPrevious = true;
  }
  return statuses;
}

export function applyFoundryQuickStartPreset(
  preset: FoundryQuickStartPreset,
  state: FoundryQuickStartState,
  nowMs: number = Date.now()
): FoundryQuickStartState {
  if (preset === 'RAPID_DEPLOY') {
    return {
      ...state,
      startInput: localInputFromMs(nowMs + 30 * 60 * 1000),
      endInput: localInputFromMs(nowMs + 150 * 60 * 1000),
      commsTemplateInput: 'SQUAD_NETS',
      ttlProfileInput: 'TTL-OP-CASUAL',
      gateRows: state.gateRows.map((gate, index) => ({
        ...gate,
        required: index < 2 ? true : gate.required,
      })),
    };
  }

  if (preset === 'DOCTRINE_LOCK') {
    return {
      ...state,
      startInput: localInputFromMs(nowMs + 60 * 60 * 1000),
      endInput: localInputFromMs(nowMs + 180 * 60 * 1000),
      commsTemplateInput: 'COMMAND_NET',
      ttlProfileInput: 'TTL-OP-FOCUSED',
      gateRows: state.gateRows.map((gate) => ({
        ...gate,
        required: true,
      })),
    };
  }

  return {
    ...state,
    startInput: localInputFromMs(nowMs + 120 * 60 * 1000),
    endInput: localInputFromMs(nowMs + 240 * 60 * 1000),
    commsTemplateInput: 'FIRETEAM_PRIMARY',
    ttlProfileInput: 'TTL-OP-CASUAL',
    gateRows: state.gateRows.map((gate) => ({
      ...gate,
      required: false,
    })),
  };
}
