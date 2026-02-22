import { getNumberTokenAssetUrl, getNumberTokenVariantByState, tokenAssets } from '../tokens';

type CommsNodeType = 'channel' | 'team' | 'user';

function toToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function wingLabelByElement(element: string): string {
  if (element === 'CE') return 'Command Wing';
  if (element === 'ACE') return 'Aerospace Wing';
  return 'Ground Wing';
}

export function resolveSquadLabel(channelId: string, channelLabel: string): string {
  const token = `${toToken(channelId)} ${toToken(channelLabel)}`;
  if (token.includes('alpha')) return 'Squad Alpha';
  if (token.includes('bravo')) return 'Squad Bravo';
  if (token.includes('coord') || token.includes('command')) return 'Command Cell';
  if (token.includes('log')) return 'Logistics Cell';
  return 'Operations Cell';
}

export function operatorStatusTone(status: string): 'warning' | 'ok' | 'neutral' | 'danger' {
  if (status === 'TX') return 'warning';
  if (status === 'ON-NET') return 'ok';
  if (status === 'MUTED') return 'neutral';
  return 'danger';
}

export function operatorStatusTokenIcon(status: string): string {
  if (status === 'TX') return tokenAssets.comms.operatorStatus.tx;
  if (status === 'ON-NET') return tokenAssets.comms.operatorStatus.onNet;
  if (status === 'MUTED') return tokenAssets.comms.operatorStatus.muted;
  return tokenAssets.comms.operatorStatus.offNet;
}

export function vehicleStatusTone(status: string): 'danger' | 'warning' | 'active' | 'ok' {
  if (status === 'DEGRADED') return 'danger';
  if (status === 'ACTIVE') return 'warning';
  if (status === 'MIXED') return 'active';
  return 'ok';
}

export function vehicleStatusTokenIcon(status: string): string {
  if (status === 'DEGRADED') return tokenAssets.comms.vehicleStatus.degraded;
  if (status === 'ACTIVE') return tokenAssets.comms.vehicleStatus.active;
  if (status === 'MIXED') return tokenAssets.comms.vehicleStatus.mixed;
  return tokenAssets.comms.vehicleStatus.ready;
}

export function roleTokenIcon(role: string): string {
  const token = toToken(role);
  if (token.includes('lead') || token.includes('command') || token.includes('signal')) return tokenAssets.comms.role.command;
  if (token.includes('pilot') || token.includes('flight') || token.includes('gunship')) return tokenAssets.comms.role.flight;
  if (token.includes('medic') || token.includes('medical')) return tokenAssets.comms.role.medical;
  if (token.includes('log') || token.includes('maint') || token.includes('mech')) return tokenAssets.comms.role.support;
  return tokenAssets.comms.role.default;
}

export function topologyNodeTokenIcon(nodeType: CommsNodeType): string {
  if (nodeType === 'channel') return tokenAssets.comms.channel;
  if (nodeType === 'team') return tokenAssets.comms.vehicle;
  return tokenAssets.comms.role.default;
}

export function wingTokenIcon(wingId: string, state: string = ''): string {
  const variant = getNumberTokenVariantByState(state);
  if (wingId === 'CE') return getNumberTokenAssetUrl(1, 'yellow', { variant });
  if (wingId === 'ACE') return getNumberTokenAssetUrl(2, 'cyan', { variant });
  return getNumberTokenAssetUrl(3, 'green', { variant });
}

export function squadTokenIcon(label: string, state: string = ''): string {
  const token = toToken(label);
  const variant = getNumberTokenVariantByState(state);
  if (token.includes('alpha')) return getNumberTokenAssetUrl(1, 'yellow', { variant });
  if (token.includes('bravo')) return getNumberTokenAssetUrl(2, 'yellow', { variant });
  if (token.includes('command')) return tokenAssets.comms.role.command;
  if (token.includes('log')) return tokenAssets.comms.role.support;
  return tokenAssets.comms.role.default;
}

export function channelStatusTokenIcon(status: string): string {
  const token = toToken(status);
  if (token.includes('secure')) return getNumberTokenAssetUrl(9, 'purple', { variant: 'v1' });
  if (token.includes('saturated') || token.includes('degraded')) return tokenAssets.comms.vehicleStatus.degraded;
  if (token.includes('busy') || token.includes('active')) return tokenAssets.comms.vehicleStatus.active;
  if (token.includes('clear') || token.includes('ready')) return tokenAssets.comms.vehicleStatus.ready;
  if (token.includes('critical') || token.includes('jam')) return getNumberTokenAssetUrl(0, 'purple', { variant: 'v2' });
  return tokenAssets.comms.vehicleStatus.mixed;
}
