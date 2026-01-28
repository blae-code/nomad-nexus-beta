import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function WipeDataStep({ user, onAudit }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleWipeData = async () => {
    if (!confirmed) {
      toast.error('Please confirm the wipe operation');
      return;
    }

    const startTime = Date.now();
    setLoading(true);

    try {
      const response = await base44.functions.invoke('wipeAppData', {});
      const duration = Date.now() - startTime;

      setResults(response.data?.details || []);

      // Count deleted
      const totalDeleted = response.data?.details?.reduce((sum, d) => sum + (d.deleted || 0), 0) || 0;

      await onAudit(
        'wipe_data',
        'Clear all entities',
        'success',
        duration,
        { preserveAudit: true },
        { entities_wiped: response.data?.details?.length, total_deleted: totalDeleted },
        null
      );

      toast.success(`Wiped ${totalDeleted} records from ${response.data?.details?.length} entities`);
      setConfirmed(false);
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'wipe_data',
        'Clear all entities',
        'failure',
        duration,
        {},
        {},
        err.message
      );
      toast.error('Wipe failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-[9px] text-red-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>This will delete ALL app data except audit logs. This cannot be undone.</div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-[9px] text-zinc-300 hover:text-zinc-100 transition-colors">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-3 h-3"
        />
        I understand the consequences and want to proceed
      </label>

      <Button
        size="sm"
        onClick={handleWipeData}
        disabled={!confirmed || loading}
        className="w-full gap-2 text-[10px] h-7 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/50"
      >
        <Trash2 className="w-3 h-3" />
        {loading ? 'Wiping...' : 'Wipe All Data'}
      </Button>

      {results && results.length > 0 && (
        <div className="grid grid-cols-2 gap-1 text-[8px]">
          {results.map(r => (
            <div key={r.entity} className="p-1.5 bg-zinc-900/50 border border-zinc-800 rounded">
              <p className="font-bold text-zinc-300">{r.entity}</p>
              <p className={r.success ? 'text-green-400' : 'text-red-400'}>
                {r.deleted} deleted
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}