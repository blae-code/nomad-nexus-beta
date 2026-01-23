import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Trash2, Plus, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccessKeyManager() {
  const [showForm, setShowForm] = useState(false);
  const [grantRank, setGrantRank] = useState('VAGRANT');
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [issuingKey, setIssuingKey] = useState(false);
  const [issued, setIssued] = useState(null);
  const queryClient = useQueryClient();

  // Fetch access keys
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['access-keys'],
    queryFn: () => base44.entities.AccessKey.list('-created_date', 50),
  });

  // Issue key
  const handleIssueKey = async (e) => {
    e.preventDefault();
    setIssuingKey(true);

    try {
      const response = await base44.functions.invoke('issueAccessKey', {
        grants_rank: grantRank,
        max_uses: maxUses,
        note: note || undefined
      });

      setIssued(response.data);
      queryClient.invalidateQueries({ queryKey: ['access-keys'] });
      
      // Reset form
      setGrantRank('VAGRANT');
      setMaxUses(1);
      setNote('');
      setShowForm(false);
    } catch (err) {
      console.error('Issue key error:', err);
      alert('Failed to issue key: ' + err.message);
    } finally {
      setIssuingKey(false);
    }
  };

  // Revoke key
  const handleRevokeKey = async (code) => {
    if (!confirm('Revoke this key? It cannot be used anymore.')) return;

    try {
      await base44.functions.invoke('revokeAccessKey', { code });
      queryClient.invalidateQueries({ queryKey: ['access-keys'] });
    } catch (err) {
      console.error('Revoke error:', err);
      alert('Failed to revoke key');
    }
  };

  const statusColor = (status) => {
    return {
      'ACTIVE': 'text-green-400 bg-green-950/30',
      'REDEEMED': 'text-blue-400 bg-blue-950/30',
      'REVOKED': 'text-red-400 bg-red-950/30',
      'EXPIRED': 'text-amber-400 bg-amber-950/30'
    }[status] || 'text-zinc-400 bg-zinc-800/30';
  };

  return (
    <div className="space-y-4">
      {/* Issued Key Banner */}
      {issued && (
        <div className="p-3 bg-green-950/40 border border-green-800/60 rounded space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-xs font-mono text-green-300 font-bold">Key Issued Successfully</p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded">
            <code className="flex-1 text-xs font-mono text-white">{issued.code}</code>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6"
              onClick={() => {
                navigator.clipboard.writeText(issued.code);
              }}
            >
              <Copy className="w-3 h-3 text-zinc-400 hover:text-zinc-200" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIssued(null)}
            className="text-[10px] w-full"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Issue Key Form */}
      {showForm ? (
        <form onSubmit={handleIssueKey} className="space-y-3 p-3 bg-zinc-900/50 border border-zinc-800">
          <div>
            <label className="text-xs font-mono text-zinc-400">Rank</label>
            <select
              value={grantRank}
              onChange={(e) => setGrantRank(e.target.value)}
              disabled={issuingKey}
              className="w-full h-8 px-2 text-xs bg-zinc-950 border border-zinc-700 text-white rounded mt-1"
            >
              <option>VAGRANT</option>
              <option>SCOUT</option>
              <option>VOYAGER</option>
              <option>FOUNDER</option>
              <option>PIONEER</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-zinc-400">Max Uses</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value))}
              disabled={issuingKey}
              className="h-8 text-xs bg-zinc-950 border-zinc-700 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-zinc-400">Note (optional)</label>
            <Input
              placeholder="e.g., Squad recruitment batch #1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={issuingKey}
              className="h-8 text-xs bg-zinc-950 border-zinc-700 mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={issuingKey}
              className="text-xs flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={issuingKey}
              className="text-xs flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90"
            >
              {issuingKey && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Issue Key
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="w-full gap-2 text-xs bg-[#ea580c] hover:bg-[#ea580c]/90"
        >
          <Plus className="w-3 h-3" />
          Issue New Key
        </Button>
      )}

      {/* Keys List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-zinc-500">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-4 text-xs text-zinc-500">No keys issued yet</div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="p-3 bg-zinc-900/30 border border-zinc-800 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <code className="font-mono text-white bg-zinc-950/60 px-2 py-1 rounded">
                  {key.code}
                </code>
                <span className={cn('text-[9px] font-bold uppercase px-2 py-1 rounded', statusColor(key.status))}>
                  {key.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="space-y-0.5">
                  <p className="text-zinc-400">Rank: <span className="text-[#ea580c] font-bold">{key.grants_rank}</span></p>
                  <p className="text-zinc-400">Uses: <span className="text-white">{key.uses_count}/{key.max_uses}</span></p>
                  {key.note && <p className="text-zinc-500 italic">{key.note}</p>}
                </div>

                {key.status === 'ACTIVE' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRevokeKey(key.code)}
                    className="w-6 h-6"
                  >
                    <Trash2 className="w-3 h-3 text-red-400 hover:text-red-300" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}