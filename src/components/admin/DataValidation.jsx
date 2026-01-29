/**
 * DataValidation — Inspect, validate, and repair data
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateAll, repairAll } from '@/components/services/dataRegistry';
import { useNotification } from '@/components/providers/NotificationContext';

export default function DataValidation() {
  const [phase, setPhase] = useState('idle'); // idle | validating | done
  const [validationReport, setValidationReport] = useState(null);
  const [expandedDomains, setExpandedDomains] = useState({});
  const { addNotification } = useNotification();

  const handleValidate = async () => {
    setPhase('validating');

    try {
      const report = await validateAll();
      setValidationReport(report);
      setPhase('done');

      addNotification({
        type: 'info',
        title: 'Validation complete',
        message: `${report.totalRecords} records across all domains`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Validation failed',
        message: error.message,
      });
      setPhase('idle');
    }
  };

  const handleRepair = async () => {
    try {
      const result = await repairAll();
      addNotification({
        type: 'success',
        title: 'Repair complete',
        message: result.message,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Repair failed',
        message: error.message,
      });
    }
  };

  const handleCopyReport = () => {
    const text = JSON.stringify(validationReport, null, 2);
    navigator.clipboard.writeText(text);
    addNotification({
      type: 'success',
      title: 'Report copied',
      message: 'Validation report copied to clipboard',
    });
  };

  if (phase === 'idle' && !validationReport) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <h3 className="font-bold text-zinc-200 mb-2">Data Validation</h3>
          <p className="text-sm text-zinc-400">
            Inspect all data domains for errors, orphans, and consistency.
          </p>
        </div>

        <Button onClick={handleValidate} className="w-full bg-orange-600 hover:bg-orange-500">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Validate All Data
        </Button>
      </div>
    );
  }

  if (phase === 'validating') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-zinc-200">Validating...</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done' && validationReport) {
    const issueCount = validationReport.issues.length;
    const hasErrors = validationReport.issues.some((i) => i.severity === 'error');

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className={`p-4 border rounded ${
          hasErrors ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'
        }`}>
          <div className="flex items-start gap-3">
            {hasErrors ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={`font-bold mb-1 ${
                hasErrors ? 'text-red-400' : 'text-green-400'
              }`}>
                Validation {hasErrors ? 'Issues Found' : 'Complete'}
              </h3>
              <div className="text-sm text-zinc-400">
                <div>
                  <span className="font-mono">{validationReport.totalRecords}</span> total records
                </div>
                <div>
                  <span className="font-mono">{issueCount}</span> {issueCount === 1 ? 'issue' : 'issues'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Details */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(validationReport.domains).map(([domainKey, domainData]) => {
            if (domainData.status === 'unavailable') return null;

            const isExpanded = expandedDomains[domainKey];
            const domainIssues = validationReport.issues.filter((i) => i.domain === domainKey);

            return (
              <div key={domainKey} className="bg-zinc-800/30 border border-zinc-700/50 rounded">
                <button
                  onClick={() => setExpandedDomains((prev) => ({
                    ...prev,
                    [domainKey]: !prev[domainKey],
                  }))}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-zinc-700/30 transition-colors text-left"
                >
                  <span className="font-bold text-zinc-300 capitalize">
                    {domainKey.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-400">{domainData.count} records</span>
                    {domainData.status === 'error' && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 py-2 border-t border-zinc-700/30 text-xs text-zinc-400 space-y-1">
                    {domainData.status === 'error' && (
                      <div className="text-red-400">{domainData.error}</div>
                    )}
                    {domainIssues.map((issue, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className={`flex-shrink-0 ${
                          issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {issue.severity === 'error' ? '✕' : '⚠'}
                        </span>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                    {domainIssues.length === 0 && domainData.status === 'ok' && (
                      <div className="text-green-400">✓ No issues</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setPhase('idle');
              setValidationReport(null);
              setExpandedDomains({});
            }}
          >
            Back
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyReport}
            title="Copy report as JSON"
          >
            <Copy className="w-4 h-4" />
          </Button>
          {hasErrors && (
            <Button
              className="flex-1"
              onClick={handleRepair}
            >
              Repair
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}