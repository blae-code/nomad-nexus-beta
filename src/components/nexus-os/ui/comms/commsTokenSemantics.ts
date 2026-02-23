import { getNumberTokenAssetUrl, getNumberTokenVariantByState, getTokenAssetUrl, tokenAssets } from '../tokens';
import type { OperationalRoleToken } from './commsSquadCardEnhancementRuntime';

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
  if (token.includes('lead') || token.includes('command')) return tokenAssets.comms.role.command;
  if (token.includes('signal') || token.includes('comms') || token.includes('radio')) return getTokenAssetUrl('hex', 'cyan');
  if (token.includes('pilot') || token.includes('flight') || token.includes('gunship')) return tokenAssets.comms.role.flight;
  if (token.includes('medic') || token.includes('medical')) return tokenAssets.comms.role.medical;
  if (token.includes('gunner') || token.includes('turret') || token.includes('weapons')) return getTokenAssetUrl('target', 'red');
  if (token.includes('engineer') || token.includes('mech') || token.includes('maint') || token.includes('tech')) return tokenAssets.comms.role.support;
  if (token.includes('cargo') || token.includes('log') || token.includes('hauler') || token.includes('load')) return getTokenAssetUrl('food', 'orange');
  return tokenAssets.comms.role.default;
}

export function operationalRoleTokenIcon(roleToken: OperationalRoleToken): string {
  if (roleToken === 'pilot') return tokenAssets.comms.role.flight;
  if (roleToken === 'squad_lead') return tokenAssets.comms.role.command;
  if (roleToken === 'medic') return tokenAssets.comms.role.medical;
  if (roleToken === 'gunner') return getTokenAssetUrl('target', 'red');
  if (roleToken === 'engineer') return tokenAssets.comms.role.support;
  if (roleToken === 'cargo') return getTokenAssetUrl('food', 'orange');
  if (roleToken === 'signal') return getTokenAssetUrl('hex', 'cyan');
  if (roleToken === 'command') return tokenAssets.comms.role.command;
  return tokenAssets.comms.role.default;
}

export function operationalRoleLabel(roleToken: OperationalRoleToken): string {
  if (roleToken === 'pilot') return 'Pilot';
  if (roleToken === 'squad_lead') return 'Lead';
  if (roleToken === 'medic') return 'Medic';
  if (roleToken === 'gunner') return 'Gunner';
  if (roleToken === 'engineer') return 'Engineer';
  if (roleToken === 'cargo') return 'Cargo';
  if (roleToken === 'signal') return 'Signal';
  if (roleToken === 'command') return 'Command';
  return 'Crew';
}

export type CommsCardActionToken =
  | 'HAIL_PILOT'
  | 'HAIL_MEDIC'
  | 'HAIL_SQUAD'
  | 'BRIDGE'
  | 'WATCHLIST'
  | 'ESCALATE';

export function commsActionTokenIcon(action: CommsCardActionToken, state = ''): string {
  const actionToken = toToken(action);
  const stateToken = toToken(state);
  if (actionToken === 'hail_pilot') return roleTokenIcon('pilot');
  if (actionToken === 'hail_medic') return roleTokenIcon('medic');
  if (actionToken === 'hail_squad') return tokenAssets.comms.channel;
  if (actionToken === 'bridge') {
    if (stateToken.includes('active') || stateToken.includes('bridged') || stateToken.includes('secure')) {
      return getNumberTokenAssetUrl(9, 'purple', { variant: 'v1' });
    }
    if (stateToken.includes('degrad') || stateToken.includes('split')) return tokenAssets.comms.vehicleStatus.degraded;
    return tokenAssets.comms.channel;
  }
  if (actionToken === 'watchlist') {
    return getTokenAssetUrl('objective', stateToken.includes('watch') || stateToken.includes('active') ? 'orange' : 'grey');
  }
  if (actionToken === 'escalate') return getTokenAssetUrl('triangle', 'red');
  return tokenAssets.comms.role.default;
}

export function orderStatusTokenIcon(status: string): string {
  const token = toToken(status);
  if (token.includes('ack')) return tokenAssets.comms.operatorStatus.onNet;
  if (token.includes('persist')) return getTokenAssetUrl('circle', 'cyan');
  if (token.includes('queue')) return tokenAssets.comms.operatorStatus.tx;
  return tokenAssets.comms.operatorStatus.muted;
}

interface DeliveryDispatchLike {
  channelId?: unknown;
  issuedAtMs?: unknown;
  dispatchId?: unknown;
}

function dispatchIssuedAtMs(entry: DeliveryDispatchLike | null | undefined): number {
  const issuedAtMs = Number(entry?.issuedAtMs || 0);
  return Number.isFinite(issuedAtMs) ? issuedAtMs : 0;
}

export function buildLatestDispatchByChannelId<T extends DeliveryDispatchLike>(dispatches: T[]): Record<string, T> {
  const byChannel: Record<string, T> = {};
  for (const dispatch of dispatches || []) {
    const channelId = String(dispatch?.channelId || '').trim();
    if (!channelId) continue;
    const current = byChannel[channelId];
    if (!current) {
      byChannel[channelId] = dispatch;
      continue;
    }

    const nextIssuedAt = dispatchIssuedAtMs(dispatch);
    const currentIssuedAt = dispatchIssuedAtMs(current);
    if (nextIssuedAt > currentIssuedAt) {
      byChannel[channelId] = dispatch;
      continue;
    }

    if (nextIssuedAt === currentIssuedAt) {
      const nextDispatchId = String(dispatch?.dispatchId || '');
      const currentDispatchId = String(current?.dispatchId || '');
      if (nextDispatchId > currentDispatchId) {
        byChannel[channelId] = dispatch;
      }
    }
  }
  return byChannel;
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
