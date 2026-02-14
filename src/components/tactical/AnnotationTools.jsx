import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Circle, Square, Trash2 } from 'lucide-react';

export default function AnnotationTools({ onAnnotate, onClear }) {
  const [activeTool, setActiveTool] = useState(null);
  const [color, setColor] = useState('orange');

  const colors = ['orange', 'red', 'blue', 'green', 'yellow'];

  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-orange-500/20 rounded-lg p-2">
      <Button
        size="sm"
        variant={activeTool === 'pen' ? 'default' : 'outline'}
        onClick={() => setActiveTool('pen')}
        className="h-8 w-8 p-0"
      >
        <Pen className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant={activeTool === 'circle' ? 'default' : 'outline'}
        onClick={() => setActiveTool('circle')}
        className="h-8 w-8 p-0"
      >
        <Circle className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant={activeTool === 'rect' ? 'default' : 'outline'}
        onClick={() => setActiveTool('rect')}
        className="h-8 w-8 p-0"
      >
        <Square className="w-4 h-4" />
      </Button>

      <div className="h-6 w-px bg-zinc-700" />

      <div className="flex gap-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-4 h-4 rounded-full transition ${
              color === c ? 'ring-2 ring-offset-1 ring-offset-zinc-900' : ''
            }`}
            style={{ backgroundColor: `var(--color-${c}, ${c})` }}
          />
        ))}
      </div>

      <div className="flex-1" />

      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}