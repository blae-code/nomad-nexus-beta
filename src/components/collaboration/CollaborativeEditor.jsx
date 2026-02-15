import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Save, Users, Lock, Unlock, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * CollaborativeEditor - Real-time collaborative document editing
 * Supports multiple simultaneous editors with cursor tracking and conflict resolution
 */
export default function CollaborativeEditor({ documentId, onClose }) {
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeEditors, setActiveEditors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef(null);
  const saveTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  const memberId = user?.member_profile_id || user?.id;

  // Load document
  useEffect(() => {
    if (!documentId) return;
    
    const loadDoc = async () => {
      try {
        const doc = await base44.entities.CollaborativeDocument.get(documentId);
        setDocument(doc);
        setContent(doc.content || '');
        setTitle(doc.title || '');
        setActiveEditors(doc.active_editors || []);
      } catch (error) {
        toast.error('Failed to load document');
        console.error('Load document error:', error);
      }
    };

    loadDoc();
  }, [documentId]);

  // Real-time subscription to document changes
  useEffect(() => {
    if (!documentId) return;

    const unsubscribe = base44.entities.CollaborativeDocument.subscribe((event) => {
      if (event.id !== documentId) return;
      
      if (event.type === 'update') {
        const updatedDoc = event.data;
        
        // Only update if version is newer to avoid conflicts
        if (updatedDoc.version > (document?.version || 0)) {
          setDocument(updatedDoc);
          
          // Only update content if we don't have unsaved changes
          if (!hasUnsavedChanges) {
            setContent(updatedDoc.content || '');
            setTitle(updatedDoc.title || '');
          }
          
          setActiveEditors(updatedDoc.active_editors || []);
        }
      }
    });

    return () => unsubscribe();
  }, [documentId, document?.version, hasUnsavedChanges]);

  // Send presence heartbeat
  useEffect(() => {
    if (!documentId || !memberId) return;

    const updatePresence = async () => {
      try {
        const currentEditors = document?.active_editors || [];
        const updatedEditors = currentEditors.filter(
          (e) => e.member_profile_id !== memberId || Date.now() - new Date(e.last_active).getTime() < 30000
        );

        updatedEditors.push({
          member_profile_id: memberId,
          cursor_position: cursorPosition,
          last_active: new Date().toISOString(),
        });

        await base44.entities.CollaborativeDocument.update(documentId, {
          active_editors: updatedEditors,
        });
      } catch (error) {
        console.error('Presence update error:', error);
      }
    };

    updatePresence();
    heartbeatTimerRef.current = setInterval(updatePresence, 10000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [documentId, memberId, cursorPosition, document?.active_editors]);

  // Auto-save
  const saveDocument = useCallback(async () => {
    if (!documentId || !document) return;

    setIsSaving(true);
    try {
      await base44.entities.CollaborativeDocument.update(documentId, {
        title,
        content,
        version: (document.version || 0) + 1,
      });
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success('Document saved');
    } catch (error) {
      toast.error('Failed to save document');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, title, content, document]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setHasUnsavedChanges(true);
    setCursorPosition(e.target.selectionStart);

    // Debounce auto-save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveDocument();
    }, 2000);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setHasUnsavedChanges(true);
  };

  const otherEditors = activeEditors.filter(
    (e) => e.member_profile_id !== memberId && Date.now() - new Date(e.last_active).getTime() < 30000
  );

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0"
            placeholder="Document Title"
          />
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-400 border-orange-500/40">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved
              </Badge>
            )}
            {isSaving && (
              <Badge variant="outline" className="text-blue-400 border-blue-500/40">
                Saving...
              </Badge>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <Badge variant="outline" className="text-green-400 border-green-500/40">
                <Clock className="w-3 h-3 mr-1" />
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-zinc-400">
              {document.doc_type.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {document.locked_by && (
              <Badge variant="outline" className="text-red-400 border-red-500/40">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {otherEditors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Users className="w-4 h-4" />
                <span>{otherEditors.length} editing</span>
                <div className="flex -space-x-2">
                  {otherEditors.slice(0, 3).map((editor, idx) => (
                    <div
                      key={editor.member_profile_id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold"
                      title={editor.member_profile_id}
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" onClick={saveDocument} disabled={isSaving || !hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            {onClose && (
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onSelect={(e) => setCursorPosition(e.target.selectionStart)}
          className="w-full h-full min-h-[600px] bg-zinc-900/20 border-zinc-800 text-zinc-200 font-mono text-sm resize-none focus:ring-orange-500/40"
          placeholder="Start typing... Changes are auto-saved."
          disabled={document.locked_by && document.locked_by !== memberId}
        />
      </div>
    </div>
  );
}