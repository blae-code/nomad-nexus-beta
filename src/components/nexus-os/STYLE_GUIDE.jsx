# NexusOS Style Guide (v2.0)

## Purpose
NexusOS UI must be deterministic, compact, scan-first, and fully compliant with the design token system. This guide is **mandatory** for all components in `components/nexus-os/ui/**`.

All components MUST include a design compliance header documenting typography, spacing, icons, tokens, and borders used.

---

## 1. Typography Standards

### Scale Hierarchy
- **Header Primary**: `text-[10px] font-black tracking-[0.15em] uppercase leading-none`
- **Header Secondary**: `text-[8px] font-bold tracking-[0.14em] uppercase leading-none`
- **Body Primary**: `text-[10px] font-semibold tracking-[0.12em] uppercase`
- **Body Secondary**: `text-[8px] font-semibold tracking-[0.14em] uppercase leading-none`
- **Telemetry**: `text-[10px] font-mono font-bold tracking-[0.15em] uppercase`
- **Telemetry Small**: `text-[8px] font-mono font-semibold tracking-[0.14em] uppercase`

### Mandatory Rules
- System labels and controls: **8px or 10px only** (11px/12px only for user-authored content exceptions)
- **`font-weight >= 600`** (semibold minimum)
- **Uppercase required** for system UI (exceptions: user messages, narrative, titles)
- **No TypeScript type annotations** — use vanilla JavaScript only
- Dynamic user-authored text may use `text-xs` or `text-sm` with `normal-case` for readability

### Validation
```js
// Allowed font sizes
const ALLOWED_FONT_SIZES = ['text-[8px]', 'text-[10px]', 'text-xs', 'text-sm'];
// Allowed font weights
const ALLOWED_FONT_WEIGHTS = ['font-semibold', 'font-bold', 'font-black'];
// Allowed letter spacing
const ALLOWED_TRACKING = ['tracking-[0.12em]', 'tracking-[0.14em]', 'tracking-[0.15em]'];
```

---

## 2. Color System

### Base Palette
- **Background Base**: `bg-zinc-950`
- **Background Elevated**: `bg-zinc-900`, `bg-zinc-900/80`, `bg-zinc-900/45`
- **Borders**: `border-zinc-700/40`, `border-zinc-700/60`, `border-zinc-800`
- **Text Primary**: `text-zinc-100`, `text-zinc-200`
- **Text Secondary**: `text-zinc-400`, `text-zinc-500`

### Accent Colors
- **Primary Accent**: `orange-400`, `orange-500` (active state, focus, transmit)
- **Command/Admin**: `red-600`, `red-500` (critical actions, admin controls)

### State Semantics
- **OK/Success**: `green-500`, `green-400` (ready, healthy, secure)
- **Warning**: `amber-500`, `amber-400`, `yellow-500` (caution, soft flags)
- **Danger**: `red-500`, `red-600` (critical, hostile, hard violations)
- **Neutral**: `zinc-400`, `zinc-500` (inactive, standby, offline)
- **Active**: `sky-500`, `blue-500` (in progress, engaged)

### Backdrop Rules
- **Opacity backdrops MUST include `backdrop-blur-sm`**
- Example: `bg-zinc-900/80 backdrop-blur-sm`
- Never use opacity without blur for readability

### Border Opacity Range
- **Standard range**: `zinc-700/40` to `zinc-700/60`
- **Elevated**: `zinc-800` (solid borders for critical panels)
- **Danger**: `red-900/60`, `red-900/70`
- **Warning**: `amber-900/50`, `amber-900/60`

---

## 3. Spacing Standards

### Padding
- **Panel**: `p-1.5`, `p-2`, `p-2.5`
- **Header**: `px-2.5 py-2` (standard), `px-2 py-1.5` (compact)
- **Card**: `px-1.5 py-1`, `px-2 py-1.5`
- **Inline Element**: `px-2 py-1`

### Gaps
- **Tight**: `gap-1` (dense lists, badges in row)
- **Standard**: `gap-1.5`, `gap-2` (normal spacing)
- **Relaxed**: `gap-2.5`, `gap-3` (section spacing)

### Margins
- **Avoid global margins** — use flex/grid gaps
- **Exceptions**: `mt-2`, `mb-2` for section breaks only

### Layout Constraints
- **No page scroll** or internal panel scroll in normal operation
- Lists **capped to 5-7 rows** with pagination controls
- Full detail goes to modal/drawer (which may scroll)

---

## 4. Icon and Token Sizes

### Lucide Icons
- **Compact**: `w-2.5 h-2.5` (tight rows, inline indicators)
- **Small**: `w-3 h-3`, `w-3.5 h-3.5` (standard UI actions)
- **Standard**: `w-4 h-4` (primary actions, headers)
- **Large**: `w-5 h-5` (prominent controls)

### Tactical Tokens
- **Small (sm)**: `w-3 h-3` (compact rows, badges)
- **Medium (md)**: `w-4 h-4` (default list/panel usage)
- **Large (lg)**: `w-5 h-5` (prominent card/header markers)
- **Extra Large (xl)**: `w-6 h-6` (focus markers only)

**Rule**: Tokens must be square. Icon/token size must match typography density.

---

## 5. Component Primitives (Mandatory)

### Button Component
- **Use `NexusButton` exclusively** — no raw `<button>` elements
- Props: `intent`, `size`, `disabled`, `onClick`, `className`
- Intents: `primary`, `secondary`, `subtle`, `danger`
- Sizes: `sm`, `md`, `lg`

### Badge Component
- **Use `NexusBadge` exclusively** — no custom badges
- Props: `tone`, `className`, `children`
- Tones: `ok`, `warning`, `danger`, `active`, `neutral`

### Status/Signal/Metric Cells
- **`NexusStatusPill`**: For status values (READY, STANDBY, OFFLINE)
- **`NexusSignalPill`**: For signal strength/quality indicators
- **`NexusMetricCell`**: For metric displays with icon + value + label

### Tactical Token UI
- **`NexusTokenIcon`**: Renders token family (circle, hex, penta, etc.) with color/size
- **`NexusStatusToken`**: Token + label combo for status display
- **`NexusRosterBadge`**: Roster number token with metadata
- **`NexusTokenLabel`**: Token-anchored label with consistent spacing

**Pattern**: Use primitives for all UI elements — no inline custom styling for buttons/badges/tokens.

---

## 6. Token System (Semantic Icons)

### When to Use Tokens vs Lucide
- **Tokens**: Tactical semantics (status, priority, objective, role, channel type, roster number)
- **Lucide**: Generic UI actions (open/close, edit, settings, navigation)

### Token Families
- **`circle`**: Live state (ready, tx, muted, offline)
- **`hex`**: Channel/network classification
- **`target`, `target-alt`, `objective`**: Mission/objective/asset markers
- **`penta`**: Operation phase/status
- **`triangle`**: Alert/priority
- **`number-0` to `number-13`**: Roster/order/count markers
- **`hospital`, `mechanics`, `fuel`, etc.**: Specialist/resource semantics

### Color Semantics
- **Red**: Danger/hostile/critical
- **Orange**: Active/transmit/priority
- **Yellow**: Warning/caution
- **Green**: Healthy/ready/secure
- **Blue**: Allied/info
- **Cyan**: Support/utility
- **Grey**: Inactive/offline
- **Purple variants**: Secure/encrypted/degraded escalation

### Variant Rules
- **`base`**: Normal state
- **`v1`**: Secure/encrypted/hardened
- **`v2`**: Critical/degraded/escalated

See `ui/tokens/TOKEN_USAGE_GUIDE.md` for detailed patterns.

---

## 7. Validation and Testing

### Automated Validation
```js
import { runFullAudit } from '@/components/nexus-os/validators/styleGuideValidator';

// In development mode, run audit on mount
const report = runFullAudit(componentRef.current, { strict: false });
console.log('Compliance:', report.complianceScore, report.summary);
```

### Manual Checklist
- [ ] All typography uses 8px or 10px for system labels
- [ ] All font weights are >= 600 (semibold)
- [ ] Spacing uses only approved values (p-1.5, p-2, p-2.5, gap-1, gap-1.5, gap-2)
- [ ] Icons are square and use approved sizes
- [ ] Borders use approved opacity ranges (zinc-700/40 to zinc-700/60)
- [ ] Opacity backdrops include backdrop-blur-sm
- [ ] No TypeScript syntax (no type annotations, no `as` casts, no interfaces in JSX files)
- [ ] Component has design compliance header documenting all standards used

### Build Validation
```bash
npm run build  # Must pass without TypeScript errors
```

---

## 8. Mandatory Hard Rules

### Typography Don'ts
- ❌ No font sizes other than 8px, 10px (system) or xs/sm (user content)
- ❌ No font-weight < 600
- ❌ No lowercase text for system labels
- ❌ No letter-spacing outside 0.12em-0.15em range

### Layout Don'ts
- ❌ No page-level scroll (use h-screen/dvh + internal overflow)
- ❌ No unbounded lists (must cap at 5-7 items + pagination)
- ❌ No decorative gradients in persistent panels
- ❌ No horizontal scroll at 1366×768 minimum

### Token Don'ts
- ❌ No token sizes outside 12-24px (w-3 to w-6)
- ❌ No text-only status if semantic token exists
- ❌ No mixing token + Lucide for same semantic role in one row
- ❌ No decorative token use without meaning

### Technical Don'ts
- ❌ No TypeScript syntax in component files
- ❌ No new framework/runtime dependency for design enforcement
- ❌ No fabricated telemetry or backend data

---

## 9. Design Compliance Header (Mandatory)

Every NexusOS component MUST include this header:
```js
/**
 * ComponentName - Brief description
 * 
 * DESIGN COMPLIANCE:
 * - Typography: headerPrimary (10px black), bodySecondary (8px semibold)
 * - Spacing: px-2.5 py-2 (header), p-1.5 (body), gap-1.5
 * - Icons: w-3.5 h-3.5 (Lucide primary actions)
 * - Tokens: circle (status), number-X (roster), penta (op phase)
 * - Borders: zinc-700/40 (standard), zinc-800 (elevated)
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 * @see components/nexus-os/ui/tokens/TOKEN_USAGE_GUIDE.md
 */
```

---

## 10. Common Patterns

### Panel Structure
```js
<div className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5">
  <header className="flex items-center justify-between mb-2">
    <h4 className="text-[10px] font-black uppercase tracking-[0.15em]">PANEL TITLE</h4>
    <NexusBadge tone="active">STATUS</NexusBadge>
  </header>
  <div className="space-y-1.5">
    {/* Panel content */}
  </div>
</div>
```

### List Item with Token
```js
<div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-800 bg-zinc-950/55">
  <NexusTokenIcon family="circle" color="green" size="sm" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">ITEM LABEL</span>
  <NexusBadge tone="ok">READY</NexusBadge>
</div>
```

### Pagination Controls
```js
<div className="flex items-center justify-between gap-2">
  <NexusButton size="sm" intent="subtle" disabled={page === 0} onClick={prevPage}>Prev</NexusButton>
  <NexusBadge tone="neutral">{page + 1}/{pageCount}</NexusBadge>
  <NexusButton size="sm" intent="subtle" disabled={page >= pageCount - 1} onClick={nextPage}>Next</NexusButton>
</div>
```

---

## 11. Validation Tools

### Runtime Audit
```js
import { runFullAudit } from '@/components/nexus-os/validators/styleGuideValidator';

const report = runFullAudit(componentRef.current, { strict: false });
// report.complianceScore: 0-100
// report.summary: human-readable summary
// report.violations: array of specific issues
```

### React Hook (Development Only)
```js
import { useStyleGuideValidation } from '@/components/nexus-os/validators/styleGuideValidator';

export default function MyComponent() {
  const ref = useStyleGuideValidation('MyComponent');
  return <div ref={ref}>...</div>;
}
```

---

## 12. Migration Checklist

When updating existing components:
- [ ] Remove all TypeScript syntax (`as`, `: Type`, `interface`, `<Generic>`)
- [ ] Add design compliance header
- [ ] Replace raw buttons with `NexusButton`
- [ ] Replace raw badges with `NexusBadge`
- [ ] Verify typography scale (8px/10px for system labels)
- [ ] Verify spacing (p-1.5, p-2, p-2.5, gap-1, gap-1.5, gap-2)
- [ ] Verify icon sizes (w-3 to w-4)
- [ ] Verify token sizes (w-3 to w-6)
- [ ] Verify border opacity (zinc-700/40 to zinc-700/60)
- [ ] Add backdrop-blur-sm to all opacity backgrounds
- [ ] Build passes without errors