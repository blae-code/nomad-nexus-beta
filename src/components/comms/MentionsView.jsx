/**
 * MentionsView — Display messages that mention the current user
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AtSign, Loader } from 'lucide-react';

export default function MentionsView({ user, searchQuery }) {
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMentions = async () => {
      try {
        if (!user?.id) return;
        // Stub: Load mentions from comms service
        setMentions([]);
      } catch (error) {
        console.error('Error loading mentions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMentions();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 text-xs text-zinc-500 space-y-2">
      <div className="flex items-center gap-2">
        <AtSign className="w-3 h-3" />
        <span>Mentions — Phase 2C Feature</span>
      </div>
      {mentions.length === 0 && (
        <div className="text-zinc-600">No recent mentions. You're all caught up.</div>
      )}
    </div>
  );
}