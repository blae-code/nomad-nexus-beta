/**
 * useMessageDrafts — Persist unsent messages to localStorage
 */

import { useState, useEffect } from 'react';

const DRAFT_STORAGE_KEY = 'nexus.message-drafts';

export function useMessageDrafts(channelId) {
  const [draft, setDraft] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Load draft on channel change
  useEffect(() => {
    if (!channelId) return;

    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
      setDraft(drafts[channelId] || '');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to load draft:', error);
      setDraft('');
    }
  }, [channelId]);

  // Save draft on change (debounced)
  useEffect(() => {
    if (!channelId || !isDirty) return;

    const timeout = setTimeout(() => {
      try {
        const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
        if (draft.trim()) {
          drafts[channelId] = draft;
        } else {
          delete drafts[channelId];
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [draft, channelId, isDirty]);

  const updateDraft = (newDraft) => {
    setDraft(newDraft);
    setIsDirty(true);
  };

  const clearDraft = () => {
    if (!channelId) return;

    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
      delete drafts[channelId];
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
      setDraft('');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  return { draft, updateDraft, clearDraft, hasDraft: draft.length > 0 };
}