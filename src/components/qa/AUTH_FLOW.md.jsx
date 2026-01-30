# Authentication Flow Contract

## Overview
This document defines the expected authentication and onboarding flow for Nomad Nexus. The flow ensures users are properly authenticated, accept terms, and complete onboarding before accessing the platform.

---

## Authentication States

### State A: Unauthenticated
**Condition:** User has no valid session / `base44.auth.isAuthenticated()` returns `false`
- **Redirect:** → `AccessGate`
- **UI:** Access code + callsign entry form
- **Backend:** `redeemAccessKey` function validates credentials

### State B: Authenticated + Disclaimers Not Accepted
**Condition:** User is authenticated BUT `disclaimersCompleted === false`
- **Redirect:** → `Disclaimers`
- **UI:** Multi-step disclaimer flow (PWA, Data & Privacy, AI Features)
- **Backend:** Saves `accepted_pwa_disclaimer_at` to `MemberProfile`

### State C: Authenticated + Disclaimers Accepted + Onboarding Incomplete
**Condition:** User is authenticated AND `disclaimersCompleted === true` AND `onboardingCompleted === false`
- **Redirect:** → `Onboarding`
- **UI:** Multi-step onboarding (Callsign, Bio, Code Acceptance, AI Consent, Confirmation)
- **Backend:** Saves `onboarding_completed` flag to `MemberProfile`

### State D: Fully Onboarded
**Condition:** User is authenticated AND `disclaimersCompleted === true` AND `onboardingCompleted === true`
- **Redirect:** → `Hub` (or main shell with full platform access)
- **UI:** Full navigation + command palette enabled
- **Note:** Admins skip States B & C

---

## Flow Diagram

```
┌─────────────────────────────────┐
│    Fresh Session / No Auth      │
│   (base44.auth.isAuthenticated  │
│      returns false)             │
└──────────────┬──────────────────┘
               │
               ▼
        ┌──────────────┐
        │ AccessGate   │ ← Redeem access key + callsign
        │ (State A)    │
        └──────┬───────┘
               │ ✅ Credentials valid
               │ 🔄 Auth token established
               ▼
        ┌──────────────────┐
        │ Check Auth State │
        └────────┬─────────┘
                 │
        ┌────────┴──────────┐
        │                   │
   Is Admin?            Regular User?
   (skip B,C)               │
        │                   ▼
        │            ┌──────────────────┐
        │            │ Disclaimers      │ ← Accept PWA, Data/Privacy, AI
        │            │ (State B)        │
        │            └────────┬─────────┘
        │                     │ ✅ Accepted
        │                     ▼
        │            ┌──────────────────┐
        │            │ Onboarding       │ ← Set callsign, bio, consent
        │            │ (State C)        │
        │            └────────┬─────────┘
        │                     │ ✅ Completed
        │                     ▼
        └────────────►┌──────────────────┐
                      │ Hub / Main Shell │ ← Full platform access
                      │ (State D)        │
                      └──────────────────┘
```

---

## RouteGuard Behavior

The `RouteGuard` component enforces this flow:

- **`requiredAuth="none"`** → Allows unauthenticated access (AccessGate, Disclaimers, Onboarding)
- **`requiredAuth="authenticated"`** → Requires valid auth token (redirects to AccessGate if missing)
- **`requiredAuth="onboarded"`** → Requires full onboarding (redirects to appropriate intermediate page)

---

## Key Implementation Details

### AuthProvider
- Initializes auth state with 10-second timeout
- Fetches user + MemberProfile data on mount
- Sets `error` if auth fails or times out → displays `FatalAuthError` screen
- Skips disclaimers/onboarding checks for admins

### FatalAuthError Screen
- Displays when `AuthProvider` initialization fails or times out
- Provides "Copy Diagnostics", "Retry", and "Clear Session" buttons
- Helps QA diagnose auth setup issues

### AuthDebugOverlay
- **Activation:** `?debug_auth=true` query parameter
- **Display:** Small top-left overlay showing:
  - `initialized`, `loading` flags
  - `user.id`, `user.role`, `user.email`
  - `disclaimersCompleted`, `onboardingCompleted`
  - Current page/route
- **Use:** QA can screenshot to verify auth state

---

## Session Persistence

- **Access tokens:** Managed by Base44 SDK (auto-refreshed)
- **MemberProfile:** Persists disclaimers/onboarding flags in database
- **Local storage:** Tracks UI preferences (panel state, dock state, etc.)

---

## Error Scenarios

### Redeem Access Key Fails
- Invalid code → Error message displayed
- Revoked code → Special "Authorization Revoked" message
- Backend error → Generic error message

### Auth Token Lost
- If `AccessGate` successfully redeems key but token is not established:
  - `confirmAuthEstablished()` times out after 10 seconds
  - User sees error: "Authentication setup failed"
  - Can retry or contact administrator

### Disclaimers/Onboarding Submit Fails
- Network error → Error toast with retry option
- Validation error → Form remains with error highlight
- Successful submission → Redirect to next page

---

# Manual QA Checklist

## 10-Step Authentication Flow Test Suite

Use `?debug_auth=true` to enable the AuthDebugOverlay for all tests.

---

### Test 1: Fresh Session (New Browser)

**Objective:** Verify new user hits AccessGate and flows through complete onboarding.

**Steps:**
1. Open app in **incognito/private window** → Should redirect to `AccessGate`
2. Verify overlay shows: `initialized=true, loading=false, user=null`
3. Enter valid access code + callsign → Submit
4. Confirm page redirects to `Disclaimers` (not Hub)
5. Accept PWA, Data & Privacy, AI disclaimers in sequence
6. Confirm page redirects to `Onboarding`
7. Complete onboarding form (callsign, bio, agreements, confirmation)
8. Confirm page redirects to `Hub`
9. Verify overlay shows: `initialized=true, disclaimersCompleted=true, onboardingCompleted=true`
10. ✅ **Pass if:** Fresh user reaches Hub with all flags set correctly

---

### Test 2: Returning Session (Cached/Stored)

**Objective:** Verify returning user with completed profile goes straight to Hub.

**Steps:**
1. After completing Test 1, **close browser tab completely**
2. Reopen the same app URL
3. Page should load Hub **directly** (may show brief loading)
4. Verify overlay shows: `initialized=true, loading=false, user={id,role,email}, disclaimersCompleted=true, onboardingCompleted=true`
5. Verify header + comms dock are visible
6. ✅ **Pass if:** No disclaimer/onboarding screens shown, Hub loads immediately

---

### Test 3: Redeem Success (Valid Access Key)

**Objective:** Verify valid access key + callsign grants auth and redirects correctly.

**Steps:**
1. Start fresh session (incognito)
2. Enter **valid access code** (from admin-created keys) + any callsign
3. Click "VERIFY ACCESS" → Loading spinner appears
4. Observe status message: "Access granted! Confirming authentication..."
5. Wait 1-2 seconds → Redirected to Disclaimers
6. Verify overlay shows: `initialized=true, user={id,role}` (not null)
7. ✅ **Pass if:** Auth token established and Disclaimers shown

---

### Test 4: Redeem Revoked (Access Key Revoked)

**Objective:** Verify revoked access key shows special error message.

**Steps:**
1. Start fresh session (incognito)
2. Use admin console to **revoke an access key**
3. Enter revoked access code + callsign → Submit
4. Observe error message: **"⸻ Authorization Revoked ⸻"** with contact instructions
5. Overlay still shows: `initialized=true, user=null, loading=false`
6. Can retry with new code
7. ✅ **Pass if:** Revoked message displays, user not authenticated

---

### Test 5: Redeem Success But Token Missing (Edge Case)

**Objective:** Verify timeout if auth token not established after successful redemption.

**Steps:**
1. Start fresh session
2. Enter valid access code + callsign
3. *Simulate* network latency: Open DevTools → Network tab → Set throttling to "Slow 3G"
4. Submit → Status changes to "CONFIRMING AUTH..."
5. Wait 11+ seconds (past 10-second timeout)
6. Observe error: "Authentication setup failed: Auth confirmation timeout..."
7. Click "Try Again" button
8. ✅ **Pass if:** Timeout error shown with retry option; user not sent to Disclaimers

---

### Test 6: Disclaimers Submit Success

**Objective:** Verify accepting all disclaimers saves state and redirects.

**Steps:**
1. Login and reach Disclaimers page
2. Step 1: Check PWA disclaimer checkbox → Click "Next"
3. Step 2: Check Data & Privacy checkbox → Click "Next"
4. Step 3: Check AI Features checkbox → Click "Accept & Continue"
5. Wait for save (brief loading) → Redirected to Onboarding
6. Go back by editing URL (use debug): Check overlay shows `disclaimersCompleted=true`
7. ✅ **Pass if:** All checkboxes required, save succeeds, Onboarding shown

---

### Test 7: Disclaimers/Onboarding Submit Failure

**Objective:** Verify errors are shown if network fails during save.

**Steps:**
1. Reach Disclaimers or Onboarding page
2. Open DevTools → Network tab → Right-click → "Offline"
3. Try to submit form → Should see error toast/message
4. Turn network back on
5. Retry submit → Should succeed
6. ✅ **Pass if:** Error shown on offline, success after reconnect

---

### Test 8: Network Latency Simulation

**Objective:** Verify UI handles slow network gracefully.

**Steps:**
1. Open DevTools → Network tab → Set throttling to "Slow 3G"
2. Refresh page → Loading spinner visible for extended time
3. Verify overlay shows `loading=true` while waiting
4. Wait for page to load (may take 5-10 seconds)
5. Overlay eventually shows `loading=false`
6. ✅ **Pass if:** No blank screens, loading state visible, page eventually renders

---

### Test 9: Mobile Viewport Smoke Test

**Objective:** Verify basic layout integrity on mobile (no layout perfection required).

**Steps:**
1. Open DevTools → Toggle device toolbar (iPhone 12, ~390px width)
2. Start fresh session → AccessGate should be readable
3. Fill form + submit → Disclaimers should be scrollable (no cut-off content)
4. Accept disclaimers → Onboarding should be scrollable
5. Complete onboarding → Hub should show (header + main content visible)
6. Verify no horizontal scrollbars
7. ✅ **Pass if:** No major layout breaks, content readable on mobile

---

### Test 10: Debug Overlay Verification

**Objective:** Verify debug overlay shows correct state at each step.

**Steps:**
1. Add `?debug_auth=true` to any app URL
2. Verify overlay appears in **top-left corner** (not blocking critical UI)
3. Refresh page → Overlay persists
4. Check values match expected state:
   - **AccessGate:** `initialized=true, user=null, loading=false`
   - **Disclaimers:** `initialized=true, user={id,role}, disclaimersCompleted=false`
   - **Onboarding:** `initialized=true, disclaimersCompleted=true, onboardingCompleted=false`
   - **Hub:** `initialized=true, disclaimersCompleted=true, onboardingCompleted=true`
5. Remove `?debug_auth=true` → Overlay disappears
6. ✅ **Pass if:** Overlay shows correct state at each step, toggles with query param

---

## Acceptance Criteria

- [ ] All 10 tests pass without failures
- [ ] Auth flow matches state diagram
- [ ] Debug overlay accurately reflects auth state
- [ ] No blank/partial renders on edge cases
- [ ] Mobile layout is usable (not perfect, but readable)
- [ ] Error messages are clear and actionable
- [ ] Timeouts are respected (10 seconds for auth, form validation times out if needed)
- [ ] RouteGuard correctly enforces access control at each page

---

## Quick Reference: Debug Overlay Query Param

```
http://localhost:5173/?debug_auth=true
```

Append to **any** URL to enable overlay. Useful for:
- Reproducing user issues
- Verifying auth state transitions
- Screenshotting state for bug reports
- Testing on AccessGate, Disclaimers, Onboarding, Hub, etc.

---