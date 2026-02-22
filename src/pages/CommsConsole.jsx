import React from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { NexusOSPreviewPage } from '@/components/nexus-os';

/**
 * Legacy Comms route now hard-cuts to canonical NexusOS Comms Focus surface.
 */
export default function CommsConsole() {
  return (
    <RouteGuard requiredAuth="onboarded">
      <NexusOSPreviewPage mode="workspace" forceFocusMode="comms" />
    </RouteGuard>
  );
}
