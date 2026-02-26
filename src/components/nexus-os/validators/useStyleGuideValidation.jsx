/**
 * useStyleGuideValidation - React hook for development-time style compliance monitoring
 * 
 * Automatically runs full audit on component mount in development mode.
 * Logs compliance report to console for immediate feedback.
 * 
 * @see components/nexus-os/validators/styleGuideValidator.js
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import { useEffect, useRef } from 'react';
import { runFullAudit } from './styleGuideValidator';

/**
 * Hook for automatic style guide validation in development
 * 
 * @param {string} componentName - Name of component being validated
 * @param {Object} options - Validation options
 * @param {boolean} [options.strict=false] - Throw error on violations
 * @param {boolean} [options.enabled=true] - Enable/disable validation
 * @returns {React.RefObject} - Ref to attach to root component element
 * 
 * @example
 * export default function MyComponent() {
 *   const ref = useStyleGuideValidation('MyComponent');
 *   return <div ref={ref}>...</div>;
 * }
 */
export function useStyleGuideValidation(componentName, options = {}) {
  const { strict = false, enabled = true } = options;
  const ref = useRef(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (ranRef.current) return;
    if (process.env.NODE_ENV !== 'development') return;
    if (!ref.current) return;

    ranRef.current = true;

    try {
      const report = runFullAudit(ref.current, { strict });
      
      const prefix = `[StyleGuide] ${componentName}`;
      const score = report.complianceScore;
      const scoreColor = score >= 90 ? '\x1b[32m' : score >= 70 ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${prefix} - Compliance: ${scoreColor}${score}%${reset}`);
      console.log(`${prefix} - ${report.summary}`);

      if (report.violations.length > 0) {
        console.group(`${prefix} - Violations (${report.violations.length})`);
        report.violations.forEach((violation) => {
          console.warn(`  - [${violation.category}] ${violation.message}`);
        });
        console.groupEnd();
      }

      if (score >= 90) {
        console.log(`${prefix} - ✅ COMPLIANT`);
      } else if (score >= 70) {
        console.warn(`${prefix} - ⚠️ NEEDS IMPROVEMENT`);
      } else {
        console.error(`${prefix} - ❌ NON-COMPLIANT`);
      }
    } catch (error) {
      console.error(`[StyleGuide] ${componentName} - Validation failed:`, error.message);
    }
  }, [componentName, strict, enabled]);

  return ref;
}

/**
 * Hook for batch validation of multiple components
 * Useful for page-level or workspace-level compliance checks
 * 
 * @param {Array<{name: string, ref: React.RefObject}>} components - Array of components to validate
 * @returns {Object} - Aggregate compliance report
 */
export function useBatchStyleGuideValidation(components) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (process.env.NODE_ENV !== 'development') return;

    ranRef.current = true;

    const reports = components
      .filter((component) => component.ref?.current)
      .map((component) => {
        try {
          const report = runFullAudit(component.ref.current, { strict: false });
          return { name: component.name, report };
        } catch (error) {
          return { name: component.name, report: null, error: error.message };
        }
      });

    const totalScore = reports.reduce((sum, entry) => sum + (entry.report?.complianceScore || 0), 0);
    const avgScore = reports.length > 0 ? Math.round(totalScore / reports.length) : 0;
    const totalViolations = reports.reduce((sum, entry) => sum + (entry.report?.violations.length || 0), 0);

    console.group(`[StyleGuide] Batch Validation - ${components.length} components`);
    console.log(`Average compliance: ${avgScore}%`);
    console.log(`Total violations: ${totalViolations}`);
    
    reports.forEach(({ name, report, error }) => {
      if (error) {
        console.error(`  - ${name}: Validation failed - ${error}`);
      } else if (report) {
        const scoreColor = report.complianceScore >= 90 ? '\x1b[32m' : report.complianceScore >= 70 ? '\x1b[33m' : '\x1b[31m';
        const reset = '\x1b[0m';
        console.log(`  - ${name}: ${scoreColor}${report.complianceScore}%${reset} (${report.violations.length} violations)`);
      }
    });
    
    console.groupEnd();

    return { avgScore, totalViolations, reports };
  }, [components]);
}