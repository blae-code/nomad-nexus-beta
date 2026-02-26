/**
 * typographyValidator - Typography regression test suite for NexusOS
 * 
 * Validates that all text elements comply with approved typography scales.
 * Catches regressions in font-size, font-weight, letter-spacing, text-transform.
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

const APPROVED_FONT_SIZES = new Set([
  'text-[8px]',
  'text-[10px]',
  'text-[11px]', // User content exception
  'text-xs',     // User content exception
  'text-sm',     // User content exception
]);

const APPROVED_FONT_WEIGHTS = new Set([
  'font-semibold',  // 600
  'font-bold',      // 700
  'font-black',     // 900
]);

const APPROVED_TRACKING = new Set([
  'tracking-[0.12em]',
  'tracking-[0.14em]',
  'tracking-[0.15em]',
  'tracking-wide',  // Exception for user content
]);

const APPROVED_TEXT_TRANSFORM = new Set([
  'uppercase',
  'normal-case', // Exception for user content
]);

/**
 * Extract typography classes from element
 * @param {HTMLElement} element - Element to analyze
 * @returns {Object} - Typography class breakdown
 */
function extractTypographyClasses(element) {
  const classList = Array.from(element.classList);
  
  const fontSize = classList.find((cls) => cls.startsWith('text-[') || cls.startsWith('text-xs') || cls.startsWith('text-sm')) || null;
  const fontWeight = classList.find((cls) => cls.startsWith('font-')) || null;
  const tracking = classList.find((cls) => cls.startsWith('tracking-')) || null;
  const transform = classList.includes('uppercase') ? 'uppercase' : classList.includes('normal-case') ? 'normal-case' : null;

  return { fontSize, fontWeight, tracking, transform };
}

/**
 * Check if element is user-authored content (exception to system typography)
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
function isUserContent(element) {
  const userContentMarkers = [
    'user-message',
    'message-content',
    'narrative-text',
    'user-authored',
    'markdown',
    'prose',
  ];
  
  return userContentMarkers.some((marker) => element.classList.contains(marker));
}

/**
 * Validate typography for a single element
 * @param {HTMLElement} element - Element to validate
 * @returns {Array<Object>} - List of violations
 */
function validateElementTypography(element) {
  const violations = [];
  const classes = extractTypographyClasses(element);
  const isException = isUserContent(element);

  // Check font size
  if (classes.fontSize && !APPROVED_FONT_SIZES.has(classes.fontSize) && !isException) {
    violations.push({
      category: 'FONT_SIZE',
      message: `Invalid font-size: ${classes.fontSize}. Use text-[8px] or text-[10px] for system labels.`,
      element: element.tagName.toLowerCase(),
      className: element.className,
      severity: 'HIGH',
    });
  }

  // Check font weight
  if (classes.fontWeight && !APPROVED_FONT_WEIGHTS.has(classes.fontWeight) && !isException) {
    violations.push({
      category: 'FONT_WEIGHT',
      message: `Invalid font-weight: ${classes.fontWeight}. Use font-semibold or higher.`,
      element: element.tagName.toLowerCase(),
      className: element.className,
      severity: 'MEDIUM',
    });
  }

  // Check letter spacing (only if text-[8px] or text-[10px])
  if ((classes.fontSize === 'text-[8px]' || classes.fontSize === 'text-[10px]') && !isException) {
    if (!classes.tracking || !APPROVED_TRACKING.has(classes.tracking)) {
      violations.push({
        category: 'LETTER_SPACING',
        message: `Missing or invalid tracking for ${classes.fontSize}. Use tracking-[0.12em] to tracking-[0.15em].`,
        element: element.tagName.toLowerCase(),
        className: element.className,
        severity: 'MEDIUM',
      });
    }
  }

  // Check text transform (system labels should be uppercase)
  if ((classes.fontSize === 'text-[8px]' || classes.fontSize === 'text-[10px]') && !isException) {
    if (classes.transform !== 'uppercase') {
      violations.push({
        category: 'TEXT_TRANSFORM',
        message: `System labels must use uppercase. Found: ${classes.transform || 'none'}`,
        element: element.tagName.toLowerCase(),
        className: element.className,
        severity: 'LOW',
      });
    }
  }

  return violations;
}

/**
 * Run full typography audit on component tree
 * @param {HTMLElement} root - Root element to audit
 * @param {Object} options - Audit options
 * @param {boolean} [options.strict=false] - Throw on violations
 * @param {number} [options.maxViolations=50] - Max violations to collect
 * @returns {Object} - Typography audit report
 */
export function runTypographyAudit(root, options = {}) {
  const { strict = false, maxViolations = 50 } = options;
  
  if (!root || !(root instanceof HTMLElement)) {
    throw new Error('Invalid root element for typography audit');
  }

  const violations = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const el = node;
        const hasText = el.textContent?.trim().length > 0;
        const hasTypographyClass = Array.from(el.classList).some((cls) => 
          cls.startsWith('text-') || cls.startsWith('font-') || cls.startsWith('tracking-') || cls.includes('uppercase')
        );
        return hasText && hasTypographyClass ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    }
  );

  while (walker.nextNode() && violations.length < maxViolations) {
    const el = walker.currentNode;
    const elementViolations = validateElementTypography(el);
    violations.push(...elementViolations);
  }

  const passed = violations.length === 0;
  const highSeverity = violations.filter((v) => v.severity === 'HIGH').length;
  const mediumSeverity = violations.filter((v) => v.severity === 'MEDIUM').length;
  const lowSeverity = violations.filter((v) => v.severity === 'LOW').length;
  
  const complianceScore = Math.max(0, 100 - highSeverity * 15 - mediumSeverity * 8 - lowSeverity * 3);

  const report = {
    passed,
    complianceScore,
    violations,
    summary: passed
      ? 'All typography compliant with NexusOS standards.'
      : `${violations.length} typography violations (${highSeverity} high, ${mediumSeverity} medium, ${lowSeverity} low)`,
    stats: { highSeverity, mediumSeverity, lowSeverity, total: violations.length },
  };

  if (strict && !passed) {
    throw new Error(`Typography audit failed: ${report.summary}`);
  }

  return report;
}

/**
 * Quick typography check for common issues
 * @param {HTMLElement} element - Element to check
 * @returns {Object} - {valid, issues}
 */
export function quickTypographyCheck(element) {
  const issues = [];
  const classes = extractTypographyClasses(element);

  if (classes.fontSize && !APPROVED_FONT_SIZES.has(classes.fontSize)) {
    issues.push(`Font size ${classes.fontSize} not approved`);
  }

  if (classes.fontWeight && !APPROVED_FONT_WEIGHTS.has(classes.fontWeight)) {
    issues.push(`Font weight ${classes.fontWeight} not approved`);
  }

  if ((classes.fontSize === 'text-[8px]' || classes.fontSize === 'text-[10px]') && classes.transform !== 'uppercase') {
    issues.push('System labels must be uppercase');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * React hook for typography validation on mount
 * @param {string} componentName - Component name for logging
 * @returns {React.RefObject} - Ref to attach to root element
 */
export function useTypographyValidation(componentName) {
  const { useRef, useEffect } = require('react');
  const ref = useRef(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (process.env.NODE_ENV !== 'development') return;
    if (!ref.current) return;

    ranRef.current = true;

    try {
      const report = runTypographyAudit(ref.current, { strict: false });
      
      const prefix = `[Typography] ${componentName}`;
      const scoreColor = report.complianceScore >= 90 ? '\x1b[32m' : report.complianceScore >= 70 ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${prefix} - Compliance: ${scoreColor}${report.complianceScore}%${reset}`);
      
      if (report.violations.length > 0 && report.violations.length <= 5) {
        console.group(`${prefix} - Violations`);
        report.violations.forEach((violation) => {
          console.warn(`  - [${violation.category}] ${violation.message}`);
        });
        console.groupEnd();
      } else if (report.violations.length > 5) {
        console.warn(`${prefix} - ${report.violations.length} violations (showing first 5)`);
        report.violations.slice(0, 5).forEach((violation) => {
          console.warn(`  - [${violation.category}] ${violation.message}`);
        });
      }
    } catch (error) {
      console.error(`[Typography] ${componentName} - Validation failed:`, error.message);
    }
  }, [componentName]);

  return ref;
}