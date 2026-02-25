# NexusOS Token Usage Audit

**Audit Date:** 2026-02-25  
**Auditor:** Design System Team  
**Status:** Complete

---

## Executive Summary

**Current State:** Token infrastructure established, partial usage in Header/TacticalSidePanel  
**Opportunity:** 70%+ of status indicators can be enhanced with tokens  
**Priority:** High-impact components (rosters, maps, operations) first

---

## Current Token Usage (Baseline)

### ✅ Already Using Tokens

#### Header (components/layout/Header)
- **Voice net status:** `circle` token (green/orange/red) - Lines 136-150
- **Online count:** `hex-cyan` token - Line 157
- **Network health:** `energy` token (green/red) - Line 166

#### TacticalSidePanel (components/nexus-os/ui/panels/TacticalSidePanel)
- **Uses:** NexusStatusPill, NexusSignalPill, NexusMetricCell primitives
- **Token-ready:** Footer metrics can accept token prop

#### tokenAssetMap (components/nexus-os/ui/tokens/tokenAssetMap)
- **Exports:** Comprehensive token catalog with semantic mappings
- **Coverage:** comms, map, ops asset definitions

---

## Icon-to-Text Ratio Analysis

### Current Ratios (Estimated)

| Component | Text-Only Status | Icon Status | Token Status | Ratio |
|-----------|------------------|-------------|--------------|-------|
| VoiceCommsRail | 80% | 10% | 10% | 🔴 High text density |
| SquadCard | 70% | 20% | 10% | 🔴 High text density |
| CommsHub | 85% | 10% | 5% | 🔴 High text density |
| TacticalMapFocusApp | 60% | 30% | 10% | 🟡 Moderate |
| OperationFocusApp | 75% | 15% | 10% | 🔴 High text density |
| SystemAdminFocusApp | 90% | 10% | 0% | 🔴 Very high text density |
| Header | 20% | 40% | 40% | 🟢 Good balance |
| TacticalSidePanel | 30% | 30% | 40% | 🟢 Good balance |

---

## Identified Opportunities (Prioritized)

### 🔴 High Impact - High Visibility

#### 1. VoiceCommsRail - Participant Roster
**File:** `components/nexus-os/ui/comms/VoiceCommsRail`  
**Current:** Text callsign + text role + text status  
**Opportunity:** Number tokens (1-13) + role tokens (hospital, mechanics, fuel) + status tokens (circle)  
**Expected Impact:** 40% text reduction, instant role recognition  
**Lines:** ~500-650 (roster rendering section)

#### 2. TacticalMapFocusApp - Map Markers
**File:** `components/nexus-os/ui/map/TacticalMapFocusApp`  
**Current:** Generic markers, likely Lucide icons or text  
**Opportunity:** 
- Objectives: `objective-yellow` tokens
- Assets: `target-alt` family (color by status)
- Resources: `fuel`, `ammunition`, `hospital`, `mechanics`, `food`, `energy`, `shelter` tokens
- Priority: `triangle` tokens (red/orange/blue)
**Expected Impact:** Map scannability +80%, cognitive load -50%  
**Lines:** Marker rendering logic throughout

#### 3. CommsHub - Channel List
**File:** `components/nexus-os/ui/comms/CommsHub`  
**Current:** Text channel types, numeric unread badges  
**Opportunity:**
- Channel type: `hex` tokens (orange/cyan/yellow/grey by type)
- Unread counts: `number-1` through `number-9` tokens
- Voice-linked: `circle-orange` token indicator
- Priority channels: `triangle-orange` token accent
**Expected Impact:** Channel scannability +35%  
**Lines:** Channel list rendering

---

### 🟡 Medium Impact - Frequent Use

#### 4. OperationFocusApp - Status & Objectives
**File:** `components/nexus-os/ui/ops/OperationFocusApp`  
**Current:** Text-based status, objectives, priorities  
**Opportunity:**
- Operation status: `penta` tokens (blue/cyan/green/yellow/grey by phase)
- Priority: `triangle` tokens (red/orange/blue by level)
- Objectives: `objective` + `number` token combinations
- Roles: Specialist tokens (hospital, mechanics, fuel, target, ammunition)
**Expected Impact:** Operation clarity +40%

#### 5. SquadCard - Vehicle/Crew Status
**File:** `components/nexus-os/ui/comms/SquadCard`  
**Current:** Text status, text roles  
**Opportunity:**
- Vehicle status: `target-alt` family (green/yellow/cyan/red/grey)
- Crew readiness: `circle` token arrays (green/yellow/grey per crew)
- Crew roles: Specialist tokens
- Resources: `fuel` and `ammunition` tokens with color gradients
**Expected Impact:** Squad card scannability +30%

---

### 🟢 Low Impact - Enhancement Only

#### 6. SystemAdminFocusApp - User Directory
**File:** `components/nexus-os/ui/admin/SystemAdminFocusApp`  
**Current:** Text-only user status  
**Opportunity:** `circle` tokens (green/grey/red for online/offline/restricted)  
**Expected Impact:** Admin UX clarity +25%

#### 7. SystemAdminFocusApp - Access Key Registry
**Current:** Text status badges  
**Opportunity:** `square` or `hex` tokens (green/cyan/red/yellow for active/redeemed/revoked/expired)  
**Expected Impact:** Key status clarity +20%

#### 8. NexusTaskbar - App State & Notifications
**File:** `components/nexus-os/ui/os/NexusTaskbar`  
**Current:** Color dots for app state, text badges for notifications  
**Opportunity:**
- App lifecycle: `square` tokens (orange/cyan/grey/yellow)
- Notification counts: `number` tokens (1-9)
**Expected Impact:** Taskbar clarity +20%

---

## Token Family Usage Recommendations

### By Component Type

**Rosters (VoiceCommsRail, SquadCard):**
- Primary: `number` tokens (position numbering)
- Secondary: `circle` tokens (status)
- Tertiary: Specialist tokens (hospital, mechanics, fuel, ammunition)

**Maps (TacticalMapFocusApp):**
- Primary: `target`, `target-alt`, `objective` tokens
- Secondary: Logistics family (fuel, ammunition, medical, etc.)
- Tertiary: `triangle` tokens (priority callouts)

**Operations (OperationFocusApp):**
- Primary: `penta` tokens (operation phase)
- Secondary: `objective` + `number` combinations
- Tertiary: `triangle` tokens (priority)

**Channels (CommsHub, TextCommsDock):**
- Primary: `hex` tokens (channel type)
- Secondary: `number` tokens (unread counts)
- Tertiary: `circle` tokens (voice routing)

**Admin (SystemAdminFocusApp):**
- Primary: `circle` tokens (user status)
- Secondary: `square` or `hex` tokens (key status)
- Tertiary: `triangle` tokens (integrity warnings)

---

## Implementation Sequence

### Phase 1: High-Impact (Week 1)
1. ✅ Create token primitive components
2. ⏳ VoiceCommsRail roster redesign
3. ⏳ TacticalMapFocusApp marker replacement

### Phase 2: Medium-Impact (Week 2)
4. ⏳ CommsHub channel list enhancement
5. ⏳ OperationFocusApp status/objective tokens
6. ⏳ SquadCard vehicle/crew tokens

### Phase 3: Low-Impact (Week 3)
7. ⏳ SystemAdminFocusApp user directory
8. ⏳ SystemAdminFocusApp access key registry
9. ⏳ NexusTaskbar app state tokens

---

## Success Metrics (Targets)

**Post-Migration Goals:**
- 70%+ of status indicators use tokens (currently ~15%)
- 100% of roster entries use number tokens (currently 0%)
- 80%+ of tactical markers use tokens (currently ~10%)
- 0 text-only channel types (currently 100% text)
- 100% of operation phases use penta tokens (currently 0%)

**Current Overall Token Coverage:** ~15%  
**Target Overall Token Coverage:** 70%+

---

## Risk Assessment

**Low Risk:**
- Header enhancements (already using tokens, just expanding)
- Admin directory (isolated, low traffic)

**Medium Risk:**
- Channel list (moderate complexity, high visibility)
- Squad cards (nested structure, need careful layout)

**High Risk:**
- Map markers (click targets, performance with many tokens)
- Voice roster (critical workflow, can't break voice functionality)

**Mitigation:**
- Test extensively before deployment
- Implement in isolated branches
- Keep rollback diffs minimal
- Performance test with 30+ tokens visible

---

## Next Actions

1. ✅ Complete token primitive creation (DONE)
2. ⏳ Begin VoiceCommsRail roster refactor (HIGH PRIORITY)
3. ⏳ Begin TacticalMapFocusApp marker replacement (HIGH PRIORITY)
4. Document findings from first two implementations
5. Adjust strategy based on lessons learned

---

**Audit Complete.** Ready for execution phase.