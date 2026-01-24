import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function VoiceNetFilters({
  filters = {},
  onFiltersChange,
  squads = [],
  hasActive = true
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedFilters, setExpandedFilters] = React.useState(false);

  const filterOptions = {
    type: [
      { value: 'command', label: 'Command' },
      { value: 'squad', label: 'Squad' },
      { value: 'support', label: 'Support' },
      { value: 'general', label: 'General' }
    ],
    discipline: [
      { value: 'casual', label: 'Casual' },
      { value: 'focused', label: 'Focused' }
    ],
    status: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  };

  const toggleFilter = (category, value) => {
    const current = filters[category] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [category]: updated });
  };

  const toggleSquad = (squadId) => {
    const current = filters.squads || [];
    const updated = current.includes(squadId)
      ? current.filter(v => v !== squadId)
      : [...current, squadId];
    onFiltersChange({ ...filters, squads: updated });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      type: [],
      discipline: [],
      squads: [],
      stageMode: false,
      isDefault: false
    });
    setSearchQuery('');
  };

  const hasActiveFilters = Object.values(filters).some(v =>
    Array.isArray(v) ? v.length > 0 : !!v
  );

  return (
    <div className="space-y-3 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search nets by code or name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onFiltersChange({ ...filters, search: e.target.value });
          }}
          className="pl-10 bg-zinc-900 border-zinc-800"
        />
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setExpandedFilters(!expandedFilters)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <span>Advanced Filters</span>
        {hasActiveFilters && (
          <Badge className="bg-[#ea580c] text-white text-xs">
            {Object.values(filters).flat().filter(v => !!v).length}
          </Badge>
        )}
      </button>

      {/* Filter Panels */}
      {expandedFilters && (
        <div className="space-y-4 p-4 bg-zinc-900 border border-zinc-800 rounded">
          {/* Type Filter */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Net Type
            </h4>
            <div className="flex flex-wrap gap-2">
              {filterOptions.type.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('type', option.value)}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    (filters.type || []).includes(option.value)
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Filter */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Discipline
            </h4>
            <div className="flex flex-wrap gap-2">
              {filterOptions.discipline.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('discipline', option.value)}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    (filters.discipline || []).includes(option.value)
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Squad Filter */}
          {squads.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Assigned Squad
              </h4>
              <div className="flex flex-wrap gap-2">
                {squads.map(squad => (
                  <button
                    key={squad.id}
                    onClick={() => toggleSquad(squad.id)}
                    className={cn(
                      'px-3 py-1 text-xs rounded transition-colors',
                      (filters.squads || []).includes(squad.id)
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    )}
                  >
                    {squad.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stage Mode Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFiltersChange({ ...filters, stageMode: !filters.stageMode })}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filters.stageMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              Stage Mode Only
            </button>
          </div>

          {/* Default Net Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFiltersChange({ ...filters, isDefault: !filters.isDefault })}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filters.isDefault
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              Default Nets Only
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
