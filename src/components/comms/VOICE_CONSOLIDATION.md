# Voice Joining Consolidation

## Status: ACTIVE (as of 2026-01-23)

### Canonical Path
**CommsConsole → ActiveNetPanel**
- Full voice support (LIVE + SIM modes)
- Real token minting and LiveKit integration
- Roster, floor control, incident linking
- Single stable code path

### Deprecated (Feature-Flagged)
The following components are marked for deprecation and should NOT be used for new voice features:

| Component | Reason | Replacement |
|-----------|--------|-------------|
| `CommsDockShell` + `useVoiceRoom` | Removed voice joining to avoid conflict with CommsConsole | Direct link to CommsConsole |
| `CommsJoinDialog` | Scattered logic, not integrated with floor control | `CommsConsoleDeepLink.CommsJoinButtonRedirect` |
| `CommsPanel` join buttons | Secondary voice join entry point | `OpenCommsArrayButton` deep links |
| Various "Join Comms" modals | Competing voice stacks | `useCommsConsoleLink()` hook |

### Migration Path
If you find a "Join Comms" button:
1. Replace with `<OpenCommsArrayButton eventId={eventId} netId={netId} />`
2. Or use `useCommsConsoleLink()` hook to navigate to CommsConsole
3. CommsConsole will restore the pre-selected event and net

### For Users
- **All voice joining now routes through Comms Array**
- Select event → Select net → Join (via ActiveNetPanel)
- One unified experience, no conflicting dialogs

### For Developers
- Keep old components (don't delete) for reference
- Mark with `DEPRECATED:` comments
- Route all new voice features to ActiveNetPanel
- Use `createPageUrl('commsconsole')` + params for deep linking