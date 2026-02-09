import React from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { NexusOSPreviewPage } from '@/nexus-os';

/**
 * Authenticated Nexus OS workspace surface.
 * Uses the same shell stack as preview, but with production-facing copy.
 */
export default function NexusOSWorkspace() {
  return (
    <RouteGuard requiredAuth="onboarded">
      <NexusOSPreviewPage mode="workspace" />
    </RouteGuard>
  );
}
