/**
 * ImmersiveSeed — Thematic placeholder data seeder
 * Populates demo data tagged as seeded and wipeable
 */

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { seedImmersive, wipeSeededOnly } from '@/components/services/dataRegistry';
import { useNotification } from '@/components/providers/NotificationContext';

export default function ImmersiveSeed() {
  const [phase, setPhase] = useState('idle'); // idle | seeding | done | wiping
  const [intensity, setIntensity] = useState('light'); // light | full
  const [progress, setProgress] = useState('');
  const [seedResult, setSeedResult] = useState(null);
  const { addNotification } = useNotification();

  const handleSeed = async () => {
    setPhase('seeding');
    setProgress('');

    try {
      setProgress('Populating users...');
      await new Promise((r) => setTimeout(r, 300));

      setProgress('Creating voice nets...');
      await new Promise((r) => setTimeout(r, 300));

      setProgress('Setting up channels...');
      await new Promise((r) => setTimeout(r, 300));

      setProgress('Creating events...');
      const result = await seedImmersive({ intensity });

      setSeedResult(result);
      setPhase('done');

      addNotification({
        type: 'success',
        title: 'Seed complete',
        message: `${intensity} immersive data loaded`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Seed failed',
        message: error.message,
      });
      setPhase('idle');
    }
  };

  const handleWipeSeeded = async () => {
    setPhase('wiping');
    setProgress('');

    try {
      setProgress('Removing seeded data...');
      const result = await wipeSeededOnly();

      addNotification({
        type: 'success',
        title: 'Seeded data wiped',
        message: `${result.totalDeleted} records deleted`,
      });

      setPhase('idle');
      setSeedResult(null);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Wipe failed',
        message: error.message,
      });
      setPhase('idle');
    }
  };

  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-400 mb-2">Immersive Seed</h3>
              <p className="text-sm text-zinc-400">
                Populate the app with thematic demo data (users, events, nets, channels, messages).
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                All seeded records are tagged and can be wiped without affecting non-seeded data.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-zinc-400 font-bold">Intensity</label>
          <div className="flex gap-2">
            {['light', 'full'].map((level) => (
              <button
                key={level}
                onClick={() => setIntensity(level)}
                className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${
                  intensity === level
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                    : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {level === 'light' ? '⚡ Light' : '⚡⚡ Full'}
              </button>
            ))}
          </div>
          <div className="text-xs text-zinc-500">
            {intensity === 'light'
              ? 'Few users, events, channels, and nets'
              : 'Many users, detailed events, rich channel history'}
          </div>
        </div>

        <Button onClick={handleSeed} className="w-full bg-blue-600 hover:bg-blue-500">
          <Sparkles className="w-4 h-4 mr-2" />
          Seed Immersive Data
        </Button>
      </div>
    );
  }

  if (phase === 'seeding') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-zinc-200">Seeding...</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">{progress}</p>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-400 mb-2">Seed Complete</h3>
              <p className="text-sm text-zinc-400">{seedResult?.message}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setPhase('idle');
              setSeedResult(null);
            }}
          >
            Done
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleWipeSeeded}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Wipe Seeded Data
          </Button>
        </div>
      </div>
    );
  }

  return null;
}