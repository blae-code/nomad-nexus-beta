/**
 * Training Sandbox Schemas
 *
 * Doctrine:
 * - Simulation data must never be misrepresented as live operational truth.
 * - Rescue-first outcomes are primary success criteria.
 * - Training artifacts are auditable and versioned for iterative improvement.
 */

export type TrainingDifficulty = 'BASIC' | 'STANDARD' | 'ADVANCED' | 'ELITE';
export type TriggerSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SimulationSessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED';
export type TrainingResultOutcome = 'PASS' | 'PARTIAL' | 'FAIL';

/**
 * Scenario objective used for scoring and debrief.
 */
export interface TrainingObjective {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  rescueWeighted?: boolean;
  targetSeconds?: number;
}

/**
 * Timeline trigger that emits a simulation event at an offset from session start.
 */
export interface SimulationTrigger {
  id: string;
  timeOffsetSeconds: number;
  eventType: string;
  title: string;
  message: string;
  severity: TriggerSeverity;
  payload?: Record<string, unknown>;
  objectiveId?: string;
  requiresResponse?: boolean;
}

/**
 * Canonical training scenario definition.
 * `scriptVersion` allows iterative improvements without losing run history.
 */
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  narrativeContext?: string;
  difficulty: TrainingDifficulty;
  tags: string[];
  prerequisites?: string[];
  testedSopIds?: string[];
  objectives: TrainingObjective[];
  triggers: SimulationTrigger[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationTimelineEvent {
  id: string;
  sessionId: string;
  scenarioId: string;
  opId?: string;
  eventType: string;
  title: string;
  message: string;
  emittedAt: string;
  timeOffsetSeconds: number;
  severity: TriggerSeverity;
  isSimulation: true;
  payload?: Record<string, unknown>;
}

export interface SimulationSession {
  id: string;
  scenarioId: string;
  opId?: string;
  startedBy: string;
  startedAt: string;
  status: SimulationSessionStatus;
  pausedAt?: string;
  resumedAt?: string;
  stoppedAt?: string;
  elapsedSeconds: number;
  objectiveState: Record<string, { completed: boolean; completedAt?: string; note?: string }>;
  emittedEventIds: string[];
}

/**
 * Persisted training outcome for progression and debrief usage.
 */
export interface TrainingResult {
  id: string;
  sessionId: string;
  scenarioId: string;
  opId?: string;
  participants: string[];
  generatedAt: string;
  outcome: TrainingResultOutcome;
  score: number;
  rescueScore: number;
  objectiveSummary: Array<{
    objectiveId: string;
    completed: boolean;
    required: boolean;
    rescueWeighted?: boolean;
    completedAt?: string;
  }>;
  timelineSummary: Array<{
    eventType: string;
    emittedAt: string;
    severity: TriggerSeverity;
    title: string;
  }>;
  recommendations: string[];
  debriefNarrative: string;
  source: 'SIM_ENGINE_V1';
}

