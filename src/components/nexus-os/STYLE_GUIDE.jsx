# NexusOS Design System Style Guide

**Version:** 1.0  
**Status:** Enforced  
**Last Updated:** 2026-02-25

---

## Philosophy

NexusOS embodies **military-grade precision** in every pixel:
- Zero ambiguity in visual hierarchy
- Combat-ready information density
- Instant scannability under stress
- Deterministic, predictable interactions

This guide is **mandatory** for all NexusOS UI development.

---

## Table of Contents

1. [Typography System](#typography-system)
2. [Color Palette](#color-palette)
3. [Spacing & Layout](#spacing--layout)
4. [Icon Standards](#icon-standards)
5. [Component Specifications](#component-specifications)
6. [Token System](#token-system)
7. [Animation & Transitions](#animation--transitions)
8. [Accessibility Requirements](#accessibility-requirements)
9. [Critical Don'ts](#critical-donts)
10. [Checklist for New Components](#checklist-for-new-components)

---

## Typography System

### The Rule: 8px and 10px ONLY

**All text** in NexusOS uses exactly two font sizes:
- `text-[8px]` - Secondary labels, helper text, compact data
- `text-[10px]` - Primary headers, body text, telemetry

**No exceptions.** No 12px, no 14px, no 16px.

### Complete Hierarchy

| Scale | Usage | Class |
|-------|-------|-------|
| **Header Primary** | Panel titles, section headers | `text-[10px] font-black tracking-[0.15em] uppercase leading-none` |
| **Header Secondary** | Subsection titles | `text-[8px] font-bold tracking-[0.14em] uppercase leading-none` |
| **Body Primary** | Primary labels, descriptions | `text-[10px] font-semibold tracking-[0.12em] uppercase` |
| **Body Secondary** | Secondary labels, helper text | `text-[8px] font-semibold tracking-[0.14em] leading-none` |
| **Telemetry Primary** | Numeric values, status codes | `text-[10px] font-mono font-bold tracking-[0.15em]` |
| **Telemetry Secondary** | Small metrics, compact data | `text-[8px] font-mono font-semibold tracking-[0.14em]` |
| **Button** | All button labels | `text-[10px] font-semibold uppercase tracking-[0.12em]` |
| **Badge** | All badge labels | `text-[10px] font-semibold uppercase tracking-[0.14em]` |
| **Pill** | Status and signal pills | `text-[8px] font-mono uppercase tracking-wider font-semibold` |

### Font Weight Rules

**Minimum weight: 600 (semibold)**

- `font-semibold` (600) - Body text, labels
- `font-bold` (700) - Secondary headers, important text
- `font-extrabold` (800) - Focus app headers
- `font-black` (900) - Primary headers, critical elements

Never use `font-normal` or `font-medium` in NexusOS.

### Letter Spacing Rules

**Minimum tracking: 0.12em**

- `tracking-[0.12em]` - Body text (minimum)
- `tracking-[0.14em]` - Standard labels
- `tracking-[0.15em]` - Headers and telemetry
- `tracking-wider` - Pills and compact text

Never use `tracking-normal` or `tracking-tight`.

### Text Transform

**Everything is uppercase.**

All visible text must use `uppercase` or be manually uppercase. No lowercase, no capitalize (except proper nouns in content areas).

---

## Color Palette

### Base Colors (Zinc Scale)

- `zinc-950` - Primary background
- `zinc-900` - Elevated surfaces, panels
- `zinc-800` - Dividers (with opacity)
- `zinc-700` - Borders (with opacity)
- `zinc-600` - Locked/disabled states
- `zinc-500` - Muted icons
- `zinc-400` - Muted text
- `zinc-300` - Secondary text
- `zinc-100` - Primary text

### Accent Colors

- `orange-400` - Primary accent (bright)
- `orange-500` - Primary accent (standard)
- `red-500` - Admin/command accent
- `red-600` - Command authority

### Semantic State Colors

| State | Color | Usage |
|-------|-------|-------|
| **OK/Ready** | `green-400` | Operational, ready, complete, healthy |
| **Warning** | `amber-400` | Caution, attention needed, pending |
| **Danger** | `red-500` | Critical, failed, hostile, emergency |
| **Active** | `orange-500` | Transmitting, engaged, primary focus |
| **Neutral** | `zinc-400` | Inactive, default, standard |

### Border Color Standards

**All borders must use opacity:**

- `border-zinc-700/40` - Standard borders (40% opacity)
- `border-zinc-700/60` - Elevated borders (60% opacity)
- `border-zinc-800/60` - Dividers (60% opacity)

**Semantic borders:**
- `border-orange-500/45` - Active state (45% opacity)
- `border-orange-500/64` - Primary buttons (64% opacity)
- `border-emerald-600/60` - OK state (60% opacity)
- `border-amber-600/60` - Warning state (60% opacity)
- `border-red-600/60` - Danger state (60% opacity)

### Background Color Standards

**Opacity backgrounds must include backdrop-blur:**

```jsx
// CORRECT: Opacity + blur
<div className="bg-zinc-950/80 backdrop-blur-sm">

// WRONG: Opacity without blur
<div className="bg-zinc-950/80">
```

**Standard combinations:**
- `bg-zinc-950/80 backdrop-blur-sm` - Panels
- `bg-zinc-900/40 backdrop-blur-sm` - Headers
- `bg-zinc-900/90 backdrop-blur-sm` - Cards
- `bg-zinc-900/95 backdrop-blur-sm` - Elevated cards

### Gradients

**Decorative gradients are forbidden.**

Gradients are only allowed for:
- Hover effects (temporary state changes)
- Active state transitions
- Focus indicators
- Loading/shimmer effects

---

## Spacing & Layout

### Padding Standards

| Context | Class | Pixels | Usage |
|---------|-------|--------|-------|
| **Header Compact** | `px-2 py-1.5` | 8px×6px | Tight panel headers |
| **Header Standard** | `px-2.5 py-2` | 10px×8px | Standard panel headers |
| **Panel Body** | `p-1.5` | 6px | Panel content area |
| **Card** | `px-1.5 py-1` | 6px×4px | Cards, list items |
| **Button** | `px-2 py-1` | 8px×4px | Button padding |
| **Compact** | `p-1.5` | 6px | General compact |
| **Standard** | `p-2` | 8px | General standard |
| **Relaxed** | `p-2.5` | 10px | General relaxed |

### Gap Standards

- `gap-1` (4px) - Tight spacing (icon + text in pills)
- `gap-1.5` (6px) - Standard spacing (most layouts)
- `gap-2` (8px) - Relaxed spacing (section separation)

Never use `gap-3` or larger in NexusOS.

### Margin Standards

**Margins should be minimal.** Prefer `gap` over `margin`.

Valid use cases:
- `mt-0.5`, `mb-0.5` - Fine-tuning alignment
- `m-1` - Isolated elements

### Border Radius

- `rounded` (4px) - Pills, badges, small buttons
- `rounded-md` (6px) - Standard buttons, inputs
- `rounded-lg` (8px) - Cards, panels
- `rounded-full` - Dots, circles, avatars

---

## Icon Standards

### Size Matrix

| Size | Class | Pixels | Usage |
|------|-------|--------|-------|
| **XS** | `w-2.5 h-2.5` | 10px | Signal indicators, dots |
| **SM** | `w-3 h-3` | 12px | Buttons, inline icons, telemetry pills |
| **MD** | `w-3.5 h-3.5` | 14px | Headers, primary actions, controls |
| **LG** | `w-4 h-4` | 16px | Collapsed panels, featured icons |

**All icons must be square** (w-X h-X, never w-3 h-4).

### Icon Color Standards

- Primary icons: `text-orange-400` or `text-orange-500`
- Muted icons: `text-zinc-500`
- State icons: `text-green-400`, `text-amber-400`, `text-red-500`
- Hover: `hover:text-orange-400` (from muted)

### Icon vs Token Decision

**Use Lucide icons for:** UI controls, actions, navigation  
**Use tokens for:** Status, tactical symbols, operational markers

See [Token System](#token-system) for details.

---

## Component Specifications

### NexusBadge

**Purpose:** Labeled badges for status, categories, tags.

**Props:**
- `tone` - Visual tone (neutral, active, ok, warning, danger, locked, experimental)
- `className` - Additional classes
- `children` - Badge content

**Tone Classes:**
```javascript
neutral: 'border-zinc-700 bg-zinc-900/80 text-zinc-300'
active: 'border-orange-500/45 bg-orange-500/14 text-zinc-100'
ok: 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200'
warning: 'border-amber-600/60 bg-amber-950/45 text-amber-200'
danger: 'border-red-600/60 bg-red-950/45 text-red-200'
locked: 'border-zinc-600 bg-zinc-900/95 text-zinc-400'
experimental: 'border-purple-500/45 bg-purple-500/14 text-purple-100'
```

**Example:**
```jsx
<NexusBadge tone="ok">READY</NexusBadge>
<NexusBadge tone="danger">CRITICAL</NexusBadge>
```

---

### NexusButton

**Purpose:** All clickable buttons in NexusOS.

**Props:**
- `intent` - Visual style (primary, neutral, subtle, danger)
- `size` - Size variant (sm, md, lg)
- `className` - Additional classes

**Intent Classes:**
```javascript
primary: 'border-orange-500/64 bg-orange-500/34 text-white'
neutral: 'border-zinc-600 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-50'
subtle: 'border-zinc-700/24 bg-zinc-900/90 text-zinc-100'
danger: 'border-red-500/60 bg-red-900/70 text-white'
```

**Icon Enforcement:** All icons inside buttons must be `w-3 h-3`.

**Example:**
```jsx
<NexusButton intent="primary">
  <Zap className="w-3 h-3 mr-1" />
  Execute
</NexusButton>
```

---

### NexusStatusPill

**Purpose:** Compact status with dot + label.

**Props:**
- `tone` - Visual tone
- `label` - Status text
- `size` - sm (default), md

**Structure:** Dot (1.5×1.5px) + Label (8px mono)

**Example:**
```jsx
<NexusStatusPill tone="ok" label="ACTIVE" />
```

---

### NexusSignalPill

**Purpose:** Metric pill with icon + value.

**Props:**
- `tone` - Visual tone
- `value` - Numeric value
- `icon` - Lucide icon component
- `unit` - Unit suffix (ms, %, etc.)

**Example:**
```jsx
<NexusSignalPill tone="ok" value={45} icon={Signal} unit="ms" />
```

---

### NexusMetricCell

**Purpose:** Labeled metric for footers/grids.

**Props:**
- `label` - Metric label
- `value` - Metric value
- `tone` - Value color tone
- `token` - Optional token config

**Example:**
```jsx
<NexusMetricCell label="FUEL" value="87%" tone="ok" />
<NexusMetricCell 
  label="FUEL" 
  value="87%" 
  tone="ok"
  token={{ family: 'fuel', color: 'orange', size: 'sm' }}
/>
```

---

### Token Primitives

**See [Token System](#token-system) for complete documentation.**

- **NexusTokenIcon** - Renders token image with sizing
- **NexusStatusToken** - Token + optional label
- **NexusRosterBadge** - Number + callsign + role + status
- **NexusTokenLabel** - Token + text (inline/stacked)

---

## Token System

### Token Families (Complete List)

- **Shapes:** circle, hex, penta, square, triangle, objective
- **Resources:** ammunition, energy, food, fuel, shelter
- **Specialist:** hospital, mechanics
- **Tactical:** target, target-alt
- **Numbers:** number-0 through number-13

### Color Semantics

| Color | Meaning | Examples |
|-------|---------|----------|
| **red** | Danger, hostile, critical | Enemy contact, critical alert, failed |
| **orange** | Active, transmitting, primary | TX state, active mission, engaged |
| **yellow** | Warning, pending, caution | Warning, pending, in-progress |
| **green** | Ready, healthy, secure | Operational, ready, complete, friendly |
| **blue** | Friendly, standard, info | Allied, standard, informational |
| **cyan** | Support, logistics, secondary | Support roles, logistics, utility |
| **grey** | Inactive, offline, neutral | Offline, disabled, archived |
| **purple** | Special (encrypted, secured) | Secured comms, encrypted |
| **violet** | Alternative special (VIP) | VIP, experimental, unique |

### Token Sizing

| Size | Class | Pixels | Usage |
|------|-------|--------|-------|
| **sm** | `w-3 h-3` | 12px | Inline badges, roster |
| **md** | `w-4 h-4` | 16px | Standard markers, list items |
| **lg** | `w-5 h-5` | 20px | Headers, featured items |
| **xl** | `w-6 h-6` | 24px | Map markers, hero elements |

### When to Use Tokens vs Lucide

**Tokens:** Status, tactical symbols, roles, priorities  
**Lucide:** UI controls, actions, navigation

**Example:**
```jsx
// Status indicator - USE TOKEN
<NexusTokenIcon family="circle" color="green" size="sm" />

// Edit button - USE LUCIDE
<button><Edit className="w-3 h-3" /></button>
```

### Implementation

```jsx
import { NexusTokenIcon, NexusStatusToken } from '@/components/nexus-os/ui/primitives';

// Basic token
<NexusTokenIcon family="circle" color="green" size="sm" />

// Status with label
<NexusStatusToken status="ready" label="READY" size="sm" />

// Roster badge
<NexusRosterBadge
  number={1}
  callsign="HAWK"
  role="pilot"
  state="ready"
/>
```

**See:** `components/nexus-os/ui/tokens/TOKEN_USAGE_GUIDE.md` for comprehensive token documentation.

---

## Animation & Transitions

### Standard Timing

- **Fast:** `duration-150` - Instant feedback (hovers, clicks)
- **Standard:** `duration-200` - Default transitions
- **Slow:** `duration-300` - Panel animations, slides

### Hover Effects

```jsx
// Standard button hover
hover:brightness-105 transition-all duration-200

// Icon hover
hover:text-orange-400 transition-colors duration-200

// Scale hover (use sparingly)
hover:scale-105 transition-transform duration-200
```

### Active States

```jsx
// Button active
active:brightness-100

// Icon active
active:text-orange-500
```

### Reduced Motion Support

All animations automatically respect `prefers-reduced-motion`. No additional code needed (handled in globals.css).

---

## Accessibility Requirements

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Focus states must be visible: `focus:ring-2 focus:ring-orange-500/40`
- Tab order must be logical

### ARIA Labels

**Required for:**
- Icon-only buttons
- Token images (use tooltip prop)
- Status indicators
- Metric cells

**Example:**
```jsx
<button aria-label="Close panel" title="Close panel">
  <X className="w-3 h-3" />
</button>

<NexusTokenIcon
  family="circle"
  color="green"
  size="sm"
  tooltip="Online - Ready"
/>
```

### Color Contrast

All text must meet **WCAG AA** standards:
- Small text (8px, 10px): 4.5:1 minimum
- Large text (never used in NexusOS): 3:1 minimum

**Verified combinations:**
- `text-zinc-100` on `bg-zinc-950` ✅ (16.1:1)
- `text-zinc-300` on `bg-zinc-900` ✅ (10.5:1)
- `text-orange-400` on `bg-zinc-950` ✅ (7.8:1)

---

## Critical Don'ts

### ❌ Typography Violations

```jsx
// WRONG: Wrong font size
<span className="text-xs">...</span>          // 12px
<span className="text-sm">...</span>          // 14px
<span className="text-[12px]">...</span>      // 12px

// CORRECT: Use 8px or 10px only
<span className="text-[8px]">...</span>
<span className="text-[10px]">...</span>
```

```jsx
// WRONG: Light font weight
<span className="font-normal">...</span>      // 400
<span className="font-medium">...</span>      // 500

// CORRECT: 600+ only
<span className="font-semibold">...</span>    // 600
<span className="font-bold">...</span>        // 700
```

```jsx
// WRONG: Not uppercase
<span className="capitalize">...</span>
<span>hello world</span>

// CORRECT: Always uppercase
<span className="uppercase">...</span>
<span>HELLO WORLD</span>
```

### ❌ Spacing Violations

```jsx
// WRONG: Large padding/gaps
<div className="p-4 gap-3">...</div>          // 16px, 12px

// CORRECT: Use standards
<div className="p-2 gap-1.5">...</div>        // 8px, 6px
```

### ❌ Color Violations

```jsx
// WRONG: Opacity without blur
<div className="bg-zinc-900/80">...</div>

// CORRECT: Opacity + blur
<div className="bg-zinc-900/80 backdrop-blur-sm">...</div>
```

```jsx
// WRONG: Border without opacity
<div className="border border-zinc-700">...</div>

// CORRECT: Border with opacity
<div className="border border-zinc-700/40">...</div>
```

### ❌ Icon Violations

```jsx
// WRONG: Wrong sizes
<Icon className="w-5 h-5" />                  // Not in matrix
<Icon className="w-3 h-4" />                  // Not square

// CORRECT: Use matrix sizes, always square
<Icon className="w-3 h-3" />
<Icon className="w-3.5 h-3.5" />
```

### ❌ Token Violations

```jsx
// WRONG: Hardcoded path
<img src="/tokens/token-circle-green.png" />

// CORRECT: Use primitive
<NexusTokenIcon family="circle" color="green" size="sm" />
```

```jsx
// WRONG: Token for UI control
<NexusTokenIcon family="circle" color="orange" />
<button>Edit</button>

// CORRECT: Lucide for UI controls
<button><Edit className="w-3 h-3" />Edit</button>
```

---

## Checklist for New Components

Before committing a new NexusOS component:

### Typography
- [ ] All text is 8px or 10px
- [ ] All text is font-semibold or bolder
- [ ] All text has tracking-[0.12em] or wider
- [ ] All text is uppercase (or manually uppercase)

### Spacing
- [ ] Padding uses p-1.5, p-2, or p-2.5
- [ ] Gaps use gap-1, gap-1.5, or gap-2
- [ ] Margins are minimal or absent

### Icons
- [ ] All Lucide icons are w-2.5, w-3, w-3.5, or w-4
- [ ] All icons are square (w-X h-X)
- [ ] Icons have appropriate color

### Tokens (if applicable)
- [ ] Tokens use NexusTokenIcon component
- [ ] Token sizing follows matrix (sm/md/lg/xl)
- [ ] Token colors follow semantics (red=danger, green=ok)
- [ ] Tokens have tooltips/aria-labels

### Colors
- [ ] Borders use zinc-700/40 or zinc-700/60
- [ ] Opacity backgrounds include backdrop-blur-sm
- [ ] No decorative gradients
- [ ] Semantic colors used correctly

### Primitives
- [ ] Buttons use NexusButton
- [ ] Badges use NexusBadge
- [ ] Status uses NexusStatusPill or NexusStatusToken
- [ ] Metrics use NexusMetricCell

### Accessibility
- [ ] Icon-only buttons have aria-label
- [ ] Interactive elements are keyboard accessible
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG AA

### Layout
- [ ] No horizontal scroll
- [ ] No internal scrollbars (lists paginated to 5-7)
- [ ] Works at 1366×768, 1440×900, 1920×1080

### Documentation
- [ ] JSDoc header with compliance note
- [ ] Props documented
- [ ] Usage examples in comments

---

## Before/After Examples

### Example 1: Status Indicator

**Before:**
```jsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-green-500 rounded-full" />
  <span className="text-sm font-medium">Ready</span>
</div>
```

**After:**
```jsx
<NexusStatusPill tone="ok" label="READY" />
```

**Impact:** Typography compliant, spacing standardized, primitive usage.

---

### Example 2: Button

**Before:**
```jsx
<button className="px-4 py-2 bg-orange-600 text-white rounded">
  Execute
</button>
```

**After:**
```jsx
<NexusButton intent="primary">
  <Zap className="w-3 h-3 mr-1" />
  Execute
</NexusButton>
```

**Impact:** Typography, spacing, icon sizing, hover effects all standardized.

---

### Example 3: Panel Header

**Before:**
```jsx
<div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
  <h3 className="text-sm font-semibold">Voice Control</h3>
</div>
```

**After:**
```jsx
<div className="px-2.5 py-2 border border-zinc-700/40 bg-zinc-900/40 backdrop-blur-sm">
  <h3 className="text-[10px] font-black tracking-[0.15em] uppercase leading-none">
    Voice Control
  </h3>
</div>
```

**Impact:** Typography hierarchy, spacing, border opacity, backdrop blur.

---

### Example 4: Token Usage

**Before:**
```jsx
<div className="flex items-center gap-2">
  <Circle className="w-4 h-4 text-green-500" />
  <span>Pilot</span>
</div>
```

**After:**
```jsx
<div className="flex items-center gap-1.5">
  <NexusTokenIcon family="fuel" color="blue" size="sm" />
  <span className="text-[8px] uppercase tracking-[0.14em]">PILOT</span>
</div>
```

**Impact:** Token usage, typography, spacing standardized.

---

## Validation Tool

Use the style guide validator for automated compliance checking:

```javascript
import { runFullAudit } from '@/components/nexus-os/validators/styleGuideValidator';

const componentRef = useRef(null);

useEffect(() => {
  if (componentRef.current) {
    const report = runFullAudit(componentRef.current, { strict: false });
    console.log('Compliance score:', report.score);
  }
}, []);
```

**In development mode**, violations are logged to console automatically.

---

## Resources

- **Design Tokens:** `components/nexus-os/ui/theme/design-tokens.js`
- **Token Guide:** `components/nexus-os/ui/tokens/TOKEN_USAGE_GUIDE.md`
- **Primitives:** `components/nexus-os/ui/primitives/`
- **Validator:** `components/nexus-os/validators/styleGuideValidator.js`
- **Component Template:** `components/nexus-os/ui/_template/NexusComponentTemplate.jsx`

---

## Enforcement

**This guide is mandatory.** All NexusOS components must comply.

**Pre-merge checklist:**
1. Run style guide validator
2. Verify compliance score >95%
3. Fix all violations
4. Add compliance header comment
5. Test at all breakpoints

**Questions?** Reference this guide or ask in team chat.

---

**Last Updated:** 2026-02-25  
**Maintained By:** NexusOS Design System Team