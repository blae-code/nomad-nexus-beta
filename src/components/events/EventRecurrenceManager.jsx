/**
 * Event Recurrence Manager
 * Handles scheduling recurring events with various patterns
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Repeat, X, CheckCircle2 } from 'lucide-react';

export default function EventRecurrenceManager({ onSave, onCancel, defaultValue }) {
  const [recurrence, setRecurrence] = useState(defaultValue || {
    pattern: 'weekly',
    interval: 1,
    daysOfWeek: [],
    endType: 'never',
    endDate: '',
    occurrences: 1,
  });

  const [errors, setErrors] = useState([]);

  const validate = () => {
    const newErrors = [];
    if (recurrence.pattern === 'weekly' && recurrence.daysOfWeek.length === 0) {
      newErrors.push('Select at least one day for weekly recurrence');
    }
    if (recurrence.endType === 'on' && !recurrence.endDate) {
      newErrors.push('Select an end date');
    }
    if (recurrence.endType === 'after' && recurrence.occurrences < 1) {
      newErrors.push('Occurrences must be at least 1');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(recurrence);
    }
  };

  const toggleDay = (day) => {
    setRecurrence((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-orange-500" />
        <h4 className="text-sm font-bold uppercase text-white">Recurrence Settings</h4>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 space-y-1">
          {errors.map((err, idx) => (
            <div key={idx}>⚠️ {err}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-2">Pattern</label>
          <select
            value={recurrence.pattern}
            onChange={(e) => setRecurrence({ ...recurrence, pattern: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-2">Every N</label>
          <Input
            type="number"
            min="1"
            value={recurrence.interval}
            onChange={(e) => setRecurrence({ ...recurrence, interval: parseInt(e.target.value) })}
            className="px-3 py-2"
          />
        </div>
      </div>

      {recurrence.pattern === 'weekly' && (
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-2">Days of Week</label>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => (
              <button
                key={day}
                onClick={() => toggleDay(idx)}
                className={`py-2 text-xs font-semibold rounded transition ${
                  recurrence.daysOfWeek.includes(idx)
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-2">End Type</label>
          <select
            value={recurrence.endType}
            onChange={(e) => setRecurrence({ ...recurrence, endType: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="never">Never</option>
            <option value="on">On Date</option>
            <option value="after">After N Occurrences</option>
          </select>
        </div>

        {recurrence.endType === 'on' && (
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-2">End Date</label>
            <Input
              type="date"
              value={recurrence.endDate}
              onChange={(e) => setRecurrence({ ...recurrence, endDate: e.target.value })}
            />
          </div>
        )}

        {recurrence.endType === 'after' && (
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-2">Occurrences</label>
            <Input
              type="number"
              min="1"
              value={recurrence.occurrences}
              onChange={(e) => setRecurrence({ ...recurrence, occurrences: parseInt(e.target.value) })}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Save Recurrence
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}