import {
  CommsTemplateRegistry,
  CqbVariantRegistry,
  GameplayVariantRegistry,
  MacroRegistryBySetId,
  TTLProfileRegistryById,
  CqbVariantRegistryById,
} from '../registries';

export interface RegistryValidationOptions {
  logWarnings?: boolean;
}

export function validateNexusRegistries(options: RegistryValidationOptions = {}) {
  const warnings: string[] = [];
  const commsIds = new Set(Object.keys(CommsTemplateRegistry));
  const variantIds = new Set(Object.keys(CqbVariantRegistryById));

  for (const variant of CqbVariantRegistry) {
    if (!TTLProfileRegistryById[variant.defaultTTLProfileId]) {
      warnings.push(`[NexusOS][Registry] ${variant.id} references missing TTL profile ${variant.defaultTTLProfileId}`);
    }
    if (!MacroRegistryBySetId[variant.defaultMacroSetId]) {
      warnings.push(`[NexusOS][Registry] ${variant.id} references missing macro set ${variant.defaultMacroSetId}`);
    }
    if (!commsIds.has(variant.defaultCommsTemplateId)) {
      warnings.push(`[NexusOS][Registry] ${variant.id} references missing comms template ${variant.defaultCommsTemplateId}`);
    }
  }

  for (const macroSetId of Object.keys(MacroRegistryBySetId)) {
    const macroSet = MacroRegistryBySetId[macroSetId];
    if (!variantIds.has(macroSet.variantId)) {
      warnings.push(`[NexusOS][Registry] ${macroSetId} references missing variant ${macroSet.variantId}`);
    }
  }

  for (const profileId of Object.keys(TTLProfileRegistryById)) {
    const profile = TTLProfileRegistryById[profileId];
    if (!variantIds.has(profile.variantId)) {
      warnings.push(`[NexusOS][Registry] ${profileId} references missing variant ${profile.variantId}`);
    }
  }

  for (const gameplay of GameplayVariantRegistry) {
    if (gameplay.defaultCqbVariantId && !variantIds.has(gameplay.defaultCqbVariantId)) {
      warnings.push(`[NexusOS][Registry] Gameplay variant ${gameplay.id} references missing CQB variant ${gameplay.defaultCqbVariantId}`);
    }
    if (!commsIds.has(gameplay.defaultCommsTemplateId)) {
      warnings.push(`[NexusOS][Registry] Gameplay variant ${gameplay.id} references missing comms template ${gameplay.defaultCommsTemplateId}`);
    }
  }

  if (options.logWarnings !== false) {
    for (const warning of warnings) console.warn(warning);
    if (warnings.length === 0) console.info('[NexusOS][Registry] Validation passed with no warnings.');
  }

  return warnings;
}

/**
 * Dev-only helper that never throws.
 */
export function runNexusRegistryValidatorsDevOnly() {
  const isDev = Boolean((import.meta as any)?.env?.DEV);
  if (!isDev) return [];
  try {
    return validateNexusRegistries({ logWarnings: true });
  } catch (error) {
    console.warn('[NexusOS][Registry] Validator failed unexpectedly:', error);
    return [];
  }
}
