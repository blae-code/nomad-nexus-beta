import React, { useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import AIFeatureToggle from '@/components/ai/AIFeatureToggle';

export default function CommsQueryPanel() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const activeOp = useActiveOp();
  const { aiFeaturesEnabled } = useAuth();
  const aiEnabled = aiFeaturesEnabled !== false;

  const submitQuery = async () => {
    if (!aiEnabled) {
      setAnswer('AI features are Disabled. Enable AI features to query comms intelligence.');
      return;
    }
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await invokeMemberFunction('commsAssistant', {
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
      <AIFeatureToggle
        label="Comms AI Access"
        description="Toggle AI-assisted comms queries for this profile."
      />
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">
          Ask Riggsy {aiEnabled ? '' : '· Disabled'}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={aiEnabled ? 'What is the ammo status of Bravo Squad?' : 'AI query is disabled'}
          disabled={!aiEnabled}
        />
        <Button onClick={submitQuery} disabled={!aiEnabled || !query.trim() || loading} className="w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Querying...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />{aiEnabled ? 'Ask' : 'Disabled'}</>
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
