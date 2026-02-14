import React, { useState, useEffect } from 'react';
import { Network, X, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SocialNetworkAnalyzer({ widgetId, onRemove, isDragging }) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    generateNetwork();
  }, []);

  const generateNetwork = () => {
    const n = [];
    for (let i = 0; i < 12; i++) {
      n.push({
        id: i,
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 40,
        connections: Math.floor(Math.random() * 4),
        importance: Math.random()
      });
    }
    setNodes(n);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.04),transparent_60%)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Social Network</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 relative">
        <svg className="absolute inset-0 w-full h-full">
          {nodes.map((n, i) => 
            nodes.slice(i + 1).map((m, j) => 
              Math.random() > 0.7 && (
                <line
                  key={`${i}-${j}`}
                  x1={`${n.x}%`}
                  y1={`${n.y}%`}
                  x2={`${m.x}%`}
                  y2={`${m.y}%`}
                  stroke="rgba(220,38,38,0.2)"
                  strokeWidth="1"
                />
              )
            )
          )}
        </svg>

        {nodes.map(node => (
          <div
            key={node.id}
            className="absolute -ml-2 -mt-2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              node.importance > 0.7 ? 'border-red-500 bg-red-500/30' :
              node.importance > 0.4 ? 'border-orange-500 bg-orange-500/30' :
              'border-zinc-600 bg-zinc-600/30'
            }`}>
              <UsersIcon className="w-2 h-2 text-white" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex items-center justify-between text-[9px] text-zinc-500 relative z-10">
        <span>{nodes.length} Nodes</span>
        <span>{nodes.reduce((sum, n) => sum + n.connections, 0)} Links</span>
      </div>
    </div>
  );
}