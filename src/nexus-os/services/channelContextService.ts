/**
 * Channel Context Service (scaffold)
 *
 * Determines the comms template/channel context for CQB/comms workflows.
 * TODO: integrate runtime membership and permission checks from auth graph.
 */

import { getCqbVariant } from '../registries/cqbVariantRegistry';
import { getCommsTemplate, type CommsTemplateDefinition, type CommsTemplateId } from '../registries/commsTemplateRegistry';
import { getGameplayVariant } from '../registries/gameplayVariantRegistry';

export interface ChannelContextRequest {
  variantId?: string;
  commsTemplateId?: CommsTemplateId;
  preferredChannelId?: string;
}

export interface ChannelContextResult {
  templateId: CommsTemplateId;
  primaryChannelId: string;
  channelIds: string[];
  defaultMembership: string[];
  monitoringLinks: CommsTemplateDefinition['monitoringLinks'];
  authorityExpectations: string[];
}

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

export function determineChannelContext(input: ChannelContextRequest): ChannelContextResult {
  const templateId = resolveTemplateId(input);
  const template = getCommsTemplate(templateId);
  const channelIds = template.channels.map((channel) => channel.id);

  const primaryChannelId =
    input.preferredChannelId && channelIds.includes(input.preferredChannelId)
      ? input.preferredChannelId
      : channelIds[0];

  return {
    templateId,
    primaryChannelId,
    channelIds,
    defaultMembership: [...template.defaultMembership],
    monitoringLinks: [...template.monitoringLinks],
    authorityExpectations: [...template.authorityExpectations],
  };
}

export function getActiveChannelId(input: ChannelContextRequest): string | null {
  const context = determineChannelContext(input);
  return context.primaryChannelId || null;
}
