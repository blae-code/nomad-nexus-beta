/**
 * ThreadView — Display and manage message threads
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Loader } from 'lucide-react';

export default function ThreadView({ user, searchQuery }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        // Stub: Load threads from comms service
        setThreads([]);
      } catch (error) {
        console.error('Error loading threads:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, []);

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
        <MessageCircle className="w-3 h-3" />
        <span>Threads — Phase 2C Feature</span>
      </div>
      {threads.length === 0 && (
        <div className="text-zinc-600">No active threads. Reply to messages to start one.</div>
      )}
    </div>
  );
}