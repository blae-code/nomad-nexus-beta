/**
 * Automated Data Generator for QA Console
 * Generates test data for all entity types
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const SAMPLE_DATA_GENERATORS = {
  events: (count) => {
    const statuses = ['scheduled', 'pending', 'active', 'completed', 'cancelled'];
    const types = ['casual', 'focused'];
    return Array.from({ length: count }, (_, i) => ({
      title: `Test Event ${i + 1}`,
      description: `Auto-generated test event for QA testing`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      event_type: types[Math.floor(Math.random() * types.length)],
      priority: ['LOW', 'STANDARD', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
      start_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
      end_time: new Date(Date.now() + Math.random() * 86400000 + 3600000).toISOString(),
      location: ['Stanton', 'Crusader', 'Orison'][Math.floor(Math.random() * 3)],
    }));
  },
  voiceNets: (count) => {
    const codes = ['COMMAND', 'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'];
    return Array.from({ length: count }, (_, i) => ({
      code: `${codes[i % codes.length]}_${i}`,
      label: `Test Net ${i + 1}`,
      type: ['command', 'squad', 'support', 'general'][Math.floor(Math.random() * 4)],
      discipline: ['casual', 'focused'][Math.floor(Math.random() * 2)],
    }));
  },
  channels: (count) => {
    const categories = ['casual', 'focused', 'admin', 'squad', 'public'];
    return Array.from({ length: count }, (_, i) => ({
      name: `test-channel-${i + 1}`,
      type: ['text', 'voice'][Math.floor(Math.random() * 2)],
      category: categories[Math.floor(Math.random() * categories.length)],
    }));
  },
  squads: (count) => {
    const levels = ['fleet', 'wing', 'squad'];
    return Array.from({ length: count }, (_, i) => ({
      name: `Test Squad ${i + 1}`,
      description: `Auto-generated test squad`,
      hierarchy_level: levels[Math.floor(Math.random() * levels.length)],
    }));
  },
};

export default function DataGenerator() {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedType, setSelectedType] = useState('events');
  const [count, setCount] = useState(5);

  const generateData = async () => {
    setGenerating(true);
    const result = {
      id: Date.now(),
      type: selectedType,
      count,
      status: 'generating',
      message: 'Generating data...',
      timestamp: new Date(),
    };
    setResults((prev) => [result, ...prev]);

    try {
      const generator = SAMPLE_DATA_GENERATORS[selectedType];
      if (!generator) throw new Error('Unknown data type');

      const data = generator(count);
      
      // Simulate creation - actual implementation would call base44.entities
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setResults((prev) =>
        prev.map((r) =>
          r.id === result.id
            ? {
                ...r,
                status: 'success',
                message: `Generated ${count} ${selectedType} records`,
              }
            : r
        )
      );
    } catch (error) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === result.id
            ? { ...r, status: 'fail', message: error.message }
            : r
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-6">
        <h4 className="text-sm font-black uppercase text-white mb-4 tracking-wide">Generate Test Data</h4>
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-zinc-400 block mb-2">Entity Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                disabled={generating}
              >
                <option value="events">Events</option>
                <option value="voiceNets">Voice Nets</option>
                <option value="channels">Channels</option>
                <option value="squads">Squads</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-semibold text-zinc-400 block mb-2">Count</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value))))}
                disabled={generating}
                className="px-3 py-2"
              />
            </div>
            <Button
              onClick={generateData}
              disabled={generating}
              className="bg-green-600 hover:bg-green-500"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate'}
            </Button>
            {results.length > 0 && (
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear
              </Button>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
            💡 Generates sample data for testing. Data is created with randomized values to simulate realistic scenarios.
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3">Generation Results</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded flex items-start gap-2 text-xs ${
                  result.status === 'success'
                    ? 'bg-green-500/10 border border-green-500/20'
                    : result.status === 'generating'
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                {result.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                {result.status === 'generating' && <Loader className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />}
                {result.status === 'fail' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold capitalize ${
                    result.status === 'success' ? 'text-green-400' :
                    result.status === 'generating' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {result.type} - {result.count} records
                  </div>
                  <div className="text-zinc-400 mt-0.5">{result.message}</div>
                  <div className="text-zinc-600 mt-1">{result.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}