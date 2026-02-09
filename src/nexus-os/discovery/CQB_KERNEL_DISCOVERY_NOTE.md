# CQB Kernel Discovery Note (v1.0)

Date: 2026-02-09

## Nexus OS Preview Surface

- Dev preview entrypoint:
  - `src/nexus-os/preview/NexusOSPreviewPage.jsx`
- Grid panel declaration and rendering:
  - `src/nexus-os/ui/workbench/WorkbenchGrid.jsx`
- Dev-only route wiring:
  - `src/App.jsx` at `/dev/nexus-os` behind `import.meta.env.DEV`

## Team/Roster Concept

- Existing CQB-specific team model did not exist under `src/nexus-os`.
- Added dev-only roster mock with required Redscar elements:
  - `src/nexus-os/ui/cqb/devRoster.ts`
  - Fields include `element` (CE/GCE/ACE) and `role`.

## Canon Input Integration

- Canon source loaded from:
  - `C:\Users\Owner\Downloads\Redscars Op Terms.txt`
- Incorporated into:
  - `src/nexus-os/registries/macroRegistry.ts`
  - `src/nexus-os/registries/ttlProfileRegistry.ts`
  - CQB UI labels/tooltips under `src/nexus-os/ui/cqb/`

