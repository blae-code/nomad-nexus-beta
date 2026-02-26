/**
 * batchComplianceAudit - Utility for running compliance audits across multiple components
 * 
 * Provides programmatic interface for bulk validation during development.
 * Useful for CI/CD integration and pre-deployment checks.
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import { runFullAudit } from './styleGuideValidator';
import { runViewportAudit } from './viewportValidator';
import { runTypographyAudit } from './typographyValidator';
import { runRegressionTests } from './regressionTests';

/**
 * Component audit result structure
 */
export const AUDIT_STATUS = {
  PASS: 'PASS',
  WARN: 'WARN',
  FAIL: 'FAIL',
  ERROR: 'ERROR',
};

/**
 * Run comprehensive audit on a single component
 * @param {HTMLElement} element - Component root element
 * @param {string} componentName - Component identifier
 * @param {Object} options - Audit options
 * @returns {Object} - Audit result summary
 */
export function auditComponent(element, componentName, options = {}) {
  const {
    includeStyle = true,
    includeViewport = true,
    includeTypography = true,
    includeRegression = false,
  } = options;

  const results = {
    componentName,
    timestamp: new Date().toISOString(),
    status: AUDIT_STATUS.PASS,
    scores: {},
    violations: [],
    warnings: [],
    errors: [],
  };

  try {
    if (includeStyle) {
      const styleReport = runFullAudit(element, { strict: false });
      results.scores.style = styleReport.complianceScore;
      results.violations.push(...styleReport.violations.map((v) => ({ ...v, category: `STYLE:${v.category}` })));
      if (styleReport.complianceScore < 70) results.status = AUDIT_STATUS.FAIL;
      else if (styleReport.complianceScore < 90) results.status = AUDIT_STATUS.WARN;
    }
  } catch (error) {
    results.errors.push({ category: 'STYLE_AUDIT', message: error.message });
    results.status = AUDIT_STATUS.ERROR;
  }

  try {
    if (includeViewport) {
      const viewportReport = runViewportAudit(element, { allowInternalScroll: true });
      results.scores.viewport = viewportReport.complianceScore;
      results.violations.push(...viewportReport.violations.map((v) => ({ ...v, category: `VIEWPORT:${v.category}` })));
      results.warnings.push(...viewportReport.warnings.map((w) => ({ ...w, category: `VIEWPORT:${w.category}` })));
      if (viewportReport.violations.length > 0) results.status = AUDIT_STATUS.FAIL;
    }
  } catch (error) {
    results.errors.push({ category: 'VIEWPORT_AUDIT', message: error.message });
    if (results.status !== AUDIT_STATUS.ERROR) results.status = AUDIT_STATUS.ERROR;
  }

  try {
    if (includeTypography) {
      const typographyReport = runTypographyAudit(element, { strict: false });
      results.scores.typography = typographyReport.complianceScore;
      results.violations.push(...typographyReport.violations.map((v) => ({ ...v, category: `TYPOGRAPHY:${v.category}` })));
      if (typographyReport.complianceScore < 70 && results.status === AUDIT_STATUS.PASS) results.status = AUDIT_STATUS.FAIL;
      else if (typographyReport.complianceScore < 90 && results.status === AUDIT_STATUS.PASS) results.status = AUDIT_STATUS.WARN;
    }
  } catch (error) {
    results.errors.push({ category: 'TYPOGRAPHY_AUDIT', message: error.message });
    if (results.status !== AUDIT_STATUS.ERROR) results.status = AUDIT_STATUS.ERROR;
  }

  try {
    if (includeRegression) {
      const regressionReport = runRegressionTests(element, { strict: false });
      results.scores.overall = regressionReport.overallScore;
      results.violations.push(...regressionReport.allViolations.map((v) => ({ ...v, category: `REGRESSION:${v.category}` })));
      if (regressionReport.overallScore < 70 && results.status === AUDIT_STATUS.PASS) results.status = AUDIT_STATUS.FAIL;
      else if (regressionReport.overallScore < 90 && results.status === AUDIT_STATUS.PASS) results.status = AUDIT_STATUS.WARN;
    }
  } catch (error) {
    results.errors.push({ category: 'REGRESSION_AUDIT', message: error.message });
    if (results.status !== AUDIT_STATUS.ERROR) results.status = AUDIT_STATUS.ERROR;
  }

  return results;
}

/**
 * Run batch audit on multiple components
 * @param {Array<{element: HTMLElement, name: string}>} components - Components to audit
 * @param {Object} options - Audit options
 * @returns {Object} - Batch audit summary
 */
export function auditComponentBatch(components, options = {}) {
  const results = components.map(({ element, name }) => auditComponent(element, name, options));
  
  const summary = {
    totalComponents: results.length,
    passed: results.filter((r) => r.status === AUDIT_STATUS.PASS).length,
    warnings: results.filter((r) => r.status === AUDIT_STATUS.WARN).length,
    failed: results.filter((r) => r.status === AUDIT_STATUS.FAIL).length,
    errors: results.filter((r) => r.status === AUDIT_STATUS.ERROR).length,
    timestamp: new Date().toISOString(),
    results,
  };

  return summary;
}

/**
 * Format audit results for console output
 * @param {Object} summary - Batch audit summary
 * @returns {string} - Formatted report
 */
export function formatAuditReport(summary) {
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('NexusOS Component Compliance Audit');
  lines.push(`Timestamp: ${summary.timestamp}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Total Components: ${summary.totalComponents}`);
  lines.push(`✅ Passed: ${summary.passed}`);
  lines.push(`⚠️  Warnings: ${summary.warnings}`);
  lines.push(`❌ Failed: ${summary.failed}`);
  lines.push(`🔥 Errors: ${summary.errors}`);
  lines.push('');

  if (summary.failed > 0 || summary.errors > 0) {
    lines.push('Critical Issues:');
    lines.push('-'.repeat(60));
    summary.results
      .filter((r) => r.status === AUDIT_STATUS.FAIL || r.status === AUDIT_STATUS.ERROR)
      .forEach((result) => {
        lines.push(`\n[${result.status}] ${result.componentName}`);
        lines.push(`  Scores: ${JSON.stringify(result.scores)}`);
        if (result.violations.length > 0) {
          lines.push(`  Violations: ${result.violations.length}`);
          result.violations.slice(0, 3).forEach((v) => {
            lines.push(`    - [${v.severity || 'UNKNOWN'}] ${v.category}: ${v.message}`);
          });
        }
        if (result.errors.length > 0) {
          lines.push(`  Errors: ${result.errors.length}`);
          result.errors.forEach((e) => {
            lines.push(`    - ${e.category}: ${e.message}`);
          });
        }
      });
  }

  lines.push('');
  lines.push('='.repeat(60));
  return lines.join('\n');
}

/**
 * Run audit and log results to console
 * @param {Array<{element: HTMLElement, name: string}>} components - Components to audit
 * @param {Object} options - Audit options
 */
export function runAndLogAudit(components, options = {}) {
  const summary = auditComponentBatch(components, options);
  const report = formatAuditReport(summary);
  console.log(report);
  return summary;
}