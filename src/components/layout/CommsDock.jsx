/**
 * LEGACY — CommsDock (Phase 1) — DEPRECATED
 * 
 * Replaced by: VoiceCommsDock + TextCommsDock components rendered via Layout.js
 * 
 * This file is retained for reference and backwards compatibility.
 * Do NOT delete without verifying all imports have been migrated.
 * All active rendering now uses the bottom-anchored CommsDock via Layout.js.
 * 
 * See: components/COMMS_DOCK_REINSTALL_VERIFICATION.md (Phase 2B)
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Users, AlertCircle, X, Radio, MessageSquare, Activity } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';

// LEGACY EXPORT — DO NOT USE
// Use VoiceCommsDock or TextCommsDock instead
export default function CommsDock({ isOpen, onClose }) {
  // Return null to prevent rendering
  return null;
  // LEGACY CODE BELOW — DO NOT USE
  // All functionality replaced by VoiceCommsDock + TextCommsDock
  // Retained only for reference; component returns null above
  
  const _unused_channels = null;
  const _unused_activeUsers = null;
  const _unused_loading = null;
  const _unused_activeOp = null;
  const _unused_voiceNet = null;
}