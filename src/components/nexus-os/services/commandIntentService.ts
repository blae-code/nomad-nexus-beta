/**
 * Command Intent Service
 *
 * Authority validation + intent creation with optional policy hooks for
 * role graphs and org-level doctrine checks.
 */

import type { AuthorityLevel, CommandIntent, CommandScope } from '../schemas/coreSchemas';

export type CommandIntentCreateInput = Omit<CommandIntent, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export interface CommandAuthorityEvaluationContext {
  issuerId: string;
  scope: CommandScope;
  authorityLevel: AuthorityLevel;
  intentType: string;
  roleTags: string[];
  policyTags: string[];
}

export interface CommandIntentValidationOptions {
  roleTags?: string[];
  policyTags?: string[];
}

export type CommandAuthorityPolicyValidator = (context: CommandAuthorityEvaluationContext) => string | null;

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

const commandAuthorityValidators = new Map<string, CommandAuthorityPolicyValidator>();

function normalizeOptionTokens(values: string[] | undefined): string[] {
  const tokens = (values || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return [...new Set(tokens)];
}

export function hasRequiredAuthority(scope: CommandScope, authorityLevel: AuthorityLevel): boolean {
  const needed = AUTHORITY_ORDER.indexOf(MIN_AUTHORITY_BY_SCOPE[scope]);
  const actual = AUTHORITY_ORDER.indexOf(authorityLevel);
  return actual >= needed;
}

export function registerCommandAuthorityPolicyValidator(
  id: string,
  validator: CommandAuthorityPolicyValidator
): void {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) throw new Error('Command authority validator id is required.');
  commandAuthorityValidators.set(normalizedId, validator);
}

export function unregisterCommandAuthorityPolicyValidator(id: string): boolean {
  return commandAuthorityValidators.delete(String(id || '').trim());
}

export function listCommandAuthorityPolicyValidatorIds(): string[] {
  return [...commandAuthorityValidators.keys()].sort((a, b) => a.localeCompare(b));
}

export function resetCommandAuthorityPolicyValidators(): void {
  commandAuthorityValidators.clear();
}

export function evaluateCommandAuthority(
  input: Pick<CommandIntentCreateInput, 'issuerId' | 'scope' | 'authorityLevel' | 'intentType'>,
  options: CommandIntentValidationOptions = {}
): string[] {
  const errors: string[] = [];
  if (!hasRequiredAuthority(input.scope, input.authorityLevel)) {
    errors.push(`authorityLevel ${input.authorityLevel} cannot issue ${input.scope}-scope intent`);
  }

  const context: CommandAuthorityEvaluationContext = {
    issuerId: input.issuerId,
    scope: input.scope,
    authorityLevel: input.authorityLevel,
    intentType: input.intentType,
    roleTags: normalizeOptionTokens(options.roleTags),
    policyTags: normalizeOptionTokens(options.policyTags),
  };

  for (const [validatorId, validator] of commandAuthorityValidators.entries()) {
    const message = validator(context);
    if (message) errors.push(`[${validatorId}] ${message}`);
  }
  return errors;
}

export function validateCommandIntent(
  input: Partial<CommandIntentCreateInput>,
  options: CommandIntentValidationOptions = {}
): string[] {
  const errors: string[] = [];
  if (!input.issuerId) errors.push('issuerId is required');
  if (!input.scope) errors.push('scope is required');
  if (!input.intentType) errors.push('intentType is required');
  if (!input.authorityLevel) errors.push('authorityLevel is required');
  if (!input.parameters || typeof input.parameters !== 'object') errors.push('parameters must be an object');
  if (typeof input.ttlSeconds !== 'number' || input.ttlSeconds <= 0) errors.push('ttlSeconds must be > 0');

  if (input.issuerId && input.scope && input.intentType && input.authorityLevel) {
    errors.push(
      ...evaluateCommandAuthority(
        {
          issuerId: input.issuerId,
          scope: input.scope,
          authorityLevel: input.authorityLevel,
          intentType: input.intentType,
        },
        options
      )
    );
  }

  return errors;
}

export function createCommandIntent(
  input: CommandIntentCreateInput,
  nowMs = Date.now(),
  options: CommandIntentValidationOptions = {}
): CommandIntent {
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

  const validationErrors = validateCommandIntent(intent, options);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid CommandIntent: ${validationErrors.join('; ')}`);
  }

  return intent;
}
