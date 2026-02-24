import type { OperationPosture } from '../../schemas/opSchemas';
import { getTokenAssetUrl, tokenAssets } from '../tokens/tokenAssetMap';
import type { OperationCommandMetricId, OperationMetricTone } from './operationCommandGridRuntime';
import type { FoundryStepStatus } from './operationFoundryRuntime';

function toneColor(tone: OperationMetricTone): 'green' | 'cyan' | 'orange' | 'red' {
  if (tone === 'ok') return 'green';
  if (tone === 'active') return 'cyan';
  if (tone === 'warning') return 'orange';
  return 'red';
}

export function operationMetricTokenIcon(metricId: OperationCommandMetricId, tone: OperationMetricTone): string {
  const color = toneColor(tone);
  if (metricId === 'READINESS') return getTokenAssetUrl('target', color);
  if (metricId === 'FORCE_FILL') return getTokenAssetUrl('circle', color);
  if (metricId === 'POLICY_HEALTH') return getTokenAssetUrl('triangle', color);
  if (metricId === 'EXECUTION_PROGRESS') return getTokenAssetUrl('hex', color);
  if (metricId === 'DECISION_DEBT') return getTokenAssetUrl('objective', color);
  if (metricId === 'TIMELINE_PRESSURE') return getTokenAssetUrl('penta', color);
  if (metricId === 'ORDER_DISCIPLINE') return getTokenAssetUrl('square', color);
  return getTokenAssetUrl('target-alt', color);
}

export function foundryStepStatusTokenIcon(status: FoundryStepStatus): string {
  if (status === 'DONE') return getTokenAssetUrl('circle', 'green');
  if (status === 'READY') return getTokenAssetUrl('circle', 'yellow');
  return getTokenAssetUrl('circle', 'red');
}

export function operationPostureTokenIcon(posture: OperationPosture): string {
  if (posture === 'FOCUSED') return getTokenAssetUrl('target-alt', 'orange');
  return getTokenAssetUrl('circle', 'cyan');
}

export function operationRiskBandTokenIcon(riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'N/A'): string {
  if (riskBand === 'LOW') return getTokenAssetUrl('triangle', 'green');
  if (riskBand === 'MEDIUM') return getTokenAssetUrl('triangle', 'orange');
  if (riskBand === 'HIGH') return getTokenAssetUrl('triangle', 'red');
  return getTokenAssetUrl('triangle', 'grey');
}

export function operationStatusTokenIcon(status: string): string {
  const token = String(status || '').trim().toUpperCase();
  if (token === 'PLANNING') return tokenAssets.ops.status.planning;
  if (token === 'ACTIVE') return tokenAssets.ops.status.active;
  if (token === 'WRAPPING') return tokenAssets.ops.status.wrapping;
  return tokenAssets.ops.status.archived;
}
