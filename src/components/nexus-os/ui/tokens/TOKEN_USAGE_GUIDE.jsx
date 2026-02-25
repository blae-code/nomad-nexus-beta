# NexusOS Token Usage Guide

**Version:** 1.0  
**Last Updated:** 2026-02-25

## Table of Contents

1. [Introduction](#introduction)
2. [Token vs Lucide Decision Tree](#token-vs-lucide-decision-tree)
3. [Token Family Reference](#token-family-reference)
4. [Color Semantic Mapping](#color-semantic-mapping)
5. [Variant Usage Rules](#variant-usage-rules)
6. [Token Sizing Standards](#token-sizing-standards)
7. [Implementation Patterns](#implementation-patterns)
8. [Anti-Patterns](#anti-patterns)

---

## Introduction

NexusOS includes 200+ tactical PNG token assets designed for military-grade operational UX. These tokens provide instant visual recognition for status, priority, roles, and tactical symbols—reducing cognitive load and improving scan speed.

**When to use this guide:** When building any NexusOS UI that displays status, operations, communications, or tactical information.

---

## Token vs Lucide Decision Tree

### Use Tokens For:
✅ **Status indicators** - Online/offline, ready/busy, operational states  
✅ **Tactical symbols** - Objectives, waypoints, targets, control zones  
✅ **Operational markers** - Mission phases, priority levels, alert states  
✅ **Roster badges** - Team numbering, role indicators, unit markers  
✅ **Resource types** - Fuel, ammunition, medical, energy, supplies  
✅ **Communication nodes** - Channels, nets, voice routing, squad structure  

### Use Lucide Icons For:
✅ **UI controls** - Buttons, toggles, navigation, menus  
✅ **Actions** - Edit, delete, save, send, download  
✅ **Generic interface** - Settings, help, search, filters  
✅ **System feedback** - Loading spinners, success checks, error alerts  

### Decision Flowchart:
```
Is this a state/status indicator? → YES → Use Token
Is this a tactical/operational symbol? → YES → Use Token
Is this a UI control or action? → YES → Use Lucide
Is this a generic interface element? → YES → Use Lucide
```

---

## Token Family Reference

| Family | Use Case | Examples |
|--------|----------|----------|
| **circle** | Presence, connection, simple status | Online, TX, Muted, Ready |
| **hex** | Channels, networks, comms nodes | Command Net, Squad Channel, Voice Net |
| **target** | Primary objectives, key waypoints | Mission Objective, Primary Target |
| **target-alt** | Asset markers, fleet units, vehicles | Fleet Asset, Ship Status, Vehicle |
| **penta** | Operation status, phase indicators | Planning, Active, Debrief, Complete |
| **triangle** | Priority levels, alerts, callouts | High Priority, Warning, Attention |
| **square** | Generic units, default placeholders | Unit Marker, Default Icon, Basic |
| **number-0 to 13** | Roster numbering, sequences, counts | #1, #2, #3, Unread: 5, Objective 7 |
| **hospital** | Medical/rescue roles, medical facilities | Medic, SAR Team, Medical Bay |
| **mechanics** | Engineering/repair roles, maintenance | Engineer, Maintenance, Repair |
| **fuel** | Fuel status, refueling operations | Fuel Level, RAVEN Station |
| **energy** | Power status, shields, energy systems | Power Cell, Shield Status |
| **ammunition** | Ammo status, armory, ordnance | Ammo Count, Ordnance Depot |
| **food** | Supply status, provisioning, rations | Rations, Supply Drop, Galley |
| **shelter** | Staging areas, safe zones, bases | Forward Base, Rally Point, Bunker |
| **objective** | Mission objectives, points of interest | Primary Objective, POI, Target Site |

---

## Color Semantic Mapping

| Color | Meaning | Use Cases |
|-------|---------|-----------|
| **red** | Danger, hostile, critical, enemy | Critical alert, hostile contact, emergency, failed |
| **orange** | Active, transmitting, primary focus | TX state, active mission, engaged, primary |
| **yellow** | Warning, attention needed, pending | Warning, caution, pending approval, in-progress |
| **green** | Ready, healthy, secure, friendly-safe | Operational, ready, complete, friendly, secure |
| **blue** | Friendly, standard, information | Allied, standard ops, informational, default |
| **cyan** | Support, logistics, secondary, utility | Support roles, logistics, secondary systems |
| **grey** | Inactive, offline, neutral, disabled | Offline, disabled, archived, neutral |
| **purple** | Special states (encrypted, secured) | Secured comms, encrypted, hardened |
| **violet** | Alternative special (VIP, unique) | VIP, experimental, unique |

### Color Selection Guide:
- **State First:** Choose color based on state (danger=red, ok=green)
- **Context Second:** Adjust based on context (friendly vs hostile)
- **Consistency:** Use same color for same meaning across app

---

## Variant Usage Rules

Variants apply to **number tokens only** (number-0 through number-13):

### Variants:
- **base** - Standard operational state (default)
- **v1** (purple numbers only) - Secured/encrypted/hardened state
- **v2** (purple numbers only) - Escalated/critical/degraded state

### When to Use Variants:
```javascript
// Base variant (default)
<NexusTokenIcon family="number-1" color="blue" variant="base" />

// V1 variant (secured/encrypted)
<NexusTokenIcon family="number-1" color="purple" variant="v1" />
// Use when: Comms encrypted, secure channel, authenticated

// V2 variant (critical/escalated)
<NexusTokenIcon family="number-1" color="purple" variant="v2" />
// Use when: Critical alert, degraded state, escalated priority
```

**Note:** Only purple number tokens have v1/v2 variants. All other tokens use base only.

---

## Token Sizing Standards

| Size | Class | Pixels | Use Cases |
|------|-------|--------|-----------|
| **sm** | `w-3 h-3` | 12px | Inline badges, compact roster, tight layouts |
| **md** | `w-4 h-4` | 16px | Standard markers, list items, default size |
| **lg** | `w-5 h-5` | 20px | Prominent markers, section headers, featured |
| **xl** | `w-6 h-6` | 24px | Focus elements, map markers, hero placements |

### Size Selection Guide:
- **Roster entries:** sm (12px) - maximize density
- **List items:** md (16px) - standard readability
- **Headers:** lg (20px) - visual hierarchy
- **Map markers:** lg or xl (20-24px) - visibility and click targets

---

## Implementation Patterns

### Pattern 1: Token-Only Array (Roster Numbering)
```jsx
{participants.map((p, idx) => (
  <NexusTokenIcon
    key={p.id}
    family={`number-${idx + 1}`}
    color="blue"
    size="sm"
    tooltip={`Position ${idx + 1}`}
  />
))}
```

### Pattern 2: Token + Text Horizontal Layout
```jsx
<div className="flex items-center gap-1.5">
  <NexusTokenIcon family="circle" color="green" size="sm" />
  <span className="text-[8px] uppercase">READY</span>
</div>
```

### Pattern 3: Token + Text Vertical/Stacked Layout
```jsx
<div className="flex flex-col items-center gap-1">
  <NexusTokenIcon family="objective" color="yellow" size="lg" />
  <span className="text-[8px] uppercase">OBJ-01</span>
</div>
```

### Pattern 4: Composite Badge (Number + Callsign + Role + Status)
```jsx
<NexusRosterBadge
  number={1}
  callsign="HAWK"
  role="pilot"
  state="ready"
  layout="horizontal"
/>
// Renders: [1] HAWK [fuel-icon] [green-circle]
```

### Pattern 5: Status Token with Conditional Color
```jsx
<NexusStatusToken
  status={participant.isOnline ? 'ready' : 'offline'}
  label={participant.isOnline ? 'ONLINE' : 'OFFLINE'}
  size="sm"
  showLabel={true}
/>
```

### Pattern 6: Token State Transitions (Color Change on Update)
```jsx
const [operationStatus, setOperationStatus] = useState('planning');

<NexusTokenIcon
  family="penta"
  color={operationStatus === 'active' ? 'green' : 'blue'}
  size="md"
/>
```

---

## Anti-Patterns

### ❌ DON'T: Token Size Outside Range
```jsx
// WRONG: Too small or too large
<img src={tokenUrl} className="w-2 h-2" /> // 8px - too small
<img src={tokenUrl} className="w-8 h-8" /> // 32px - too large

// CORRECT: Use standard sizes
<NexusTokenIcon family="circle" color="green" size="sm" /> // 12px
```

### ❌ DON'T: Mix Tokens and Lucide for Same Semantic Purpose
```jsx
// WRONG: Using both for status
<Circle className="w-3 h-3 text-green-500" /> {/* Lucide */}
<NexusTokenIcon family="circle" color="green" size="sm" /> {/* Token */}

// CORRECT: Pick one consistently
<NexusTokenIcon family="circle" color="green" size="sm" />
```

### ❌ DON'T: Use Tokens Purely Decoratively
```jsx
// WRONG: Token with no semantic meaning
<NexusTokenIcon family="hex" color="orange" size="md" />
<span>Random Section</span>

// CORRECT: Token reinforces semantic meaning
<NexusTokenIcon family="hex" color="orange" size="md" />
<span>COMMAND CHANNEL</span>
```

### ❌ DON'T: Wrong Color Semantics
```jsx
// WRONG: Red for success, green for danger
<NexusTokenIcon family="circle" color="red" size="sm" />
<span>READY</span>

// CORRECT: Green for success/ready
<NexusTokenIcon family="circle" color="green" size="sm" />
<span>READY</span>
```

### ❌ DON'T: Token Without Accessible Label
```jsx
// WRONG: No aria-label or title
<img src={tokenUrl} className="w-4 h-4" />

// CORRECT: Always provide accessibility
<NexusTokenIcon
  family="circle"
  color="green"
  size="sm"
  tooltip="Online - Ready"
/>
```

### ❌ DON'T: Hardcode Token Paths
```jsx
// WRONG: Hardcoded path
<img src="/tokens/token-circle-green.png" className="w-4 h-4" />

// CORRECT: Use tokenAssetMap utilities
import { getTokenAssetUrl } from '@/components/nexus-os/ui/tokens/tokenAssetMap';
<img src={getTokenAssetUrl('circle', 'green')} className="w-4 h-4" />

// BETTER: Use primitive component
<NexusTokenIcon family="circle" color="green" size="sm" />
```

---

## Quick Reference: Common Scenarios

| Scenario | Token Family | Color | Size |
|----------|-------------|-------|------|
| User online status | `circle` | `green` | `sm` |
| User offline status | `circle` | `grey` | `sm` |
| Transmitting on voice | `circle` | `orange` | `sm` |
| High priority alert | `triangle` | `red` | `md` |
| Command channel | `hex` | `orange` | `sm` |
| Squad channel | `hex` | `cyan` | `sm` |
| Active operation | `penta` | `green` | `md` |
| Mission objective | `objective` | `yellow` | `lg` |
| Medic role | `hospital` | `green` | `sm` |
| Pilot role | `fuel` | `blue` | `sm` |
| Roster position #1 | `number-1` | `blue` | `sm` |
| Fleet asset ready | `target-alt` | `green` | `md` |
| Fleet asset degraded | `target-alt` | `red` | `md` |

---

## Usage Metrics (Target)

After full token integration, aim for:
- **70%+ of status indicators** use tokens (not text-only)
- **100% of roster entries** use number tokens
- **80%+ of tactical markers** use tokens
- **0 text-only channel types** (all have hex tokens)
- **100% of operation phases** use penta tokens

---

**Questions or new use cases?** Update this guide and share with team.