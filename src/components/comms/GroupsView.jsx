/**
 * GroupsView — Display and manage comms groups/squads
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Loader } from 'lucide-react';

export default function GroupsView({ user, searchQuery }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        // Stub: Load groups/squads
        setGroups([]);
      } catch (error) {
        console.error('Error loading groups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
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
        <Users className="w-3 h-3" />
        <span>Groups — Phase 2C Feature</span>
      </div>
      {groups.length === 0 && (
        <div className="text-zinc-600">No squad groups yet. Create one to organize your team.</div>
      )}
    </div>
  );
}