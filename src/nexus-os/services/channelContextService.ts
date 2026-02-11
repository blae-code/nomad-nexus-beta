/**
 * Channel Context Service
 *
 * Determines the comms template/channel context for CQB/comms workflows and
 * supports pluggable membership/permission resolution from auth graphs.
 */

import { getCqbVariant } from '../registries/cqbVariantRegistry';
import { getCommsTemplate, type CommsTemplateDefinition, type CommsTemplateId } from '../registries/commsTemplateRegistry';
import { getGameplayVariant } from '../registries/gameplayVariantRegistry';

export interface ChannelContextRequest {
  variantId?: string;
  commsTemplateId?: CommsTemplateId;
  preferredChannelId?: string;
  userId?: string;
  roleTags?: string[];
}

export interface ChannelContextResult {
  templateId: CommsTemplateId;
  primaryChannelId: string;
  channelIds: string[];
  defaultMembership: string[];
  monitoringLinks: CommsTemplateDefinition['monitoringLinks'];
  authorityExpectations: string[];
}

export interface ChannelAccessResolution {
  allowedChannelIds?: string[];
  defaultMembership?: string[];
  authorityExpectations?: string[];
}

export interface ChannelAccessResolverContext {
  templateId: CommsTemplateId;
  request: ChannelContextRequest;
  template: CommsTemplateDefinition;
  channelIds: string[];
}

export type ChannelAccessResolver =
  (context: ChannelAccessResolverContext) => ChannelAccessResolution | null | undefined;

let channelAccessResolver: ChannelAccessResolver | null = null;

function resolveTemplateId(input: ChannelContextRequest): CommsTemplateId {
  if (input.commsTemplateId) return input.commsTemplateId;

  if (input.variantId) {
    const cqb = getCqbVariant(input.variantId);
    if (cqb) return cqb.defaultCommsTemplateId;

    const gameplay = getGameplayVariant(input.variantId);
    if (gameplay) return gameplay.defaultCommsTemplateId;
  }

  return 'FIRETEAM_PRIMARY';
}

function normalizeTokens(values: string[] | undefined): string[] {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export function setChannelAccessResolver(resolver: ChannelAccessResolver | null): void {
  channelAccessResolver = resolver;
}

export function getChannelAccessResolver(): ChannelAccessResolver | null {
  return channelAccessResolver;
}

export function determineChannelContext(input: ChannelContextRequest): ChannelContextResult {
  const templateId = resolveTemplateId(input);
  const template = getCommsTemplate(templateId);
  const baseChannelIds = template.channels.map((channel) => channel.id);
  const resolved = channelAccessResolver
    ? channelAccessResolver({
        templateId,
        request: input,
        template,
        channelIds: [...baseChannelIds],
      })
    : null;

  const channelIds = normalizeTokens(
    resolved?.allowedChannelIds?.length ? resolved.allowedChannelIds : baseChannelIds
  );
  const fallbackPrimary = channelIds[0] || baseChannelIds[0] || '';

  const primaryChannelId =
    input.preferredChannelId && channelIds.includes(input.preferredChannelId)
      ? input.preferredChannelId
      : fallbackPrimary;

  return {
    templateId,
    primaryChannelId,
    channelIds,
    defaultMembership: normalizeTokens(
      resolved?.defaultMembership?.length ? resolved.defaultMembership : [...template.defaultMembership]
    ),
    monitoringLinks: [...template.monitoringLinks],
    authorityExpectations: normalizeTokens(
      resolved?.authorityExpectations?.length
        ? resolved.authorityExpectations
        : [...template.authorityExpectations]
    ),
  };
}

export function getActiveChannelId(input: ChannelContextRequest): string | null {
  const context = determineChannelContext(input);
  return context.primaryChannelId || null;
}
