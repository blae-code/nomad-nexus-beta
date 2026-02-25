# NexusOS Token Migration Checklist

**Version:** 1.0  
**Last Updated:** 2026-02-25  
**Status:** Planning Phase

---

## Overview

This checklist tracks the systematic integration of tactical token assets throughout NexusOS. Components are prioritized by visual impact and usage frequency.

**Total Components:** 25+  
**Estimated Effort:** 40-50 hours  
**Timeline:** 3-4 weeks

---

## Priority Ranking Legend

- 🔴 **High Impact** - Critical workspace, high visibility, frequent use
- 🟡 **Medium Impact** - Secondary surfaces, moderate visibility
- 🟢 **Low Impact** - Utility views, infrequent use, enhancement-only

---

## Phase 1: High-Impact Replacements (Week 1)

### 🔴 VoiceCommsRail - Participant Roster
**File:** `components/nexus-os/ui/comms/VoiceCommsRail`  
**Current State:** Text-based callsign + role + status  
**Target State:** Number token + callsign + role token + status token  
**Estimated Effort:** 4 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Import NexusRosterBadge component
- [ ] Replace roster list rendering with token-based layout
- [ ] Map roles to token families (hospital, mechanics, fuel, etc.)
- [ ] Add status circle tokens (green/orange/red/grey)
- [ ] Verify no performance regression with 15+ participants

**Expected Impact:** 40% text reduction, instant state recognition

---

### 🔴 TacticalMapFocusApp - Map Markers
**File:** `components/nexus-os/ui/map/TacticalMapFocusApp`  
**Current State:** Generic markers, text-based resource indicators  
**Target State:** Semantic tokens (objective, target, logistics family)  
**Estimated Effort:** 5 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Replace objective markers with `objective-yellow` tokens
- [ ] Replace asset markers with `target-alt` family (color by status)
- [ ] Add logistics token overlay (fuel, ammo, medical, food, energy, shelter)
- [ ] Update marker click handlers for token images
- [ ] Add priority callouts with `triangle` tokens
- [ ] Test marker density and click targets

**Expected Impact:** Map scannability +80%, cognitive load -50%

---

## Phase 2: Medium-Impact Replacements (Week 2)

### 🟡 CommsHub - Channel List
**File:** `components/nexus-os/ui/comms/CommsHub`  
**Current State:** Text channel types, numeric badges  
**Target State:** Hex tokens + number tokens  
**Estimated Effort:** 3 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Add `hex` token prefix to channel names (color by type)
- [ ] Replace unread count badges with `number-1` through `number-9` tokens
- [ ] Add `circle-orange` token for voice-linked channels
- [ ] Add `triangle-orange` token for priority channels
- [ ] Verify channel switching not affected

**Expected Impact:** Channel list scannability +35%

---

### 🟡 OperationFocusApp - Objective Tracking
**File:** `components/nexus-os/ui/ops/OperationFocusApp`  
**Current State:** Text-based objectives and status  
**Target State:** Objective tokens + penta tokens + triangle tokens  
**Estimated Effort:** 3 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Use `objective` + `number` tokens for objective list
- [ ] Use `penta` tokens for operation status (planning, active, debrief, archived)
- [ ] Use `triangle` tokens for priority indicators
- [ ] Add role tokens for assignments (hospital, mechanics, fuel, target)
- [ ] Update objective completion toggling

**Expected Impact:** Operation clarity +40%, faster scanning

---

### 🟡 OperationFocusApp - Role Assignments
**File:** `components/nexus-os/ui/ops/OperationFocusApp`  
**Current State:** Text role labels  
**Target State:** Specialist tokens (hospital, mechanics, fuel, target, ammunition)  
**Estimated Effort:** 2 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Map roles to tokens: Medic→hospital-green, Engineer→mechanics-cyan, Pilot→fuel-blue, Marine→ammunition-red, Commander→target-orange
- [ ] Update role assignment UI
- [ ] Update roster display

**Expected Impact:** Role recognition speed +60%

---

### 🟡 SquadCard - Vehicle/Crew Status
**File:** `components/nexus-os/ui/comms/SquadCard`  
**Current State:** Text status indicators  
**Target State:** Target-alt tokens + circle tokens + resource tokens  
**Estimated Effort:** 3 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Vehicle status: `target-alt-green/yellow/cyan/red/grey` by state
- [ ] Crew readiness: `circle-green/yellow/grey` array (one per crew)
- [ ] Role tokens: hospital, mechanics, ammunition for crew roles
- [ ] Resource levels: `fuel` and `ammunition` tokens with color gradient
- [ ] Test vehicle tree expansion

**Expected Impact:** Squad card scannability +30%

---

## Phase 3: Low-Impact Enhancements (Week 3)

### 🟢 SystemAdminFocusApp - User Directory
**File:** `components/nexus-os/ui/admin/SystemAdminFocusApp`  
**Current State:** Text-only status  
**Target State:** Circle tokens before usernames  
**Estimated Effort:** 2 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Add `circle-green` for online users
- [ ] Add `circle-grey` for offline users
- [ ] Add `circle-red` for restricted users
- [ ] Verify user selection not affected

**Expected Impact:** Status recognition +25%

---

### 🟢 SystemAdminFocusApp - Access Key Registry
**File:** `components/nexus-os/ui/admin/SystemAdminFocusApp`  
**Current State:** Text status badges  
**Target State:** Square/hex tokens  
**Estimated Effort:** 1.5 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Active keys: `square-green` or `hex-green`
- [ ] Redeemed keys: `square-cyan` or `hex-cyan`
- [ ] Revoked keys: `square-red` or `hex-red`
- [ ] Expired keys: `square-yellow` or `hex-yellow`

**Expected Impact:** Key status clarity +20%

---

### 🟢 SystemAdminFocusApp - Integrity Warnings
**File:** `components/nexus-os/ui/admin/SystemAdminFocusApp`  
**Current State:** Text warnings  
**Target State:** Triangle tokens  
**Estimated Effort:** 1 hour  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] No issues: `triangle-green`
- [ ] Warnings: `triangle-yellow`
- [ ] Errors: `triangle-red`

**Expected Impact:** Alert recognition +30%

---

### 🟢 Header - Active Operation Indicator
**File:** `components/layout/Header`  
**Current State:** Orange dot + text  
**Target State:** Penta token + text  
**Estimated Effort:** 1 hour  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Replace orange dot with `penta-green` token
- [ ] Size: sm (12px)
- [ ] Keep text label

**Expected Impact:** Visual consistency +15%

---

### 🟢 Header - Voice Net Status
**File:** `components/layout/Header`  
**Current State:** Radio icon + count  
**Target State:** Circle token + count + Radio icon  
**Estimated Effort:** 1 hour  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Add `circle-green/orange/red` token based on connection state
- [ ] Layout: Token (left) + count + Radio icon (right)
- [ ] Keep existing functionality

**Expected Impact:** Status clarity +20%

---

### 🟢 TacticalSidePanel - Footer Metrics
**File:** `components/nexus-os/ui/panels/TacticalSidePanel`  
**Current State:** Text-only metrics  
**Target State:** Token + label + value  
**Estimated Effort:** 2 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Update NexusMetricCell to accept optional token prop
- [ ] Add resource tokens: fuel-orange, energy-blue, ammunition-yellow
- [ ] Apply to relevant footer metrics

**Expected Impact:** Footer scannability +20%

---

### 🟢 NexusTaskbar - App State Indicators
**File:** `components/nexus-os/ui/os/NexusTaskbar`  
**Current State:** Color-only or text  
**Target State:** Square/circle tokens for lifecycle  
**Estimated Effort:** 2 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Foreground: `square-orange`
- [ ] Background: `square-cyan`
- [ ] Suspended: `square-grey`
- [ ] Minimized: `square-yellow`
- [ ] Position: App button corner

**Expected Impact:** Lifecycle visibility +25%

---

### 🟢 NexusTaskbar - Notification Count
**File:** `components/nexus-os/ui/os/NexusTaskbar`  
**Current State:** Numeric badge (text)  
**Target State:** Number tokens 1-9  
**Estimated Effort:** 1.5 hours  
**Status:** ⏳ Not Started

**Changes Required:**
- [ ] Use `number-1` through `number-9` tokens
- [ ] Fallback to text for 10+
- [ ] Color: red for urgent, yellow for standard

**Expected Impact:** Notification visibility +20%

---

## Optional Enhancements (Future)

### Header - Online Count (Optional)
**File:** `components/layout/Header`  
**Effort:** 0.5 hours  
**Impact:** Low (nice-to-have)

- [ ] Add small `hex-cyan` token before Users icon
- [ ] Subtle reinforcement of comms theme

---

### Header - Network Health (Optional)
**File:** `components/layout/Header`  
**Effort:** 0.5 hours  
**Impact:** Low (nice-to-have)

- [ ] Replace Activity icon with `energy-green/yellow/red` token
- [ ] Latency-based color selection

---

### TacticalSidePanel - Panel Header Icon (Optional)
**File:** `components/nexus-os/ui/panels/TacticalSidePanel`  
**Effort:** 1 hour  
**Impact:** Very Low

- [ ] Add small token accent next to Lucide icon
- [ ] Example: Radio icon + `hex-orange` token

---

## Dependencies & Order

**Must Complete First:**
1. Phase 2.4 - Create token primitive components (NexusTokenIcon, NexusStatusToken, NexusRosterBadge)
2. Phase 1.4.3 - Extend design tokens file with semantic helpers

**Sequential Dependencies:**
- VoiceCommsRail depends on NexusRosterBadge
- All token integrations depend on NexusTokenIcon
- SquadCard depends on NexusStatusToken

**No Dependencies (Can Parallelize):**
- Map markers
- CommsHub channels
- Operation objectives
- Admin directory (all independent)

---

## Testing Requirements

### Per Component:
- [ ] Visual regression: Before/after screenshots
- [ ] Performance: No render time increase >5%
- [ ] Accessibility: All tokens have aria-labels
- [ ] Click targets: Token images don't block clicks
- [ ] Responsive: Tokens scale appropriately on mobile
- [ ] State changes: Token colors update correctly

### Integration Tests:
- [ ] Voice roster with 15+ participants (no scroll)
- [ ] Map with 30+ markers (no performance issues)
- [ ] Channel list with 10+ channels (tokens align)
- [ ] Operation with 8+ objectives (token layout stable)

---

## Rollback Strategy

If issues arise:
1. Token rendering breaks layout → Revert to text, investigate sizing
2. Click targets broken → Add pointer-events-none to tokens, handle clicks on parent
3. Performance regression → Implement lazy loading, reduce token count
4. Accessibility complaints → Audit aria-labels, add tooltips

---

## Success Metrics

**Target After Full Migration:**
- ✅ 70%+ of status indicators use tokens (not text-only)
- ✅ 100% of roster entries use number tokens
- ✅ 80%+ of tactical markers use tokens
- ✅ 0 text-only channel types (all have hex tokens)
- ✅ 100% of operation phases use penta tokens
- ✅ No performance regression >5%
- ✅ No accessibility violations introduced

---

## Progress Summary

**Completed:** 0 / 25 components (0%)  
**In Progress:** 0 / 25 components (0%)  
**Not Started:** 25 / 25 components (100%)

**Total Estimated Effort:** 40-50 hours  
**Effort Remaining:** 40-50 hours

---

**Next Steps:**
1. Complete Phase 1 (Design System Foundation)
2. Complete Phase 2.4 (Token Primitive Components)
3. Begin Phase 9.1 (High-Impact Replacements)

**Last Updated:** 2026-02-25