export type OperationCommandMetricId =
  | 'READINESS'
  | 'FORCE_FILL'
  | 'POLICY_HEALTH'
  | 'EXECUTION_PROGRESS'
  | 'DECISION_DEBT'
  | 'TIMELINE_PRESSURE'
  | 'ORDER_DISCIPLINE'
  | 'COMMAND_LOAD';

export type OperationMetricTone = 'ok' | 'active' | 'warning' | 'danger';

export interface OperationCommandMetric {
  id: OperationCommandMetricId;
  label: string;
  valueText: string;
  detail: string;
  pressure: number;
  tone: OperationMetricTone;
}

export interface OperationCommandGridSnapshot {
  generatedAtMs: number;
  metrics: OperationCommandMetric[];
  overallTone: OperationMetricTone;
  overallPressure: number;
}

export interface OperationCommandGridInput {
  requiredReady: number;
  requiredTotal: number;
  activeEntries: number;
  openSeats: number;
  hardViolations: number;
  softFlags: number;
  phasesDone: number;
  phasesTotal: number;
  tasksDone: number;
  tasksTotal: number;
  challengedAssumptions: number;
  unreadThreadReplies: number;
  timelineHighSeverityCount: number;
  orderAcked: number;
  orderPersisted: number;
  leadAlertsHighSeverity: number;
  leadAlertsTotal: number;
  unresolvedIncidentEquivalent?: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeRatio(numerator: number, denominator: number, emptyFallback = 1): number {
  if (denominator <= 0) return emptyFallback;
  return clamp01(numerator / denominator);
}

export function operationMetricTone(pressure: number): OperationMetricTone {
  const normalized = clamp01(pressure);
  if (normalized <= 0.2) return 'ok';
  if (normalized <= 0.45) return 'active';
  if (normalized <= 0.72) return 'warning';
  return 'danger';
}

function metric(
  id: OperationCommandMetricId,
  label: string,
  valueText: string,
  detail: string,
  pressure: number
): OperationCommandMetric {
  const normalizedPressure = clamp01(pressure);
  return {
    id,
    label,
    valueText,
    detail,
    pressure: normalizedPressure,
    tone: operationMetricTone(normalizedPressure),
  };
}

export function buildOperationCommandGridSnapshot(
  input: OperationCommandGridInput,
  nowMs: number = Date.now()
): OperationCommandGridSnapshot {
  const readinessRatio = safeRatio(input.requiredReady, input.requiredTotal, 1);
  const readinessPressure = 1 - readinessRatio;

  const requiredForceCount = Math.max(0, input.activeEntries + input.openSeats);
  const forceFillRatio = safeRatio(input.activeEntries, requiredForceCount, 1);
  const forceFillPressure = 1 - forceFillRatio;

  const violationNumerator = Math.max(0, input.hardViolations) + Math.max(0, input.softFlags) * 0.45;
  const violationDenominator = Math.max(3, input.hardViolations + input.softFlags + 2);
  const policyPressure = clamp01(violationNumerator / violationDenominator);

  const executionDone = Math.max(0, input.phasesDone + input.tasksDone);
  const executionTotal = Math.max(0, input.phasesTotal + input.tasksTotal);
  const executionProgressRatio = safeRatio(executionDone, executionTotal, 1);
  const executionPressure = 1 - executionProgressRatio;

  const decisionDebtCount = Math.max(0, input.challengedAssumptions + input.unreadThreadReplies);
  const decisionDebtPressure = clamp01(decisionDebtCount / 8);

  const timelinePressure = clamp01(Math.max(0, input.timelineHighSeverityCount) / 6);

  const totalOrders = Math.max(0, input.orderAcked + input.orderPersisted);
  const ackRatio = safeRatio(input.orderAcked, totalOrders, 1);
  const orderDisciplinePressure = totalOrders === 0 ? 0.25 : 1 - ackRatio;

  const alertPressure = clamp01((Math.max(0, input.leadAlertsHighSeverity) * 1.25 + Math.max(0, input.leadAlertsTotal) * 0.2) / 6);
  const incidentPressure = clamp01(Math.max(0, input.unresolvedIncidentEquivalent || 0) / 4);
  const commandLoadPressure = clamp01(
    policyPressure * 0.28 +
      timelinePressure * 0.18 +
      decisionDebtPressure * 0.16 +
      alertPressure * 0.18 +
      incidentPressure * 0.1 +
      readinessPressure * 0.1
  );

  const metrics: OperationCommandMetric[] = [
    metric('READINESS', 'Readiness', `${input.requiredReady}/${input.requiredTotal}`, 'Required gates ready', readinessPressure),
    metric('FORCE_FILL', 'Force Fill', `${Math.round(forceFillRatio * 100)}%`, `${input.activeEntries} active / ${requiredForceCount} needed`, forceFillPressure),
    metric('POLICY_HEALTH', 'Policy Health', `${input.hardViolations}H · ${input.softFlags}S`, 'Hard/soft requirement pressure', policyPressure),
    metric(
      'EXECUTION_PROGRESS',
      'Execution',
      `${Math.round(executionProgressRatio * 100)}%`,
      `${executionDone} completed / ${executionTotal} total`,
      executionPressure
    ),
    metric('DECISION_DEBT', 'Decision Debt', String(decisionDebtCount), 'Challenged assumptions + unread replies', decisionDebtPressure),
    metric('TIMELINE_PRESSURE', 'Timeline Pressure', String(input.timelineHighSeverityCount), 'High-severity timeline signals', timelinePressure),
    metric(
      'ORDER_DISCIPLINE',
      'Order Discipline',
      totalOrders === 0 ? 'No directives' : `${Math.round(ackRatio * 100)}% ACK`,
      `${input.orderAcked} acked / ${totalOrders} directives`,
      orderDisciplinePressure
    ),
    metric(
      'COMMAND_LOAD',
      'Command Load',
      `${Math.round(commandLoadPressure * 100)}%`,
      `${input.leadAlertsHighSeverity} high alerts · ${input.unresolvedIncidentEquivalent || 0} incident eq`,
      commandLoadPressure
    ),
  ];

  return {
    generatedAtMs: nowMs,
    metrics,
    overallPressure: commandLoadPressure,
    overallTone: operationMetricTone(commandLoadPressure),
  };
}
