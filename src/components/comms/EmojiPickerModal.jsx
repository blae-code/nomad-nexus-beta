/**
 * EmojiPickerModal — Native emoji picker with search
 */

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤐', '🥵', '🥶', '🥴', '😕', '😟', '🙁', '☹️', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤞', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['🎈', '🎉', '🎊', '🎁', '🎀', '🎂', '🍰', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🍻', '🥂', '🥃', '🥤'],
  'Nature': ['🌈', '⭐', '✨', '💫', '🌟', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔'],
};

export default function EmojiPickerModal({ isOpen, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Smileys');

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return EMOJI_CATEGORIES[selectedCategory] || [];

    const query = searchQuery.toLowerCase();
    const allEmojis = Object.values(EMOJI_CATEGORIES).flat();

    // Simple filter - in production could use emoji library with names
    return allEmojis.filter((emoji) => {
      const emojiName = emoji.toLowerCase();
      return emojiName.includes(query);
    });
  }, [searchQuery, selectedCategory]);

  const handleEmojiClick = (emoji) => {
    onSelect?.(emoji);
    onClose?.();
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Select Emoji</DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search emoji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          {/* Categories */}
          {!searchQuery && (
            <div className="flex gap-1 overflow-x-auto pb-2">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-500/30 text-orange-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 bg-zinc-900/50 rounded">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-zinc-800 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          {filteredEmojis.length === 0 && (
            <div className="text-center py-6 text-sm text-zinc-500">
              No emojis found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}