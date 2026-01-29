/**
 * ActiveOpProvider — Single source of truth for active operation state
 * Persists activeEventId in localStorage, manages bindings and participants
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ActiveOpContext = createContext(null);

const STORAGE_KEY = 'nexus.ops.activeEventId';

export function ActiveOpProvider({ children }) {
  const [activeEventId, setActiveEventIdState] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [binding, setBinding] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load active event ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveEventIdState(stored);
    }
    setLoading(false);
  }, []);

  // Load active event data when activeEventId changes
  useEffect(() => {
    if (!activeEventId) {
      setActiveEvent(null);
      setBinding(null);
      setParticipants([]);
      return;
    }

    let mounted = true;

    async function loadActiveOp() {
      try {
        // Load event
        const event = await base44.entities.Event.list();
        const eventData = event.find((e) => e.id === activeEventId);
        
        if (!mounted) return;
        setActiveEvent(eventData || null);

        if (!eventData) {
          // Event no longer exists
          clearActiveEvent();
          return;
        }

        // Load binding
        const bindings = await base44.entities.OpBinding.filter({ eventId: activeEventId });
        if (mounted) {
          setBinding(bindings[0] || null);
        }

        // Load participants
        const parts = await base44.entities.EventParticipant.filter({ eventId: activeEventId });
        if (mounted) {
          setParticipants(parts);
        }
      } catch (error) {
        console.error('Failed to load active op:', error);
        if (mounted) {
          setActiveEvent(null);
          setBinding(null);
          setParticipants([]);
        }
      }
    }

    loadActiveOp();

    return () => {
      mounted = false;
    };
  }, [activeEventId]);

  const setActiveEvent = useCallback(async (eventId) => {
    if (!eventId) {
      clearActiveEvent();
      return;
    }

    setActiveEventIdState(eventId);
    localStorage.setItem(STORAGE_KEY, eventId);
  }, []);

  const clearActiveEvent = useCallback(() => {
    setActiveEventIdState(null);
    localStorage.removeItem(STORAGE_KEY);
    setActiveEvent(null);
    setBinding(null);
    setParticipants([]);
  }, []);

  const bindVoiceNet = useCallback(async (voiceNetId) => {
    if (!activeEventId) return;

    try {
      if (binding) {
        // Update existing binding
        await base44.entities.OpBinding.update(binding.id, {
          voiceNetId,
        });
      } else {
        // Create new binding
        await base44.entities.OpBinding.create({
          eventId: activeEventId,
          voiceNetId,
        });
      }

      // Reload binding
      const bindings = await base44.entities.OpBinding.filter({ eventId: activeEventId });
      setBinding(bindings[0] || null);
    } catch (error) {
      console.error('Failed to bind voice net:', error);
    }
  }, [activeEventId, binding]);

  const bindCommsChannel = useCallback(async (commsChannelId) => {
    if (!activeEventId) return;

    try {
      if (binding) {
        // Update existing binding
        await base44.entities.OpBinding.update(binding.id, {
          commsChannelId,
        });
      } else {
        // Create new binding
        await base44.entities.OpBinding.create({
          eventId: activeEventId,
          commsChannelId,
        });
      }

      // Reload binding
      const bindings = await base44.entities.OpBinding.filter({ eventId: activeEventId });
      setBinding(bindings[0] || null);
    } catch (error) {
      console.error('Failed to bind comms channel:', error);
    }
  }, [activeEventId, binding]);

  const joinOp = useCallback(async (eventId, user) => {
    try {
      // Check if already joined
      const existing = await base44.entities.EventParticipant.filter({
        eventId,
        userId: user.id,
      });

      if (existing.length > 0) {
        return; // Already joined
      }

      // Create participant record
      await base44.entities.EventParticipant.create({
        eventId,
        userId: user.id,
        callsign: user.callsign || user.full_name || 'Unknown',
        joinedAt: new Date().toISOString(),
      });

      // Reload participants if this is the active op
      if (eventId === activeEventId) {
        const parts = await base44.entities.EventParticipant.filter({ eventId: activeEventId });
        setParticipants(parts);
      }
    } catch (error) {
      console.error('Failed to join op:', error);
    }
  }, [activeEventId]);

  const value = {
    activeEventId,
    activeEvent,
    binding,
    participants,
    loading,
    setActiveEvent,
    clearActiveEvent,
    bindVoiceNet,
    bindCommsChannel,
    joinOp,
  };

  return (
    <ActiveOpContext.Provider value={value}>
      {children}
    </ActiveOpContext.Provider>
  );
}

export function useActiveOp() {
  const context = useContext(ActiveOpContext);
  if (!context) {
    throw new Error('useActiveOp must be used within ActiveOpProvider');
  }
  return context;
}