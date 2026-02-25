# Nexus OS Foundation (BIOS Layer)

## 🎨 Design System (MANDATORY - Read Before Building)

**All NexusOS UI must comply with the design system.**

### Quick Start

1. **Read the Style Guide:** [STYLE_GUIDE.md](./STYLE_GUIDE.md)
2. **Review Token Guide:** [ui/tokens/TOKEN_USAGE_GUIDE.md](./ui/tokens/TOKEN_USAGE_GUIDE.md)
3. **Use Component Template:** [ui/_template/NexusComponentTemplate.jsx](./ui/_template/NexusComponentTemplate.jsx)
4. **Import Design Tokens:**
   ```jsx
   import { NX_TYPOGRAPHY, NX_COLORS, NX_SPACING } from '@/components/nexus-os/ui/theme/design-tokens';
   ```
5. **Use Primitives:**
   ```jsx
   import { NexusButton, NexusBadge, NexusTokenIcon } from '@/components/nexus-os/ui/primitives';
   ```

### Pre-Build Checklist
- [ ] Typography: 8px and 10px only, font-semibold+, tracking-[0.12em]+, uppercase
- [ ] Spacing: p-1.5/2/2.5, gap-1/1.5/2 only
- [ ] Icons: w-2.5/3/3.5/4 only (square, from matrix)
- [ ] Tokens: Use for status/tactical, Lucide for UI controls
- [ ] Primitives: Use NexusButton/NexusBadge, not custom implementations

### Post-Build Validation
- [ ] Run validator: `runFullAudit(ref.current)` → Score >95%
- [ ] Test viewports: 1366×768, 1440×900, 1920×1080
- [ ] No horizontal scroll, no internal scrollbars
- [ ] Lists capped to 5-7 items with pagination
- [ ] Add compliance header comment

---

# Nexus OS Foundation (BIOS Layer)

## 🎨 Design System (MANDATORY - Read First)

**Before building any NexusOS UI**, review these documents:

### Core Documentation
- 📘 **[Style Guide](./STYLE_GUIDE.md)** - Complete design system (typography, colors, spacing, icons)
- 🎯 **[Token Usage Guide](./ui/tokens/TOKEN_USAGE_GUIDE.md)** - Tactical icon library reference (200+ assets)
- ✅ **[Migration Checklist](./ui/tokens/TOKEN_MIGRATION_CHECKLIST.md)** - Token integration roadmap
- 🧬 **Design Tokens:** `ui/theme/design-tokens.js` - Import this for all styling
- 🔍 **Validator:** `validators/styleGuideValidator.js` - Automated compliance checking

### Design System Quick Reference

```jsx
// ✅ CORRECT: Import design tokens and primitives
import { NX_TYPOGRAPHY, NX_COLORS, NX_SPACING } from '@/components/nexus-os/ui/theme/design-tokens';
import { NexusButton, NexusBadge, NexusTokenIcon } from '@/components/nexus-os/ui/primitives';

// ✅ CORRECT: Use standardized components
<NexusButton intent="primary">Execute</NexusButton>
<NexusBadge tone="ok">READY</NexusBadge>
<NexusTokenIcon family="circle" color="green" size="sm" />

// ❌ WRONG: Custom implementations
<button className="px-4 py-2 bg-orange-600">Execute</button>
```

### Before You Build (5-Step Checklist)
1. ✅ Import design tokens: `import { NX_TYPOGRAPHY } from '@/components/nexus-os/ui/theme/design-tokens'`
2. ✅ Use primitives: `import { NexusButton, NexusBadge, NexusTokenIcon } from '@/components/nexus-os/ui/primitives'`
3. ✅ Follow typography: 8px and 10px only, font-semibold+, tracking-[0.12em]+, uppercase
4. ✅ Follow spacing: p-1.5/2/2.5, gap-1/1.5/2 (no larger gaps)
5. ✅ Use tokens for status/tactical, Lucide for UI controls

### After You Build (5-Step Validation)
1. ✅ Run validator: `runFullAudit(componentRef.current)` (score must be >95%)
2. ✅ Test viewports: 1366×768, 1440×900, 1920×1080
3. ✅ Verify no horizontal scroll anywhere
4. ✅ Verify lists paginated to 5-7 items (no internal scrollbars)
5. ✅ Add compliance header comment to file

This folder is the non-UI foundation for Nexus OS. It is intentionally isolated from routes/pages so we can lock doctrine before feature work.

## Hard Rules

1. Nexus OS is single-page and must avoid OS-level scrolling patterns.
2. Operational truth is event-sourced, timestamped, scoped, and TTL-bound.
3. AI assistants can structure/summarize known records, but must not invent facts.
4. Ops, CQB, Comms, Map, and Social views must read from the same substrate.
5. Extend behavior via registries/packs; do not hardcode mode-specific forks in UI.

## Contributor Guardrails

- Do not fake live game telemetry. Star Citizen state is declared/inferred only.
- Do not bypass TTL or confidence when rendering tactical or command state.
- Do not introduce omniscient/global-chat assumptions that ignore scope/authority.
- Do not wire these modules into existing routes without explicit migration planning.

## Layout

- `registries/`: canonical variant, macro, TTL, and comms template data.
- `schemas/`: core interfaces for CQB events, command intents, and location estimates.
- `services/`: operational services, including Base44 adapter boundaries for non-lock-in reads.
- `specs/`: doctrine and policy specs (no UI implementation).
- `ui/`: Nexus OS shell primitives, workbench grid, focus overlay, and bridge switcher.
- `preview/`: dev-only shell surface for immediate iteration.
- `validators/`: dev-only registry integrity checks (warnings only).

## Base44 Compatibility

- Avoid embedding raw Base44 table assumptions inside feature logic; use service adapters.
- Keep workspace sync writes routed through `updateWorkspaceState` contracts.
- Run `npm run verify:base44-context` before shipping NexusOS changes.