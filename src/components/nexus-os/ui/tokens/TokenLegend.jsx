import React from 'react';
import TokenRenderer from './TokenRenderer';
import {
  playerStatusTokens,
  eventPhaseTokens,
  priorityTokens,
  roleTokens,
  assetStatusTokens,
  commandStatusTokens,
} from './tokenSemantics';

/**
 * TokenLegend — Reference panel showing all semantic token meanings
 * Organized by category for tactical communication reference
 */
export default function TokenLegend({ className = '' }) {
  const categories = [
    {
      title: 'Player Status',
      tokens: Object.entries(playerStatusTokens),
      description: 'Tactical player/unit states',
    },
    {
      title: 'Event Phase',
      tokens: Object.entries(eventPhaseTokens),
      description: 'Operation lifecycle phases',
    },
    {
      title: 'Priority Level',
      tokens: Object.entries(priorityTokens),
      description: 'Communication/order priority',
    },
    {
      title: 'Combat Role',
      tokens: Object.entries(roleTokens),
      description: 'Unit role assignments',
    },
    {
      title: 'Asset Status',
      tokens: Object.entries(assetStatusTokens),
      description: 'Vehicle/equipment state',
    },
    {
      title: 'Command Status',
      tokens: Object.entries(commandStatusTokens),
      description: 'Order execution state',
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {categories.map((category) => (
        <section key={category.title} className="space-y-2">
          <div>
            <h3 className="text-sm font-bold uppercase text-orange-400">{category.title}</h3>
            <p className="text-xs text-zinc-500">{category.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {category.tokens.map(([status, config]) => (
              <div
                key={status}
                className="flex items-center gap-2 p-2 rounded border border-zinc-800 bg-zinc-900/40"
              >
                <TokenRenderer
                  family={config.family}
                  color={config.color}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-300 truncate">{config.label}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}