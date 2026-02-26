/**
 * regressionTests - Automated regression test suite for NexusOS design compliance
 * 
 * Runs comprehensive checks to catch common regressions:
 * - TypeScript syntax leakage
 * - Non-compliant spacing/typography
 * - Missing primitive usage
 * - Viewport constraint violations
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import { runFullAudit } from './styleGuideValidator';
import { runViewportAudit } from './viewportValidator';
import { runTypographyAudit } from './typographyValidator';

/**
 * Check for TypeScript syntax in component source
 * (This is a static check - would need build-time integration for real detection)
 * @param {HTMLElement} root - Component root
 * @returns {Array<Object>} - List of potential TS remnants
 */
function detectTypeScriptRemnants(root) {
  const issues = [];
  
  // Check for common TS patterns in text content (very limited runtime detection)
  const textContent = root.textContent || '';
  
  if (textContent.includes(' as ')) {
    issues.push({
      category: 'TYPESCRIPT_SYNTAX',
      message: 'Potential TypeScript "as" cast found in text content',
      severity: 'LOW',
    });
  }

  return issues;
}

/**
 * Check for missing primitive usage (raw buttons/badges instead of Nexus primitives)
 * @param {HTMLElement} root - Component root
 * @returns {Array<Object>} - List of non-compliant elements
 */
function detectMissingPrimitives(root) {
  const issues = [];
  
  // Find raw buttons that aren't wrapped in NexusButton
  const rawButtons = root.querySelectorAll('button:not([data-nexus-button])');
  rawButtons.forEach((button) => {
    // Skip if it's inside a known UI library component
    const isLibraryComponent = button.closest('[data-radix-popper-content-wrapper]') || 
                               button.closest('[role="dialog"]') ||
                               button.closest('.ui-component');
    
    if (!isLibraryComponent && button.textContent?.trim()) {
      issues.push({
        category: 'MISSING_PRIMITIVE',
        message: 'Raw <button> found. Use NexusButton instead.',
        element: button.tagName.toLowerCase(),
        text: button.textContent.trim().slice(0, 30),
        severity: 'MEDIUM',
      });
    }
  });

  return issues;
}

/**
 * Check for decorative gradients in persistent panels
 * @param {HTMLElement} root - Component root
 * @returns {Array<Object>} - List of gradient violations
 */
function detectDecorativeGradients(root) {
  const issues = [];
  
  const gradientElements = root.querySelectorAll('[class*="bg-gradient"]');
  gradientElements.forEach((element) => {
    // Allow gradients in specific contexts (hero sections, CTAs)
    const isAllowed = element.closest('.hero') || 
                      element.closest('.cta') ||
                      element.classList.contains('nexus-boot-overlay');
    
    if (!isAllowed) {
      issues.push({
        category: 'DECORATIVE_GRADIENT',
        message: 'Decorative gradient found in persistent panel. Remove or use solid backgrounds.',
        element: element.tagName.toLowerCase(),
        className: element.className,
        severity: 'LOW',
      });
    }
  });

  return issues;
}

/**
 * Run comprehensive regression test suite
 * @param {HTMLElement} root - Root component element
 * @param {Object} options - Test options
 * @param {boolean} [options.includeTypography=true] - Run typography tests
 * @param {boolean} [options.includeViewport=true] - Run viewport tests
 * @param {boolean} [options.includeStyle=true] - Run style guide tests
 * @param {boolean} [options.strict=false] - Throw on failures
 * @returns {Object} - Comprehensive test report
 */
export function runRegressionTests(root, options = {}) {
  const {
    includeTypography = true,
    includeViewport = true,
    includeStyle = true,
    strict = false,
  } = options;

  if (!root || !(root instanceof HTMLElement)) {
    throw new Error('Invalid root element for regression tests');
  }

  const results = {
    typography: null,
    viewport: null,
    styleGuide: null,
    typescript: [],
    primitives: [],
    gradients: [],
  };

  try {
    if (includeTypography) {
      results.typography = runTypographyAudit(root, { strict: false });
    }
  } catch (error) {
    results.typography = { error: error.message };
  }

  try {
    if (includeViewport) {
      results.viewport = runViewportAudit(root, { allowInternalScroll: true });
    }
  } catch (error) {
    results.viewport = { error: error.message };
  }

  try {
    if (includeStyle) {
      results.styleGuide = runFullAudit(root, { strict: false });
    }
  } catch (error) {
    results.styleGuide = { error: error.message };
  }

  results.typescript = detectTypeScriptRemnants(root);
  results.primitives = detectMissingPrimitives(root);
  results.gradients = detectDecorativeGradients(root);

  const allViolations = [
    ...(results.typography?.violations || []),
    ...(results.viewport?.violations || []),
    ...(results.styleGuide?.violations || []),
    ...results.typescript,
    ...results.primitives,
    ...results.gradients,
  ];

  const passed = allViolations.length === 0;
  const criticalCount = allViolations.filter((v) => v.severity === 'HIGH').length;
  const warningCount = allViolations.filter((v) => v.severity === 'MEDIUM').length;
  const minorCount = allViolations.filter((v) => v.severity === 'LOW').length;

  const overallScore = Math.max(0, 100 - criticalCount * 20 - warningCount * 10 - minorCount * 5);

  const report = {
    passed,
    overallScore,
    summary: passed
      ? 'All regression tests passed. Component is compliant.'
      : `${allViolations.length} issues detected (${criticalCount} critical, ${warningCount} warnings, ${minorCount} minor)`,
    results,
    allViolations,
    stats: { criticalCount, warningCount, minorCount, total: allViolations.length },
  };

  if (strict && !passed) {
    throw new Error(`Regression tests failed: ${report.summary}`);
  }

  return report;
}

/**
 * React hook for regression testing on mount
 * @param {string} componentName - Component name for logging
 * @param {Object} options - Test options
 * @returns {React.RefObject} - Ref to attach to root element
 */
export function useRegressionTests(componentName, options = {}) {
  const { useRef, useEffect } = require('react');
  const ref = useRef(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (process.env.NODE_ENV !== 'development') return;
    if (!ref.current) return;

    ranRef.current = true;

    try {
      const report = runRegressionTests(ref.current, options);
      
      const prefix = `[Regression] ${componentName}`;
      const scoreColor = report.overallScore >= 90 ? '\x1b[32m' : report.overallScore >= 70 ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${prefix} - Overall: ${scoreColor}${report.overallScore}%${reset}`);
      console.log(`${prefix} - ${report.summary}`);

      if (report.stats.criticalCount > 0) {
        console.error(`${prefix} - ${report.stats.criticalCount} CRITICAL issues found`);
      }

      if (report.allViolations.length > 0 && report.allViolations.length <= 10) {
        console.group(`${prefix} - Issues`);
        report.allViolations.forEach((violation) => {
          const logFn = violation.severity === 'HIGH' ? console.error : violation.severity === 'MEDIUM' ? console.warn : console.log;
          logFn(`  - [${violation.category}] ${violation.message}`);
        });
        console.groupEnd();
      }
    } catch (error) {
      console.error(`[Regression] ${componentName} - Tests failed:`, error.message);
    }
  }, [componentName, options.includeTypography, options.includeViewport, options.includeStyle]);

  return ref;
}

/**
 * Batch regression test for multiple components
 * Useful for page-level or workspace-level validation
 * @param {Array<HTMLElement>} components - Components to test
 * @param {Array<string>} names - Component names
 * @returns {Object} - Aggregate report
 */
export function runBatchRegressionTests(components, names) {
  const reports = components.map((component, index) => {
    try {
      return {
        name: names[index] || `Component ${index}`,
        report: runRegressionTests(component, { strict: false }),
      };
    } catch (error) {
      return {
        name: names[index] || `Component ${index}`,
        error: error.message,
      };
    }
  });

  const totalScore = reports.reduce((sum, entry) => sum + (entry.report?.overallScore || 0), 0);
  const avgScore = reports.length > 0 ? Math.round(totalScore / reports.length) : 0;
  const totalViolations = reports.reduce((sum, entry) => sum + (entry.report?.allViolations.length || 0), 0);

  return {
    avgScore,
    totalViolations,
    reports,
    summary: `Batch test: ${avgScore}% avg compliance, ${totalViolations} total violations across ${reports.length} components`,
  };
}