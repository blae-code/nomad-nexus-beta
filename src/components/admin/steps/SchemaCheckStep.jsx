import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CORE_ENTITIES = ['User', 'Event', 'VoiceNet', 'PlayerStatus', 'Channel', 'Message'];

const EXPECTED_FIELDS = {
  User: ['id', 'email', 'full_name', 'role', 'created_date'],
  Event: ['id', 'title', 'start_time', 'status', 'phase', 'priority'],
  VoiceNet: ['id', 'code', 'label', 'type', 'discipline', 'status'],
  PlayerStatus: ['id', 'user_id', 'status', 'created_date'],
  Channel: ['id', 'name', 'type'],
  Message: ['id', 'channel_id', 'user_id', 'content']
};

export default function SchemaCheckStep({ user, onAudit, auditLogs }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runSchemaCheck = async () => {
    const startTime = Date.now();
    setLoading(true);
    const checkResults = [];
    let successCount = 0;
    let warnCount = 0;
    let failCount = 0;

    try {
      for (const entityName of CORE_ENTITIES) {
        try {
          const startEntity = Date.now();
          const records = await base44.entities[entityName].list('-created_date', 1);
          const latency = Date.now() - startEntity;
          const passed = records && records.length > 0;

          let missingFields = [];
          if (passed && records.length > 0) {
            const record = records[0];
            const expected = EXPECTED_FIELDS[entityName] || [];
            missingFields = expected.filter(field => !(field in record));
          }

          const status = passed ? (missingFields.length === 0 ? 'pass' : 'warn') : 'fail';
          if (status === 'pass') successCount++;
          if (status === 'warn') warnCount++;
          if (status === 'fail') failCount++;

          checkResults.push({
            entity: entityName,
            status,
            missingFields,
            recordCount: records ? records.length : 0,
            latency
          });
        } catch (err) {
          failCount++;
          checkResults.push({
            entity: entityName,
            status: 'fail',
            error: err.message,
            missingFields: [],
            latency: 0
          });
        }
      }

      // Test server functions
      let serverFunctionStatus = 'pass';
      try {
        await base44.functions.invoke('getLiveKitRoomStatus', { roomName: 'nn_healthcheck' });
      } catch (err) {
        serverFunctionStatus = 'warn';
      }

      const duration = Date.now() - startTime;
      setResults(checkResults);

      // Log audit
      await onAudit(
        'schema_check',
        'Probe entities & functions',
        failCount === 0 ? 'success' : warnCount > 0 ? 'warning' : 'failure',
        duration,
        { entities: CORE_ENTITIES.length },
        { pass: successCount, warn: warnCount, fail: failCount, serverFunctions: serverFunctionStatus },
        failCount > 0 ? 'Some entities failed checks' : null
      );

      toast.success('Schema check complete');
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'schema_check',
        'Probe entities & functions',
        'failure',
        duration,
        {},
        {},
        err.message
      );
      toast.error('Schema check failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pass: 'bg-green-900/20 border-green-700/30 text-green-400',
    warn: 'bg-amber-900/20 border-amber-700/30 text-amber-400',
    fail: 'bg-red-900/20 border-red-700/30 text-red-400'
  };

  const statusIcons = {
    pass: <CheckCircle2 className="w-3 h-3" />,
    warn: <AlertTriangle className="w-3 h-3" />,
    fail: <AlertCircle className="w-3 h-3" />
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        onClick={runSchemaCheck}
        disabled={loading}
        className="w-full gap-2 text-[10px] h-7"
      >
        <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        {loading ? 'Running...' : 'Run Schema Check'}
      </Button>

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
          {results.map(result => (
            <div
              key={result.entity}
              className={cn('p-2 border rounded', statusColors[result.status])}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold text-[9px]">{result.entity}</span>
                {statusIcons[result.status]}
              </div>
              
              {result.error && (
                <p className="text-[8px] text-red-300">{result.error}</p>
              )}

              {result.missingFields.length > 0 && (
                <div className="text-[8px] space-y-0.5">
                  <p className="text-amber-300">Missing:</p>
                  {result.missingFields.map(field => (
                    <p key={field} className="ml-2">• {field}</p>
                  ))}
                </div>
              )}

              {result.status === 'pass' && (
                <p className="text-[8px]">✓ {result.recordCount} records</p>
              )}

              {result.latency && (
                <p className="text-[7px] text-zinc-600 mt-1">{result.latency}ms</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}