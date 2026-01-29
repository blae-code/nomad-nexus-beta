/**
 * LEGACY — CommsDockShell (Phase 2) — DEPRECATED
 * 
 * Replaced by: TextCommsDock + VoiceCommsDock components rendered via Layout.js
 * 
 * This file is retained for reference and backwards compatibility.
 * Do NOT delete without verifying all imports have been migrated.
 * All active rendering now uses TextCommsDock and VoiceCommsDock via Layout.js.
 * 
 * This component returns null to prevent any rendering.
 */

import React from 'react';

// LEGACY EXPORT — DO NOT USE
// Use TextCommsDock or VoiceCommsDock instead
export default function CommsDockShell({ isOpen, onClose }) {
  // Return null to prevent rendering
  return null;
}