import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Plus, Trash2, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AccessKeyManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [grantRank, setGrantRank] = useState('VAGRANT');
  const [note, setNote] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all access keys
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['access-keys'],
    queryFn: () => base44.entities.AccessKey.list('-created_date', 100),
    staleTime: 30000,
  });

  // Generate key mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('issueAccessKey', {
        grants_rank: grantRank,
        grants_roles: [],
        max_uses: 1,
        note
      });
      return result.data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data);
      queryClient.invalidateQueries({ queryKey: ['access-keys'] });
      setNote('');
      setIsGenerating(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to generate key');
    }
  });

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: (keyId) => base44.entities.AccessKey.update(keyId, { status: 'REVOKED' }),
    onSuccess: () => {
      toast.success('Key revoked');
      queryClient.invalidateQueries({ queryKey: ['access-keys'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to revoke key');
    }
  });

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  const activeKeys = keys.filter(k => k.status === 'ACTIVE');
  const usedKeys = keys.filter(k => k.status === 'REDEEMED');
  const revokedKeys = keys.filter(k => k.status === 'REVOKED' || k.status === 'EXPIRED');

  return (
    <div className="space-y-6">
      {/* Generated Key Modal */}
      {generatedKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-orange-500/50 rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Key Generated</h3>
              <button
                onClick={() => setGeneratedKey(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Your invite key has been created. Copy it below and share with the user.</p>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded p-3 flex items-center justify-between gap-2">
                <code className="font-mono font-bold text-emerald-400 text-sm truncate">{generatedKey.code}</code>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey.code);
                    toast.success('Copied to clipboard');
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>

              {generatedKey.note && (
                <div className="text-[9px] text-zinc-500">
                  <strong>Note:</strong> {generatedKey.note}
                </div>
              )}

              <Button
                onClick={() => setGeneratedKey(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate New Key Card */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Generate Invite Key</h3>
        
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Rank</label>
              <select
                value={grantRank}
                onChange={(e) => setGrantRank(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1.5 rounded"
              >
                <option value="VAGRANT">Vagrant</option>
                <option value="SCOUT">Scout</option>
                <option value="VOYAGER">Voyager</option>
                <option value="FOUNDER">Founder</option>
                <option value="PIONEER">Pioneer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Note (Optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Discord: username"
                className="bg-zinc-800 border-zinc-700 text-xs h-9"
              />
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full bg-[#ea580c] hover:bg-[#ea580c]/90 text-white text-xs font-bold gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Key'}
          </Button>
        </div>
      </div>

      {/* Keys List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-zinc-500 text-xs py-4">Loading keys...</div>
        ) : (
          <>
            {/* Active Keys */}
            {activeKeys.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Keys ({activeKeys.length})
                </h4>
                <div className="space-y-2">
                  {activeKeys.map(key => (
                    <div key={key.id} className="bg-zinc-800/50 rounded p-3 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-white">{key.code}</div>
                        <div className="text-[9px] text-zinc-500">
                          {key.note && `Note: ${key.note} • `}
                          Rank: {key.grants_rank} • Permanent
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(key.code)}
                          className="h-7 px-2 text-[10px]"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                          className="h-7 px-2 text-[10px] text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Used Keys */}
            {usedKeys.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Redeemed Keys ({usedKeys.length})
                </h4>
                <div className="space-y-2">
                  {usedKeys.map(key => (
                    <div key={key.id} className="bg-zinc-800/50 rounded p-3 text-xs">
                      <div className="font-mono font-bold text-zinc-400">{key.code}</div>
                      <div className="text-[9px] text-zinc-500">
                        Redeemed by {key.redeemed_by_user_ids?.length || 0} user(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revoked/Expired Keys */}
            {revokedKeys.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Revoked/Expired ({revokedKeys.length})
                </h4>
                <div className="space-y-2">
                  {revokedKeys.map(key => (
                    <div key={key.id} className="bg-zinc-800/50 rounded p-3 text-xs">
                      <div className="font-mono font-bold text-zinc-500 line-through">{key.code}</div>
                      <div className="text-[9px] text-zinc-600">Status: {key.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {keys.length === 0 && (
              <div className="text-center text-zinc-500 text-xs py-8">No keys yet. Generate one above.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}