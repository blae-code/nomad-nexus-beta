import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'operations', label: 'Operations Summary' },
  { value: 'members', label: 'Member Analytics' },
  { value: 'assets', label: 'Fleet Report' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

const DATE_RANGES = [
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportFilters({ filters, onFiltersChange, onGenerate, generating }) {
  const handleChange = (field, value) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-zinc-900/50 border-2 border-zinc-800 rounded p-6 space-y-6">
      {/* Report Type */}
      <div>
        <label className="text-sm font-bold text-zinc-300 block mb-3">Report Type</label>
        <div className="space-y-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleChange('reportType', type.value)}
              className={`w-full text-left p-2 rounded transition border ${
                filters.reportType === type.value
                  ? 'bg-blue-500/20 border-blue-500'
                  : 'bg-zinc-800/30 border-zinc-700 hover:border-blue-500/50'
              }`}
            >
              <span className="text-sm font-semibold">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="text-sm font-bold text-zinc-300 block mb-3">Time Period</label>
        <div className="space-y-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleChange('dateRange', range.value)}
              className={`w-full text-left p-2 rounded transition border ${
                filters.dateRange === range.value
                  ? 'bg-blue-500/20 border-blue-500'
                  : 'bg-zinc-800/30 border-zinc-700 hover:border-blue-500/50'
              }`}
            >
              <span className="text-sm font-semibold">{range.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      {filters.dateRange === 'custom' && (
        <div className="space-y-3 p-3 bg-blue-950/20 border border-blue-600/30 rounded">
          <div>
            <label className="text-xs text-zinc-400">Start Date</label>
            <Input type="date" value={filters.startDate.toISOString().split('T')[0]} onChange={(e) => handleChange('startDate', new Date(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400">End Date</label>
            <Input type="date" value={filters.endDate.toISOString().split('T')[0]} onChange={(e) => handleChange('endDate', new Date(e.target.value))} />
          </div>
        </div>
      )}

      {/* Include Options */}
      <div>
        <label className="text-sm font-bold text-zinc-300 block mb-3">Include in Report</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              checked={filters.includeMembers}
              onCheckedChange={(checked) => handleChange('includeMembers', checked)}
            />
            <label className="text-sm text-zinc-300 cursor-pointer">Member Data</label>
          </div>
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              checked={filters.includeAssets}
              onCheckedChange={(checked) => handleChange('includeAssets', checked)}
            />
            <label className="text-sm text-zinc-300 cursor-pointer">Fleet Assets</label>
          </div>
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              checked={filters.includeRiskAssessment}
              onCheckedChange={(checked) => handleChange('includeRiskAssessment', checked)}
            />
            <label className="text-sm text-zinc-300 cursor-pointer">Risk Assessment</label>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button onClick={onGenerate} disabled={generating} className="w-full">
        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {generating ? 'Generating...' : 'Generate Report'}
      </Button>
    </div>
  );
}