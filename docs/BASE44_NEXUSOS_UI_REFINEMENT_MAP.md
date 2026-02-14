# Base44 NexusOS UI Refinement Map

Use this map when refining NexusOS UI with Base44 tooling.

## Primary Routes

1. `NexusOSWorkspace`
   - File: `src/pages/NexusOSWorkspace.jsx`
   - Mode: workspace
   - Auth: requires onboarded user
2. `NexusOSPreview`
   - File: `src/pages/NexusOSPreview.jsx`
   - Mode: dev
   - Auth: ungated (intended for UI iteration)

## Core Shell Files

- `src/components/nexus-os/preview/NexusOSPreviewPage.jsx`
- `src/components/nexus-os/ui/theme/nexus-shell.css`
- `src/components/nexus-os/ui/workbench/WorkbenchGrid.jsx`
- `src/components/nexus-os/ui/map/TacticalMapPanel.tsx`

## Machine-Readable Manifest

- `src/components/nexus-os/base44/uiRefinementManifest.ts`
  - Export: `NEXUS_OS_UI_REFINEMENT_MANIFEST`
  - Purpose: stable context anchor for NexusOS UI entry points and key files.

