# Shell Skeleton Discovery Note (v0.1)

Date: 2026-02-09

## Existing Layout System

- Top-level router and page mounting:
  - `src/App.jsx`
- Shell wrapper and fullscreen exceptions:
  - `src/Layout.jsx`
- Access Gate / Onboarding are preserved as fullscreen pages via:
  - `fullScreenPages = ['AccessGate', 'Disclaimers', 'Onboarding']`

## Existing Design System Components Reused

- Buttons:
  - `src/components/ui/button.jsx`
- Badges:
  - `src/components/ui/badge.jsx`
- Card style baseline:
  - `src/components/ui/card.jsx`
- Drawer/modal primitives:
  - `src/components/ui/sheet.jsx`
  - `src/components/ui/dialog.jsx`

## Safe Dev-Only Preview Placement

- Safest injection point is a dedicated route in `src/App.jsx` gated by `import.meta.env.DEV`.
- Added route:
  - `/dev/nexus-os`
- Route is not present in production builds and does not alter normal page navigation.

