import { useEffect, useMemo, useState } from 'react';
import { resolveMotionDuration } from '../motion';

export type NexusBootMode = 'cold' | 'resume';
export type NexusBootPhase = 'power_on' | 'self_check' | 'workspace_restore' | 'ready';

export interface NexusBootStep {
  phase: NexusBootPhase;
  label: string;
  durationMs: number;
}

export interface NexusBootPlan {
  mode: NexusBootMode;
  steps: NexusBootStep[];
}

export interface NexusBootState {
  mode: NexusBootMode;
  phase: NexusBootPhase;
  label: string;
  progress: number;
  visible: boolean;
  isReady: boolean;
}

const RESUME_WINDOW_MS = 1000 * 60 * 45;
const MIN_OVERLAY_VISIBLE_MS = 260;

function normalizeDuration(ms: number, reducedMotion: boolean): number {
  const resolved = resolveMotionDuration(ms, reducedMotion);
  return reducedMotion ? Math.max(32, resolved) : resolved;
}

export function resolveBootMode(lastSessionUpdatedAt?: string | null, nowMs = Date.now()): NexusBootMode {
  if (!lastSessionUpdatedAt) return 'cold';
  const parsed = Date.parse(lastSessionUpdatedAt);
  if (!Number.isFinite(parsed)) return 'cold';
  return nowMs - parsed <= RESUME_WINDOW_MS ? 'resume' : 'cold';
}

export function buildBootPlan(mode: NexusBootMode, reducedMotion: boolean): NexusBootPlan {
  if (mode === 'resume') {
    return {
      mode,
      steps: [
        {
          phase: 'power_on',
          label: 'Re-linking command deck',
          durationMs: normalizeDuration(120, reducedMotion),
        },
        {
          phase: 'workspace_restore',
          label: 'Restoring workspace session',
          durationMs: normalizeDuration(180, reducedMotion),
        },
        {
          phase: 'ready',
          label: 'Workspace ready',
          durationMs: normalizeDuration(70, reducedMotion),
        },
      ],
    };
  }

  return {
    mode,
    steps: [
      {
        phase: 'power_on',
        label: 'Powering Nexus shell',
        durationMs: normalizeDuration(180, reducedMotion),
      },
      {
        phase: 'self_check',
        label: 'Verifying truth substrate',
        durationMs: normalizeDuration(220, reducedMotion),
      },
      {
        phase: 'workspace_restore',
        label: 'Mounting command workspace',
        durationMs: normalizeDuration(170, reducedMotion),
      },
      {
        phase: 'ready',
        label: 'Workspace ready',
        durationMs: normalizeDuration(80, reducedMotion),
      },
    ],
  };
}

export function useNexusBootStateMachine(input: {
  enabled: boolean;
  hydrated: boolean;
  reducedMotion: boolean;
  lastSessionUpdatedAt?: string | null;
}) {
  const mode = useMemo(
    () => resolveBootMode(input.lastSessionUpdatedAt),
    [input.lastSessionUpdatedAt]
  );
  const plan = useMemo(() => buildBootPlan(mode, input.reducedMotion), [mode, input.reducedMotion]);

  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!input.enabled || !input.hydrated) {
      setVisible(false);
      setStepIndex(plan.steps.length - 1);
      return;
    }

    let cancelled = false;
    let timerId = 0;
    const startedAt = Date.now();

    setVisible(true);
    setStepIndex(0);

    const runStep = (index: number) => {
      const step = plan.steps[index];
      if (!step) {
        const elapsed = Date.now() - startedAt;
        const remainingMs = Math.max(0, MIN_OVERLAY_VISIBLE_MS - elapsed);
        timerId = window.setTimeout(() => {
          if (cancelled) return;
          setVisible(false);
        }, remainingMs);
        return;
      }

      timerId = window.setTimeout(() => {
        if (cancelled) return;
        setStepIndex(index + 1);
        runStep(index + 1);
      }, step.durationMs);
    };

    runStep(0);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [input.enabled, input.hydrated, plan.steps]);

  const activeStep = plan.steps[Math.min(stepIndex, plan.steps.length - 1)];
  const safeProgress =
    plan.steps.length === 0 ? 1 : Math.min(1, Math.max(0.02, (Math.min(stepIndex + 1, plan.steps.length)) / plan.steps.length));

  const state: NexusBootState = {
    mode: plan.mode,
    phase: visible ? activeStep?.phase || 'ready' : 'ready',
    label: visible ? activeStep?.label || 'Booting Nexus OS' : 'Workspace ready',
    progress: visible ? safeProgress : 1,
    visible,
    isReady: !visible,
  };

  return state;
}
