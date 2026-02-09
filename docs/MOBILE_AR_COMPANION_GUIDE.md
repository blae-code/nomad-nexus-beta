# Mobile & AR Companion Guide

This guide covers Package E foundations for Nomad Nexus.

## What Was Added

- PWA manifest and icons:
  - `public/manifest.webmanifest`
  - `public/icons/nexus-192.svg`
  - `public/icons/nexus-512.svg`
- Service worker shell with offline + push handlers:
  - `public/service-worker.js`
  - `public/offline.html`
- Runtime registration:
  - `src/components/pwa/registerPwa.js`
  - integrated in `src/main.jsx`
- Mobile quick UI in shell:
  - `src/components/mobile/OfflineStatusBanner.jsx`
  - `src/components/mobile/MobileQuickActionBar.jsx`
- Nexus OS mobile/AR companion:
  - `src/nexus-os/schemas/mobileSchemas.ts`
  - `src/nexus-os/services/mobileCompanionService.ts`
  - `src/nexus-os/ui/mobile/*`
  - integrated in `src/nexus-os/preview/NexusOSPreviewPage.jsx`

## Push Notifications

Web push requires a VAPID public key for subscription:

- `VITE_WEB_PUSH_PUBLIC_KEY=<base64url public key>`

If not configured, the UI still supports notification permission and stores a fallback token record in local companion storage for diagnostics.

## Location Sharing Guardrail

Mobile location sharing is explicit opt-in and TTL-bound. It is never treated as omniscient telemetry.

- Start sharing from `Mobile Companion` panel.
- Location beacons decay automatically using `ttlSeconds`.

## AR Companion Guardrail

AR overlays are assistive only:

- verify with map + comms before acting;
- no auto-fabrication of tactical truth;
- markers are sourced from consented mobile beacons and explicit anchors.

## Testing Checklist

1. Open app on mobile browser and install PWA (if prompt available).
2. Confirm service worker registration and offline banner behavior.
3. In Hub/Nexus OS workspace, open `Mobile Companion` panel.
4. Enable push permission (and VAPID key if configured).
5. Start GPS share and open `Mobile AR Companion`.
6. Drop an anchor and verify marker appears in AR/list views.
7. Toggle airplane mode and verify offline page/banner behavior.

