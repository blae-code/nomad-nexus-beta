/**
 * viewportValidator - Viewport constraint validation for NexusOS components
 * 
 * Ensures components fit and remain usable at:
 * - 1366×768 (minimum)
 * - 1440×900 (standard)
 * - 1920×1080 (high-res)
 * 
 * All at 100% zoom with no horizontal or page scroll.
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

const REQUIRED_VIEWPORTS = [
  { width: 1366, height: 768, label: 'Minimum (1366×768)' },
  { width: 1440, height: 900, label: 'Standard (1440×900)' },
  { width: 1920, height: 1080, label: 'High-Res (1920×1080)' },
];

/**
 * Check if element causes horizontal scroll at given viewport width
 * @param {HTMLElement} element - Element to check
 * @param {number} viewportWidth - Viewport width in pixels
 * @returns {Object} - {hasHorizontalScroll, scrollWidth, viewportWidth}
 */
function checkHorizontalScroll(element, viewportWidth) {
  const scrollWidth = element.scrollWidth;
  const hasHorizontalScroll = scrollWidth > viewportWidth;
  
  return {
    hasHorizontalScroll,
    scrollWidth,
    viewportWidth,
    overflow: hasHorizontalScroll ? scrollWidth - viewportWidth : 0,
  };
}

/**
 * Check if element exceeds viewport height (page scroll)
 * @param {HTMLElement} element - Element to check
 * @param {number} viewportHeight - Viewport height in pixels
 * @returns {Object} - {hasPageScroll, scrollHeight, viewportHeight}
 */
function checkPageScroll(element, viewportHeight) {
  const scrollHeight = element.scrollHeight;
  const hasPageScroll = scrollHeight > viewportHeight;
  
  return {
    hasPageScroll,
    scrollHeight,
    viewportHeight,
    overflow: hasPageScroll ? scrollHeight - viewportHeight : 0,
  };
}

/**
 * Check for internal scrollable panels (should be avoided in normal operation)
 * @param {HTMLElement} root - Root element to scan
 * @returns {Array<Object>} - List of scrollable elements found
 */
function findScrollablePanels(root) {
  const scrollable = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const el = node;
        const style = window.getComputedStyle(el);
        const hasScrollY = style.overflowY === 'scroll' || style.overflowY === 'auto';
        const hasScrollX = style.overflowX === 'scroll' || style.overflowX === 'auto';
        
        if ((hasScrollY || hasScrollX) && el.scrollHeight > el.clientHeight) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    }
  );

  while (walker.nextNode()) {
    const el = walker.currentNode;
    scrollable.push({
      element: el,
      tagName: el.tagName.toLowerCase(),
      className: el.className,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }

  return scrollable;
}

/**
 * Run full viewport compliance audit
 * @param {HTMLElement} root - Root component element
 * @param {Object} options - Validation options
 * @param {boolean} [options.allowInternalScroll=true] - Allow internal scrollable panels (modals/drawers)
 * @returns {Object} - Comprehensive viewport report
 */
export function runViewportAudit(root, options = {}) {
  const { allowInternalScroll = true } = options;
  
  if (!root || !(root instanceof HTMLElement)) {
    throw new Error('Invalid root element for viewport audit');
  }

  const violations = [];
  const warnings = [];

  REQUIRED_VIEWPORTS.forEach((viewport) => {
    const horizontalCheck = checkHorizontalScroll(root, viewport.width);
    if (horizontalCheck.hasHorizontalScroll) {
      violations.push({
        category: 'HORIZONTAL_SCROLL',
        viewport: viewport.label,
        message: `Horizontal scroll detected at ${viewport.label}: ${horizontalCheck.overflow}px overflow`,
        severity: 'HIGH',
        data: horizontalCheck,
      });
    }

    const pageCheck = checkPageScroll(root, viewport.height);
    if (pageCheck.hasPageScroll) {
      warnings.push({
        category: 'PAGE_SCROLL',
        viewport: viewport.label,
        message: `Page scroll detected at ${viewport.label}: ${pageCheck.overflow}px overflow`,
        severity: 'MEDIUM',
        data: pageCheck,
      });
    }
  });

  const scrollablePanels = findScrollablePanels(root);
  if (scrollablePanels.length > 0 && !allowInternalScroll) {
    scrollablePanels.forEach((panel) => {
      warnings.push({
        category: 'INTERNAL_SCROLL',
        message: `Scrollable panel found: ${panel.tagName}.${panel.className}`,
        severity: 'LOW',
        data: panel,
      });
    });
  }

  const passed = violations.length === 0;
  const complianceScore = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 20 - warnings.length * 5);

  return {
    passed,
    complianceScore,
    violations,
    warnings,
    summary: passed
      ? 'Viewport constraints met at all required resolutions.'
      : `${violations.length} critical viewport violations detected.`,
    viewports: REQUIRED_VIEWPORTS,
    scrollablePanels,
  };
}

/**
 * Quick viewport check for common constraints
 * @param {HTMLElement} element - Element to check
 * @returns {Object} - {valid, issues}
 */
export function quickViewportCheck(element) {
  const issues = [];
  
  const minViewport = REQUIRED_VIEWPORTS[0];
  const horizontalCheck = checkHorizontalScroll(element, minViewport.width);
  
  if (horizontalCheck.hasHorizontalScroll) {
    issues.push(`Horizontal scroll at ${minViewport.width}px`);
  }

  if (element.scrollHeight > minViewport.height + 100) {
    issues.push(`Likely page scroll at ${minViewport.height}px`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * React hook for viewport validation on mount
 * @param {string} componentName - Component name for logging
 * @param {Object} options - Validation options
 * @returns {React.RefObject} - Ref to attach to root element
 */
export function useViewportValidation(componentName, options = {}) {
  const { useRef, useEffect } = require('react');
  const ref = useRef(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (process.env.NODE_ENV !== 'development') return;
    if (!ref.current) return;

    ranRef.current = true;

    try {
      const report = runViewportAudit(ref.current, options);
      
      const prefix = `[Viewport] ${componentName}`;
      const scoreColor = report.complianceScore >= 90 ? '\x1b[32m' : report.complianceScore >= 70 ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${prefix} - Compliance: ${scoreColor}${report.complianceScore}%${reset}`);
      console.log(`${prefix} - ${report.summary}`);

      if (report.violations.length > 0) {
        console.group(`${prefix} - Violations`);
        report.violations.forEach((violation) => {
          console.error(`  - [${violation.category}] ${violation.message}`);
        });
        console.groupEnd();
      }

      if (report.warnings.length > 0 && report.warnings.length <= 3) {
        console.group(`${prefix} - Warnings`);
        report.warnings.forEach((warning) => {
          console.warn(`  - [${warning.category}] ${warning.message}`);
        });
        console.groupEnd();
      }
    } catch (error) {
      console.error(`[Viewport] ${componentName} - Validation failed:`, error.message);
    }
  }, [componentName, options.strict, options.allowInternalScroll]);

  return ref;
}