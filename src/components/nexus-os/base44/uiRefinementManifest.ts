/**
 * Base44 UI Refinement Manifest
 *
 * Machine-readable map of NexusOS UI entry points and key component files.
 * This gives Base44 a stable context anchor while UI iteration continues.
 */

export interface NexusOsUiEntryPoint {
  id: string;
  routeName: string;
  mode: 'workspace' | 'dev';
  description: string;
}

export interface NexusOsUiRefinementManifest {
  schema: 'nexus-os-ui-refinement-manifest';
  version: 1;
  entryPoints: NexusOsUiEntryPoint[];
  keyFiles: string[];
}

export const NEXUS_OS_UI_REFINEMENT_MANIFEST: NexusOsUiRefinementManifest = Object.freeze({
  schema: 'nexus-os-ui-refinement-manifest',
  version: 1,
  entryPoints: [
    {
      id: 'workspace',
      routeName: 'NexusOSWorkspace',
      mode: 'workspace',
      description: 'Authenticated production workspace shell.',
    },
    {
      id: 'preview',
      routeName: 'NexusOSPreview',
      mode: 'dev',
      description: 'Ungated UI refinement shell for Base44 visual iteration.',
    },
  ],
  keyFiles: [
    'src/pages/NexusOSWorkspace.jsx',
    'src/pages/NexusOSPreview.jsx',
    'src/pages/CommsConsole.jsx',
    'src/components/nexus-os/preview/NexusOSPreviewPage.jsx',
    'src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx',
    'src/components/nexus-os/ui/comms/commsTokenSemantics.ts',
    'src/components/voice/voiceNetGovernanceClient.js',
    'src/components/voice/VoiceNetCreator.jsx',
    'src/components/nexus-os/ui/tokens/tokenAssetMap.ts',
    'src/components/nexus-os/ui/theme/nexus-shell.css',
    'src/components/nexus-os/ui/workbench/WorkbenchGrid.jsx',
    'src/components/nexus-os/ui/map/TacticalMapPanel.tsx',
  ],
});
