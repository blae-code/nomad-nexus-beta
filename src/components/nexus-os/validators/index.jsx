
/**
 * NexusOS Validators - Centralized export for all validation tools
 * 
 * Provides runtime validation for:
 * - Style guide compliance (typography, spacing, colors, icons)
 * - Viewport constraints (no scroll, responsive)
 * - Typography standards (font-size, weight, spacing)
 * - Regression prevention (TS syntax, primitives, gradients)
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

// Core style guide validation
export {
  validateTypography,
  validateSpacing,
  validateIconSize,
  validateColor,
  runFullAudit,
} from './styleGuideValidator';

// React hooks for validation
export { useStyleGuideValidation, useBatchStyleGuideValidation } from './useStyleGuideValidation';

// Viewport validation
export {
  runViewportAudit,
  quickViewportCheck,
  useViewportValidation,
} from './viewportValidator';

// Typography validation
export {
  runTypographyAudit,
  quickTypographyCheck,
  useTypographyValidation,
} from './typographyValidator';

// Regression testing
export {
  runRegressionTests,
  useRegressionTests,
  runBatchRegressionTests,
} from './regressionTests';

// Registry validators (existing)
export {
  validateCommsTemplate,
  validateGameplayVariant,
  validateMacro,
  validateNarrativeTemplate,
  validateOperationArchetype,
  validateReportTemplate,
  validateTTLProfile,
} from './registryValidators';
