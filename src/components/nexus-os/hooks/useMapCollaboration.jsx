import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getActiveMapSession,
  addMapElement,
  listSessionElements,
  subscribeToSessionElements,
  subscribeToSession,
  updateParticipantCursor,
  generateParticipantColor,
  exportMapLayout,
  importMapLayout,
  deleteMapElement,
} from '../services/mapCollaborationService';

export function useMapCollaboration({ operationId, actorId, enabled = true }) {
  const [session, setSession] = useState(null);
  const [elements, setElements] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cursorUpdateTimerRef = useRef(null);
  const participantColorRef = useRef(null);

  // Initialize session
  useEffect(() => {
    if (!enabled || !operationId) {
      setLoading(false);
      return;
    }

    let active = true;

    const init = async () => {
      try {
        const mapSession = await getActiveMapSession(operationId);
        if (!active) return;
        
        setSession(mapSession);
        
        const sessionElements = await listSessionElements(mapSession.id);
        if (!active) return;
        
        setElements(sessionElements);
        setLoading(false);

        // Generate color for this participant
        if (actorId) {
          participantColorRef.current = generateParticipantColor(actorId);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [operationId, actorId, enabled]);

  // Subscribe to elements
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToSessionElements(session.id, (event) => {
      if (event.type === 'create') {
        setElements(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setElements(prev => 
          prev.map(el => el.id === event.data.id ? event.data : el)
        );
      } else if (event.type === 'delete') {
        setElements(prev => prev.filter(el => el.id !== event.id));
      }
    });

    return unsubscribe;
  }, [session?.id]);

  // Subscribe to session (participants/cursors)
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToSession(session.id, (updatedSession) => {
      setParticipants(updatedSession.active_participants || []);
    });

    return unsubscribe;
  }, [session?.id]);

  // Cursor update throttling
  const updateCursor = useCallback((x, y) => {
    if (!session?.id || !actorId) return;

    if (cursorUpdateTimerRef.current) {
      clearTimeout(cursorUpdateTimerRef.current);
    }

    cursorUpdateTimerRef.current = setTimeout(() => {
      updateParticipantCursor(
        session.id,
        actorId,
        x,
        y,
        participantColorRef.current
      ).catch(() => {
        // Silent fail for cursor updates
      });
    }, 150);
  }, [session?.id, actorId]);

  // Add element
  const addElement = useCallback(async (elementData) => {
    if (!session?.id || !actorId) return null;
    
    try {
      const element = await addMapElement(session.id, elementData, actorId);
      return element;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [session?.id, actorId]);

  // Remove element
  const removeElement = useCallback(async (elementId) => {
    try {
      await deleteMapElement(elementId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Clear all elements
  const clearAllElements = useCallback(async () => {
    if (!session?.id) return;
    
    try {
      await Promise.all(elements.map(el => deleteMapElement(el.id)));
      setElements([]);
    } catch (err) {
      setError(err.message);
    }
  }, [session?.id, elements]);

  // Export layout
  const exportLayout = useCallback(() => {
    if (!session) return null;
    return exportMapLayout(session, elements);
  }, [session, elements]);

  // Import layout
  const importLayout = useCallback(async (code) => {
    if (!session?.id || !actorId) return false;
    
    try {
      const layout = importMapLayout(code);
      
      // Clear existing elements
      await clearAllElements();
      
      // Add imported elements
      for (const el of layout.elements) {
        await addMapElement(session.id, el, actorId);
      }
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [session?.id, actorId, clearAllElements]);

  return {
    session,
    elements,
    participants,
    loading,
    error,
    updateCursor,
    addElement,
    removeElement,
    clearAllElements,
    exportLayout,
    importLayout,
  };
}