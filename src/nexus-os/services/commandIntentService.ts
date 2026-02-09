/**
 * Command Intent Service (scaffold)
 *
 * Minimal authority validation + intent creation.
 * TODO: wire to member role graph and org policy registry.
 */

import type { AuthorityLevel, CommandIntent, CommandScope } from '../schemas/coreSchemas';

export type CommandIntentCreateInput = Omit<CommandIntent, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

const AUTHORITY_ORDER: AuthorityLevel[] = ['FIRETEAM', 'SQUAD', 'WING', 'COMMAND', 'ORG'];

const MIN_AUTHORITY_BY_SCOPE: Record<CommandScope, AuthorityLevel> = {
  user: 'FIRETEAM',
  squad: 'SQUAD',
  wing: 'WING',
  op: 'COMMAND',
  org: 'ORG',
};

function createIntentId(now = Date.now()): string {
  return `intent_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

export function hasRequiredAuthority(scope: CommandScope, authorityLevel: AuthorityLevel): boolean {
  const needed = AUTHORITY_ORDER.indexOf(MIN_AUTHORITY_BY_SCOPE[scope]);
  const actual = AUTHORITY_ORDER.indexOf(authorityLevel);
  return actual >= needed;
}

export function validateCommandIntent(input: Partial<CommandIntentCreateInput>): string[] {
  const errors: string[] = [];
  if (!input.issuerId) errors.push('issuerId is required');
  if (!input.scope) errors.push('scope is required');
  if (!input.intentType) errors.push('intentType is required');
  if (!input.authorityLevel) errors.push('authorityLevel is required');
  if (!input.parameters || typeof input.parameters !== 'object') errors.push('parameters must be an object');
  if (typeof input.ttlSeconds !== 'number' || input.ttlSeconds <= 0) errors.push('ttlSeconds must be > 0');

  if (input.scope && input.authorityLevel && !hasRequiredAuthority(input.scope, input.authorityLevel)) {
    errors.push(`authorityLevel ${input.authorityLevel} cannot issue ${input.scope}-scope intent`);
  }

  return errors;
}

export function createCommandIntent(input: CommandIntentCreateInput, nowMs = Date.now()): CommandIntent {
  const intent: CommandIntent = {
    id: input.id || createIntentId(nowMs),
    issuerId: input.issuerId,
    scope: input.scope,
    spatialAnchor: input.spatialAnchor,
    intentType: input.intentType,
    parameters: input.parameters || {},
    authorityLevel: input.authorityLevel,
    ttlSeconds: input.ttlSeconds,
    createdAt: input.createdAt || new Date(nowMs).toISOString(),
  };

  const validationErrors = validateCommandIntent(intent);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid CommandIntent: ${validationErrors.join('; ')}`);
  }

  return intent;
}
