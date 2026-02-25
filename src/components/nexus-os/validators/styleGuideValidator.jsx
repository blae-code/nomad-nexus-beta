/**
 * NexusOS Style Guide Validator
 * 
 * Runtime validation tool to check component compliance with design system.
 * Use in development to catch style violations early.
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import { isValidFontSize, isValidFontWeight, isValidLetterSpacing } from '../ui/theme/design-tokens';

const ALLOWED_PADDINGS = ['0.375rem', '0.5rem', '0.625rem', '0.75rem', '1rem']; // p-1.5, p-2, p-2.5, p-3, p-4
const ALLOWED_GAPS = ['0.25rem', '0.375rem', '0.5rem']; // gap-1, gap-1.5, gap-2
const ICON_SIZE_RANGE = { min: 10, max: 24 }; // 10px to 24px
const BORDER_OPACITY_RANGE = { min: 0.4, max: 0.6 }; // 40% to 60%

/**
 * Validate typography compliance.
 * 
 * @param {HTMLElement} element - Element to validate
 * @param {string} expectedScale - Expected typography scale (headerPrimary, bodyPrimary, etc.)
 * @returns {Array<string>} Violations found
 */
export function validateTypography(element, expectedScale = null) {
  const violations = [];
  const computed = window.getComputedStyle(element);
  
  // Font size check
  const fontSize = computed.fontSize;
  if (!isValidFontSize(fontSize)) {
    violations.push(`Invalid font-size: ${fontSize} (must be 8px or 10px)`);
  }
  
  // Font weight check
  const fontWeight = parseInt(computed.fontWeight, 10);
  if (!isValidFontWeight(fontWeight)) {
    violations.push(`Invalid font-weight: ${fontWeight} (must be 600+)`);
  }
  
  // Letter spacing check
  const letterSpacing = computed.letterSpacing;
  if (letterSpacing !== 'normal' && !isValidLetterSpacing(letterSpacing)) {
    violations.push(`Invalid letter-spacing: ${letterSpacing} (must be 0.12em+)`);
  }
  
  // Text transform check (most text should be uppercase)
  const textTransform = computed.textTransform;
  if (textTransform !== 'uppercase' && element.textContent.trim()) {
    // Warning only, not all text needs uppercase
    violations.push(`Warning: text-transform is ${textTransform} (consider uppercase)`);
  }
  
  return violations;
}

/**
 * Validate spacing compliance.
 * 
 * @param {HTMLElement} element - Element to validate
 * @param {string} context - Context hint (panel, card, button, etc.)
 * @returns {Array<string>} Violations found
 */
export function validateSpacing(element, context = 'general') {
  const violations = [];
  const computed = window.getComputedStyle(element);
  
  // Padding check
  const paddingTop = computed.paddingTop;
  const paddingRight = computed.paddingRight;
  const paddingBottom = computed.paddingBottom;
  const paddingLeft = computed.paddingLeft;
  
  [paddingTop, paddingRight, paddingBottom, paddingLeft].forEach((padding, idx) => {
    if (padding !== '0px' && !ALLOWED_PADDINGS.includes(padding)) {
      const side = ['top', 'right', 'bottom', 'left'][idx];
      violations.push(`Non-standard padding-${side}: ${padding} (use p-1.5, p-2, p-2.5)`);
    }
  });
  
  // Gap check (if flex or grid)
  const display = computed.display;
  if (display === 'flex' || display === 'grid') {
    const gap = computed.gap;
    if (gap !== 'normal' && gap !== '0px' && !ALLOWED_GAPS.includes(gap)) {
      violations.push(`Non-standard gap: ${gap} (use gap-1, gap-1.5, gap-2)`);
    }
  }
  
  return violations;
}

/**
 * Validate icon size compliance.
 * 
 * @param {HTMLElement} iconElement - Icon element (SVG or img)
 * @returns {Array<string>} Violations found
 */
export function validateIconSize(iconElement) {
  const violations = [];
  const computed = window.getComputedStyle(iconElement);
  
  const width = parseFloat(computed.width);
  const height = parseFloat(computed.height);
  
  if (width < ICON_SIZE_RANGE.min || width > ICON_SIZE_RANGE.max) {
    violations.push(`Icon width ${width}px out of range (${ICON_SIZE_RANGE.min}-${ICON_SIZE_RANGE.max}px)`);
  }
  
  if (height < ICON_SIZE_RANGE.min || height > ICON_SIZE_RANGE.max) {
    violations.push(`Icon height ${height}px out of range (${ICON_SIZE_RANGE.min}-${ICON_SIZE_RANGE.max}px)`);
  }
  
  if (Math.abs(width - height) > 1) {
    violations.push(`Icon not square: ${width}px × ${height}px`);
  }
  
  return violations;
}

/**
 * Validate color usage compliance.
 * 
 * @param {HTMLElement} element - Element to validate
 * @returns {Array<string>} Violations found
 */
export function validateColors(element) {
  const violations = [];
  const computed = window.getComputedStyle(element);
  
  // Check for decorative gradients (functional gradients are OK)
  const backgroundImage = computed.backgroundImage;
  if (backgroundImage && backgroundImage.includes('gradient')) {
    // This is just a warning - gradients aren't forbidden, but should be functional
    violations.push(`Warning: gradient detected (ensure it's functional, not decorative)`);
  }
  
  // Check opacity pairing with backdrop-blur
  const backgroundColor = computed.backgroundColor;
  const backdropFilter = computed.backdropFilter;
  
  if (backgroundColor && backgroundColor.includes('rgba')) {
    const alphaMatch = backgroundColor.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[1]);
      if (alpha < 1 && backdropFilter === 'none') {
        violations.push(`Opacity background without backdrop-blur: ${backgroundColor}`);
      }
    }
  }
  
  // Check border opacity (if border exists)
  const borderTopColor = computed.borderTopColor;
  if (borderTopColor && borderTopColor.includes('rgba')) {
    const alphaMatch = borderTopColor.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[1]);
      if (alpha < BORDER_OPACITY_RANGE.min || alpha > BORDER_OPACITY_RANGE.max) {
        violations.push(`Border opacity ${Math.round(alpha * 100)}% outside 40-60% range`);
      }
    }
  }
  
  return violations;
}

/**
 * Run full audit on component tree.
 * 
 * @param {HTMLElement} rootElement - Root element to audit
 * @param {Object} options - Audit options
 * @param {boolean} options.strict - Throw errors on violations
 * @param {boolean} options.verbose - Log all checks, not just violations
 * @returns {Object} Compliance report
 */
export function runFullAudit(rootElement, options = {}) {
  const { strict = false, verbose = false } = options;
  
  const report = {
    element: rootElement.tagName,
    className: rootElement.className,
    violations: [],
    warnings: [],
    score: 100,
  };
  
  // Typography check
  const typoViolations = validateTypography(rootElement);
  typoViolations.forEach(v => {
    if (v.startsWith('Warning:')) {
      report.warnings.push(v);
    } else {
      report.violations.push(v);
    }
  });
  
  // Spacing check
  const spacingViolations = validateSpacing(rootElement);
  spacingViolations.forEach(v => {
    if (v.startsWith('Warning:') || v.includes('Non-standard')) {
      report.warnings.push(v);
    } else {
      report.violations.push(v);
    }
  });
  
  // Color check
  const colorViolations = validateColors(rootElement);
  colorViolations.forEach(v => {
    if (v.startsWith('Warning:')) {
      report.warnings.push(v);
    } else {
      report.violations.push(v);
    }
  });
  
  // Icon check (if element is SVG or contains SVGs)
  const icons = rootElement.querySelectorAll('svg, img[src*="token"]');
  icons.forEach(icon => {
    const iconViolations = validateIconSize(icon);
    iconViolations.forEach(v => report.violations.push(v));
  });
  
  // Calculate score
  const totalIssues = report.violations.length + (report.warnings.length * 0.5);
  report.score = Math.max(0, Math.round(100 - (totalIssues * 5)));
  
  // Log in dev mode
  if (typeof window !== 'undefined' && (verbose || report.violations.length > 0)) {
    const logFn = report.violations.length > 0 ? console.warn : console.log;
    logFn(`[NexusOS Style Audit] ${report.element}.${report.className}`, {
      score: `${report.score}%`,
      violations: report.violations.length,
      warnings: report.warnings.length,
    });
    
    if (report.violations.length > 0) {
      console.warn('Violations:', report.violations);
    }
    if (verbose && report.warnings.length > 0) {
      console.log('Warnings:', report.warnings);
    }
  }
  
  // Throw in strict mode
  if (strict && report.violations.length > 0) {
    throw new Error(`Style guide violations: ${report.violations.join(', ')}`);
  }
  
  return report;
}

/**
 * React hook wrapper for validation.
 * Auto-runs audit on component mount in development.
 * 
 * @param {React.RefObject} ref - Ref to element to validate
 * @param {Object} options - Audit options
 */
export function useStyleGuideValidation(ref, options = {}) {
  if (typeof window === 'undefined') return;
  
  // Only run in development
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) return;
  
  // Run on mount and when ref changes
  React.useEffect(() => {
    if (ref.current) {
      // Delay to allow styles to apply
      setTimeout(() => {
        runFullAudit(ref.current, options);
      }, 100);
    }
  }, [ref, options]);
}