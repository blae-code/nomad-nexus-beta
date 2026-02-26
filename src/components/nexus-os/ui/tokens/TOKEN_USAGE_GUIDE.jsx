# NexusOS Token Usage Guide (v2.0)

## Overview
Tactical tokens are semantic icons with strict color, family, and size mappings. They provide deterministic visual language for operation-critical information.

**Core Principle**: Tokens convey **tactical semantics**, Lucide icons convey **UI actions**.

---

## 1. Token vs Lucide Decision Tree

### Use Tokens For:
- **Status markers**: READY, STANDBY, OFFLINE, TX, MUTED
- **Priority levels**: CRITICAL, HIGH, STANDARD, LOW
- **Operation phases**: PLANNING, ACTIVE, WRAPPING, ARCHIVED
- **Objective states**: OPEN, IN_PROGRESS, DONE, BLOCKED
- **Channel types**: COMMAND, SQUAD, SUPPORT, GENERAL
- **Roster positions**: #0-#13 (numbered roster slots)
- **Specialist roles**: Medic, Engineer, Gunner (hospital, mechanics, target icons)
- **Resource states**: Fuel, Ammo, Energy, Food (fuel, ammunition, energy, food icons)

### Use Lucide For:
- **UI navigation**: ChevronRight, ChevronDown, ArrowLeft
- **Generic actions**: Edit, Trash, Copy, Download, Upload, Settings
- **Content indicators**: MessageSquare, Calendar, Clock, User, Users
- **Layout controls**: Maximize, Minimize, X (close)

### Anti-Pattern
❌ **Never mix** token and Lucide for the same semantic role in one row:
```js
// BAD
<div>
  <Circle className="w-3 h-3" /> {/* Lucide */}
  <NexusTokenIcon family="circle" color="green" /> {/* Token */}
</div>

// GOOD - Pick one system per semantic domain
<div>
  <NexusTokenIcon family="circle" color="green" size="sm" />
</div>
```

---

## 2. Token Family Reference

### Status Tokens (`circle` family)
- **circle-green**: Ready, Healthy, Secure, Online
- **circle-orange**: Active, Transmitting, Priority
- **circle-yellow**: Warning, Standby, Caution
- **circle-red**: Critical, Hostile, Offline, Danger
- **circle-grey**: Inactive, Offline, Disabled
- **circle-purple** variants: Encrypted, Degraded, Escalated

### Channel/Network Tokens (`hex` family)
- **hex-orange**: Command net, Admin channel
- **hex-blue**: Squad net, Operational channel
- **hex-cyan**: Support net, Utility channel
- **hex-grey**: Inactive, Archived
- **hex-purple** variants: Secure channel, Encrypted net

### Mission/Objective Tokens
- **target-red**: Combat objective, Hostile target
- **target-orange**: Priority objective, Active mission
- **target-green**: Friendly asset, Secure objective
- **objective-orange**: Primary objective marker
- **objective-blue**: Secondary objective
- **objective-grey**: Archived/completed objective

### Operation Phase Tokens (`penta` family)
- **penta-yellow**: PLANNING phase
- **penta-orange**: ACTIVE phase
- **penta-blue**: WRAPPING phase
- **penta-grey**: ARCHIVED phase

### Alert/Priority Tokens (`triangle` family)
- **triangle-red**: Critical alert, Immediate action
- **triangle-orange**: High priority, Urgent
- **triangle-yellow**: Standard priority, Caution

### Roster Tokens (`number-X` family)
- **number-0** to **number-13**: Numbered roster positions
- Color-coded by role or squad assignment

### Specialist/Resource Tokens
- **hospital-green**: Medic, Medical resource
- **mechanics-cyan**: Engineer, Repair capability
- **fuel-yellow**: Refuel, Fuel depot
- **energy-blue**: Power, Energy resource
- **ammunition-red**: Ammo, Combat supply
- **food-green**: Sustenance, Supply depot
- **shelter-cyan**: Safe zone, Bunker

---

## 3. Size Rules and Density

### Token Size Matrix
| Context | Size Prop | Tailwind Classes | Use Case |
|---------|-----------|------------------|----------|
| Compact row | `sm` | `w-3 h-3` | Dense lists, inline badges |
| Default list | `md` | `w-4 h-4` | Standard roster/panel items |
| Prominent card | `lg` | `w-5 h-5` | Headers, featured markers |
| Focus marker | `xl` | `w-6 h-6` | Selected item, primary focus |

**Rule**: Token size must scale with text density. Never use `xl` in compact rows.

---

## 4. Color Variant System

### Base Variant (default)
- Normal operational state
- Example: `circle-green` = ready unit

### V1 Variant (enhanced)
- Secure/encrypted/hardened state
- Example: `circle-green-v1` = ready unit with secure comms

### V2 Variant (escalated)
- Critical/degraded/escalated state
- Example: `circle-red-v2` = critical alert with escalation

**Usage**:
```js
<NexusTokenIcon family="circle" color="green" variant="base" size="md" />
<NexusTokenIcon family="circle" color="green" variant="v1" size="md" /> {/* Secure */}
<NexusTokenIcon family="circle" color="red" variant="v2" size="md" /> {/* Critical escalation */}
```

---

## 5. Common UI Patterns

### Roster Row (Standard)
```js
<div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-800 bg-zinc-950/55">
  <NexusTokenIcon family="number-3" color="blue" size="sm" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-200">
    SPECTRE-02
  </span>
  <NexusTokenIcon family="target" color="orange" size="sm" />
  <NexusTokenIcon family="circle" color="green" size="sm" />
  <NexusBadge tone="ok">READY</NexusBadge>
</div>
```

### Channel Row
```js
<div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-800 bg-zinc-950/55">
  <NexusTokenIcon family="hex" color="orange" size="sm" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] flex-1">
    COMMAND
  </span>
  <NexusTokenIcon family="number-5" color="orange" size="sm" />
</div>
```

### Map Marker (Inline Image)
```js
<img
  src={getSemanticTokenUrl('circle', 'green', 'base', 'md')}
  alt="Ready unit"
  className="w-4 h-4 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
/>
```

### Status Display
```js
<NexusStatusToken
  family="circle"
  color="green"
  size="md"
  label="READY"
  tone="ok"
/>
```

---

## 6. Anti-Patterns to Avoid

### ❌ Mixing Systems
```js
// BAD - mixing Lucide + Token for status
<div>
  <Circle className="w-3 h-3 text-green-500" />
  <NexusTokenIcon family="circle" color="green" />
</div>

// GOOD - use one system
<div>
  <NexusTokenIcon family="circle" color="green" size="sm" />
</div>
```

### ❌ Decorative Token Use
```js
// BAD - token without semantic meaning
<NexusTokenIcon family="target" color="red" size="lg" /> {/* Just for decoration */}

// GOOD - token with tactical meaning
<NexusTokenIcon family="target" color="red" size="md" /> {/* Hostile objective marker */}
```

### ❌ Wrong Color for Semantics
```js
// BAD - red for success
<NexusTokenIcon family="circle" color="red" /> READY

// GOOD - green for ready/success
<NexusTokenIcon family="circle" color="green" /> READY
```

### ❌ Missing Accessibility
```js
// BAD - token without alt text
<img src={tokenUrl} className="w-4 h-4" />

// GOOD - token with semantic alt
<img src={tokenUrl} alt="Ready status" className="w-4 h-4" />
```

---

## 7. Token Asset Integration

### Using getSemanticTokenUrl
```js
import { getSemanticTokenUrl } from '@/components/nexus-os/ui/theme/design-tokens';

const statusIconUrl = getSemanticTokenUrl('circle', 'green', 'base', 'md');
// Returns: /tokens/tactical/circle-green.svg (or similar path)
```

### Token Asset Map
See `ui/tokens/tokenAssetMap.js` for complete mapping of all 200+ token assets.

---

## 8. Validation and Testing

### Component-Level Validation
Every component should validate token usage:
```js
// Check if token exists before rendering
const tokenUrl = getSemanticTokenUrl(family, color, variant, size);
if (!tokenUrl) {
  console.warn(`Token not found: ${family}-${color}-${variant}`);
  // Fallback to Lucide or neutral token
}
```

### Regression Prevention
- Token family/color/variant combos must exist in asset map
- Token sizes must be square (w-X h-X)
- Alt text required for all token images
- Tone prop must align with color semantic (green → ok, red → danger)

---

## 9. Quick Reference

| Semantic | Token Family | Color Options | Example Use |
|----------|--------------|---------------|-------------|
| Unit ready | circle | green, orange, red, grey | Roster status |
| Command net | hex | orange, red | Voice net type |
| Combat objective | target | red, orange, green | Mission marker |
| Op phase | penta | yellow, orange, blue, grey | Operation status |
| Alert | triangle | red, orange, yellow | Priority indicator |
| Roster slot | number-X | Any | Numbered position |
| Medic role | hospital | green, cyan | Specialist marker |

---

## 10. Migration Examples

### Before (Non-Compliant)
```js
<div className="status-indicator">
  <Circle className="w-4 h-4 text-green-500" />
  <span>Ready</span>
</div>
```

### After (Compliant)
```js
<div className="flex items-center gap-1.5">
  <NexusTokenIcon family="circle" color="green" size="md" />
  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">READY</span>
</div>
``