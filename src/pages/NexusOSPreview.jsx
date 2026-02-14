import React from 'react';
import { NexusOSPreviewPage } from '@/components/nexus-os';

/**
 * Base44-facing UI refinement route.
 * Intentionally ungated so visual-edit workflows can inspect NexusOS shell UI directly.
 */
export default function NexusOSPreview() {
  return <NexusOSPreviewPage mode="dev" />;
}

