import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const CORE_ENTITIES = ['User', 'Event', 'VoiceNet', 'PlayerStatus'];

const EXPECTED_FIELDS = {
  User: ['id', 'email', 'full_name', 'role', 'created_date'],
  Event: ['id', 'title', 'start_time', 'status', 'phase', 'priority'],
  VoiceNet: ['id', 'code', 'label', 'type', 'discipline', 'status'],
  PlayerStatus: ['id', 'user_id', 'status', 'created_date', 'updated_date']
};

export default function SchemaContractCheck() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runContractCheck = async () => {
    setLoading(true);
    setError(null);
    const checkResults = [];

    for (const entityName of CORE_ENTITIES) {
      try {
        // Query with limit=1
        const records = await base44.entities[entityName].list('', 1);
        const passed = records && records.length > 0;

        let missingFields = [];
        if (passed && records.length > 0) {
          const record = records[0];
          const expected = EXPECTED_FIELDS[entityName] || [];
          missingFields = expected.filter(field => !(field in record));
        }

        checkResults.push({
          entity: entityName,
          status: passed ? (missingFields.length === 0 ? 'pass' : 'warn') : 'fail',
          missingFields,
          recordCount: records ? records.length : 0,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        checkResults.push({
          entity: entityName,
          status: 'fail',
          error: err.message,
          missingFields: [],
          timestamp: new Date().toISOString()
        });
      }
    }

    setResults(checkResults);
    setLoading(false);
  };

  useEffect(() => {
    runContractCheck();
  }, []);

  const overallStatus = results.length === 0 ? 'idle' : 
    results.some(r => r.status === 'fail') ? 'red' :
    results.some(r => r.status === 'warn') ? 'yellow' : 'green';

  const statusColors = {
    pass: 'bg-green-900/20 border-green-700/30 text-green-400',
    warn: 'bg-amber-900/20 border-amber-700/30 text-amber-400',
    fail: 'bg-red-900/20 border-red-700/30 text-red-400'
  };

  const statusIcons = {
    pass: <CheckCircle2 className="w-4 h-4" />,
    warn: <AlertTriangle className="w-4 h-4" />,
    fail: <AlertCircle className="w-4 h-4" />
  };

  const overallIcons = {
    green: <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />,
    yellow: <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />,
    red: <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />,
    idle: <div className="w-3 h-3 rounded-full bg-zinc-600" />
  };

  return (
    <div className="space-y-4">
      {/* Header & Overall Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <h3 className="text-sm font-bold text-zinc-200">Schema Contract Check</h3>
            <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
              Detects field drift across core entities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {overallIcons[overallStatus]}
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
              {overallStatus === 'red' && 'CRITICAL'}
              {overallStatus === 'yellow' && 'WARNING'}
              {overallStatus === 'green' && 'HEALTHY'}
              {overallStatus === 'idle' && 'CHECKING'}
            </span>
          </div>
          <button
            onClick={runContractCheck}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
            title="Re-run check"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-zinc-400', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-2">
        {results.map(result => (
          <div
            key={result.entity}
            className={cn(
              'p-2.5 rounded border',
              statusColors[result.status]
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">{result.entity}</span>
              {statusIcons[result.status]}
            </div>

            {result.status === 'fail' && result.error && (
              <p className="text-[8px] text-red-300 mb-1">{result.error}</p>
            )}

            {result.missingFields.length > 0 && (
              <div className="text-[8px] text-zinc-300 space-y-0.5">
                <p className="font-mono text-amber-300">Missing:</p>
                {result.missingFields.map(field => (
                  <p key={field} className="font-mono ml-2">• {field}</p>
                ))}
              </div>
            )}

            {result.status === 'pass' && (
              <p className="text-[8px] text-green-300 font-mono">✓ All fields present</p>
            )}

            <p className="text-[7px] text-zinc-500 mt-1 font-mono">
              {result.timestamp && new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="border-t border-zinc-800 pt-2">
        <div className="grid grid-cols-3 gap-2 text-[8px]">
          <div className="flex items-center gap-1.5 text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Pass: All fields</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Warn: Fields missing</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>Fail: No records</span>
          </div>
        </div>
      </div>
    </div>
  );
}