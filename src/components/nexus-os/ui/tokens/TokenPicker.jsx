import React, { useMemo, useState } from 'react';
import TokenRenderer from './TokenRenderer';
import { tokenCatalog, getTokenAssetUrl } from './tokenAssetMap';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

/**
 * TokenPicker — Interactive token selector for config/admin UI
 * Displays all token families with color variants and allows selection
 */
export default function TokenPicker({ onSelectToken, selectedFamily, selectedColor }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return tokenCatalog.families.filter((family) =>
      family.includes(query) || family.replace(/-/g, ' ').includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tokens..."
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {filtered.map((family) => {
          const colors = tokenCatalog.colorsByFamily[family] || [];
          return (
            <div key={family} className="space-y-2 p-3 rounded border border-zinc-800 bg-zinc-900/40">
              <div className="text-xs font-semibold uppercase text-zinc-300">{family.replace(/-/g, ' ')}</div>
              <div className="grid grid-cols-4 gap-2">
                {colors.slice(0, 8).map((color) => (
                  <button
                    key={`${family}-${color}`}
                    onClick={() => onSelectToken?.(family, color)}
                    className={`p-2 rounded border transition ${
                      selectedFamily === family && selectedColor === color
                        ? 'border-orange-500/60 bg-orange-500/20'
                        : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/60'
                    }`}
                    title={`${family} - ${color}`}
                  >
                    <TokenRenderer family={family} color={color} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}