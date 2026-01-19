import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChannelSearch({ channels, onResultsChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();

    return channels.filter(channel => {
      // Search by name
      if (channel.name.toLowerCase().includes(query)) return true;
      
      // Search by category
      if (channel.category?.toLowerCase().includes(query)) return true;
      
      // Search by squad (if linked)
      if (channel.squad_id) {
        // Note: In a real app, we'd fetch squad name and search it
        // For now, search by ID as fallback
        if (channel.squad_id.toLowerCase().includes(query)) return true;
      }

      return false;
    }).sort((a, b) => {
      // Prioritize exact name matches
      const aNameMatch = a.name.toLowerCase() === query;
      const bNameMatch = b.name.toLowerCase() === query;
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, channels]);

  const handleClear = () => {
    setSearchQuery("");
    onResultsChange([]);
  };

  const handleSelect = (channel) => {
    setSearchQuery("");
    setFocused(false);
    onResultsChange([channel]);
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <Input
          type="text"
          placeholder="Search channels by name, category, or squad..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 pl-10 focus:border-[#ea580c] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {focused && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredChannels.length > 0 ? (
            <div className="p-2">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleSelect(channel)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-zinc-800 transition-colors flex items-center gap-3 group"
                >
                  {channel.type === 'voice' ? (
                    <Mic className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                  ) : (
                    <Hash className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">
                      {channel.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {channel.category || "No category"}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] border-zinc-700 text-zinc-500 capitalize"
                    >
                      {channel.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
              No channels found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}