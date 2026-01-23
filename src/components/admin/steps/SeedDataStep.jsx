import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SCALE_OPTIONS = [
  { value: 'light', label: 'Light (25%)', multiplier: 0.25 },
  { value: 'standard', label: 'Standard (100%)', multiplier: 1.0 },
  { value: 'heavy', label: 'Heavy (400%)', multiplier: 4.0 }
];

export default function SeedDataStep({ user, onAudit }) {
  const [scale, setScale] = useState('standard');
  const [seed, setSeed] = useState('424242');
  const [toggles, setToggles] = useState({
    comms_nets: true,
    tactical_markers: true,
    incidents: true,
    treasury: true,
    messages: true
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [featuredEvent, setFeaturedEvent] = useState(null);

  const toggleFeature = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSeed = async () => {
    const startTime = Date.now();
    setLoading(true);

    try {
      const scaleMultiplier = SCALE_OPTIONS.find(s => s.value === scale)?.multiplier || 1.0;

      const response = await base44.functions.invoke('populateSampleData', {
        seed: parseInt(seed),
        scale: scaleMultiplier,
        toggles
      });

      const duration = Date.now() - startTime;
      setResults(response.data?.created);

      // Find a focused event for featured link
      const events = await base44.entities.Event.filter({ event_type: 'focused' }, '-created_date', 1);
      if (events.length > 0) {
        setFeaturedEvent(events[0]);
      }

      const totalCreated = Object.values(response.data?.created || {}).reduce((a, b) => a + b, 0);

      await onAudit(
        'seed_data',
        'Create sample week of activity',
        'success',
        duration,
        { seed, scale, toggles },
        response.data?.created,
        null
      );

      toast.success(`Seeded ${totalCreated} records`);
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'seed_data',
        'Create sample week of activity',
        'failure',
        duration,
        { seed, scale, toggles },
        {},
        err.message
      );
      toast.error('Seed failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Scale selector */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-zinc-400 uppercase">Scale</label>
        <Select value={scale} onValueChange={setScale}>
          <SelectTrigger className="h-7 text-[9px] bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {SCALE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seed input */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-zinc-400 uppercase">Seed</label>
        <input
          type="number"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          className="w-full h-7 px-2 text-[9px] bg-zinc-900 border border-zinc-800 rounded text-zinc-300"
        />
      </div>

      {/* Feature toggles */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-zinc-400 uppercase">Features</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(toggles).map(([key, value]) => (
            <button
              key={key}
              onClick={() => toggleFeature(key)}
              className={cn(
                'px-2 py-1 text-[8px] font-bold border rounded transition-colors',
                value
                  ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400'
                  : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500'
              )}
            >
              {key.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Button
        size="sm"
        onClick={handleSeed}
        disabled={loading}
        className="w-full gap-2 text-[10px] h-7"
      >
        <Zap className="w-3 h-3" />
        {loading ? 'Seeding...' : 'Seed Faux Week'}
      </Button>

      {results && (
        <div className="grid grid-cols-2 gap-1 text-[8px]">
          {Object.entries(results).map(([key, count]) => (
            <div key={key} className="p-1.5 bg-zinc-900/50 border border-zinc-800 rounded">
              <p className="text-zinc-400">{key}</p>
              <p className="text-emerald-400 font-bold">{count}</p>
            </div>
          ))}
        </div>
      )}

      {featuredEvent && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-[9px] h-6 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20"
          onClick={() => window.location.href = `/commsconsole?eventId=${featuredEvent.id}`}
        >
          Open Demo Event
        </Button>
      )}
    </div>
  );
}