import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';

export default function CommsQueryPanel() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const activeOp = useActiveOp();

  const submitQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await base44.functions.invoke('commsAssistant', {
        action: 'ask_comms',
        data: { query: query.trim(), eventId: activeOp?.activeEventId || null },
      });
      setAnswer(response?.data?.answer || response?.data?.response?.answer || response?.data?.summary || 'No response');
    } catch (error) {
      console.error('Comms query failed:', error);
      setAnswer('Unable to retrieve comms intelligence right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Ask Riggsy</div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What is the ammo status of Bravo Squad?"
        />
        <Button onClick={submitQuery} disabled={!query.trim() || loading} className="w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Querying...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Ask</>
          )}
        </Button>
      </div>

      {answer && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 text-sm text-zinc-200 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}
