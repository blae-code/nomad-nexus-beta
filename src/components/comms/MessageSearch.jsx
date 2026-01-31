/**
 * MessageSearch — Search messages in current channel
 */

import React, { useState } from 'react';
import { Search, X, Calendar, User, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function MessageSearch({ messages, onJumpToMessage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    author: '',
    hasFile: false,
    hasLink: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredMessages = messages.filter(msg => {
    // Text search
    if (searchQuery && !msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Author filter
    if (filters.author && !msg.user_id.toLowerCase().includes(filters.author.toLowerCase())) {
      return false;
    }

    // File filter
    if (filters.hasFile && (!msg.attachments || msg.attachments.length === 0)) {
      return false;
    }

    // Link filter
    if (filters.hasLink && !/(https?:\/\/[^\s]+)/g.test(msg.content)) {
      return false;
    }

    return true;
  });

  const clearSearch = () => {
    setSearchQuery('');
    setFilters({ author: '', hasFile: false, hasLink: false });
  };

  return (
    <div className="p-3 border-b border-orange-500/10 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-7 h-8 text-xs bg-zinc-900/50 border-orange-500/10"
          />
        </div>
        {(searchQuery || filters.author || filters.hasFile || filters.hasLink) && (
          <Button size="icon" variant="ghost" onClick={clearSearch} className="h-8 w-8">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <Input
            value={filters.author}
            onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
            placeholder="Filter by author..."
            className="h-7 text-xs bg-zinc-900/50 border-orange-500/10"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, hasFile: !prev.hasFile }))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                filters.hasFile
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <FileText className="w-3 h-3" />
              Has file
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, hasLink: !prev.hasLink }))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                filters.hasLink
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Has link
            </button>
          </div>
        </div>
      )}

      {filteredMessages.length < messages.length && (
        <div className="text-xs text-zinc-500">
          {filteredMessages.length} of {messages.length} messages
        </div>
      )}
    </div>
  );
}