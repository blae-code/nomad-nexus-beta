/**
 * GlobalMessageSearch — Search across all accessible channels
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Hash, Calendar, User, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function GlobalMessageSearch({ isOpen, onClose, onSelectMessage, currentUserId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channelList = await base44.entities.Channel.list();
        const channelMap = {};
        channelList.forEach(ch => {
          channelMap[ch.id] = ch;
        });
        setChannels(channelMap);
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };

    if (isOpen) {
      loadChannels();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Search messages across all channels
      const allMessages = await base44.entities.Message.list();
      
      const filtered = allMessages.filter(msg => {
        if (msg.is_deleted) return false;
        const searchText = query.toLowerCase();
        return (
          msg.content?.toLowerCase().includes(searchText) ||
          msg.user_id?.toLowerCase().includes(searchText)
        );
      });

      // Sort by date descending
      filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setResults(filtered.slice(0, 50)); // Limit to 50 results
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-10"
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={!query.trim() || loading}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto border border-zinc-800 rounded min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="w-6 h-6 text-orange-400 animate-spin mx-auto mb-2" />
                <div className="text-sm text-zinc-500">Searching...</div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500">
                {query ? 'No messages found' : 'Enter a search term to begin'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {results.map((msg) => {
                const channel = channels[msg.channel_id];
                return (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onSelectMessage(msg);
                      onClose();
                    }}
                    className="w-full text-left p-3 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <Hash className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-zinc-500 font-medium">
                        {channel?.name || 'Unknown Channel'}
                      </span>
                      <span className="text-xs text-zinc-600 ml-auto flex-shrink-0">
                        {formatDate(msg.created_date)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-400 mb-1">{msg.user_id}</div>
                        <div className="text-sm text-zinc-300 line-clamp-2">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}