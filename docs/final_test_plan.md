# Nomad Nexus v1.0 Test Plan

## Scope & Goals
This plan validates Nomad Nexus v1.0 across core user flows, comms features, UX consistency, error handling, and security/privacy. Each test area includes objectives, steps, expected outcomes, and special setup requirements.

## Assumptions & Dependencies
- A staging environment is available with the same configuration as production.
- Feature flags (if any) are documented and enabled for v1.0.
- Test accounts with known roles/permissions are available.
- If LiveKit or real-time comms are used, a mock or staging LiveKit server is available for deterministic testing.

## Test Data & Accounts
- **Test users**
  - Guest user (no account)
  - Standard user (rank: Member)
  - Elevated user (rank: Officer)
  - Admin user (rank: Admin)
- **Sample events**
  - “Ops Briefing” (public)
  - “Squad Training” (private)
- **Tokens**
  - Valid comms token (Member)
  - Expired comms token
  - Invalid/malformed token

---

# 1) Core User Flows

## 1.1 Onboarding (Access Gate)
**Objectives**
- Ensure Access Gate validates eligibility before granting access.
- Confirm the onboarding flow is clear, consistent, and blocks unauthorized access.

**Steps**
1. Visit the app root as a new/unauthenticated user.
2. Attempt to proceed without required access token/credentials.
3. Provide a valid access token/credential and proceed.
4. Attempt to use an expired or malformed access credential.

**Expected Outcomes**
- Unauthorized access is blocked with a clear, actionable message.
- Valid access credentials pass and route to login or dashboard.
- Expired/malformed credentials are rejected with error feedback.

**Special Setup**
- Generate valid/expired onboarding tokens.
- Ensure Access Gate service is configured for test environment.

---

## 1.2 Login
**Objectives**
- Validate authentication with valid credentials.
- Confirm error states for invalid credentials and locked accounts.

**Steps**
1. Log in with valid credentials for Member, Officer, and Admin.
2. Log in with invalid credentials.
3. Attempt login with a locked/disabled account (if supported).
4. Use password reset (if available).

**Expected Outcomes**
- Valid users reach the correct landing page (dashboard).
- Invalid credentials prompt a non-revealing error (no account enumeration).
- Locked accounts are blocked with a support-oriented message.
- Password reset flow works end-to-end.

**Special Setup**
- Test accounts with known passwords.
- Optional: locked/disabled account fixture.

---

## 1.3 Dashboard Navigation
**Objectives**
- Ensure nav elements route correctly.
- Validate that role-based navigation items appear/are hidden properly.

**Steps**
1. Log in as Member and navigate through primary nav items.
2. Log in as Officer and verify additional/role-specific nav items.
3. Log in as Admin and verify admin nav items.
4. Use back/forward browser controls during navigation.

**Expected Outcomes**
- All navigation routes load successfully with correct page content.
- Role-specific nav items are shown/hidden appropriately.
- Browser navigation does not break app state.

**Special Setup**
- Role-based test users.

---

## 1.4 Event Creation & Viewing
**Objectives**
- Validate creation, listing, and details views of events.
- Enforce permissions for event creation/editing.

**Steps**
1. Log in as Member and create a public event.
2. Create a private event and verify access control.
3. Edit and delete an existing event (if permissions allow).
4. View event details from the list.

**Expected Outcomes**
- Events are created and visible in the list.
- Private events are visible only to permitted users.
- Unauthorized edits/deletions are blocked.
- Event details page shows accurate information.

**Special Setup**
- Sample event data and permissions matrix.

---

## 1.5 Comms Console Usage (Entry Points)
**Objectives**
- Confirm users can access comms console from dashboard or event views.
- Validate access gating by token and role.

**Steps**
1. From dashboard, open comms console.
2. From an event detail page, open comms console.
3. Attempt access with invalid/expired comms token.

**Expected Outcomes**
- Console opens with correct context (room/channel).
- Invalid/expired tokens deny access with clear messaging.

**Special Setup**
- LiveKit or mock real-time server.
- Valid/invalid comms tokens for each role.

---

## 1.6 Admin Tools
**Objectives**
- Validate admin-only pages and actions.
- Confirm audit/logging features (if present).

**Steps**
1. Log in as Admin and access admin tools.
2. Attempt admin pages as Member/Officer.
3. Perform admin actions (user management, event moderation, config changes).

**Expected Outcomes**
- Admin pages are accessible only to admin users.
- Unauthorized access returns a 403/blocked state.
- Admin actions succeed and are logged (if applicable).

**Special Setup**
- Admin account with required privileges.
- Test data to manage/moderate.

---

# 2) Comms Features

## 2.1 Token Generation
**Objectives**
- Ensure tokens are generated with correct scopes and expiry.
- Verify role-based token permissions.

**Steps**
1. Generate a token for Member, Officer, and Admin.
2. Inspect token claims (role, expiry, room permissions).
3. Attempt to use a token past expiry.

**Expected Outcomes**
- Tokens contain correct scopes/claims per role.
- Expired tokens are rejected.

**Special Setup**
- Access to token generation endpoint/service.
- Ability to decode token claims.

---

## 2.2 Room Joining
**Objectives**
- Validate users can join permitted rooms.
- Confirm blocked access to unauthorized rooms.

**Steps**
1. Join a public room with a valid token.
2. Attempt to join a restricted room without permission.
3. Join a private room as a permitted user.

**Expected Outcomes**
- Allowed rooms connect successfully.
- Unauthorized rooms are blocked with error feedback.

**Special Setup**
- Mock or staging LiveKit with defined rooms.

---

## 2.3 PTT (Push-to-Talk) Toggle
**Objectives**
- Ensure PTT toggling works across supported devices.
- Validate UI indicators and audio state changes.

**Steps**
1. Toggle PTT on/off while connected to a room.
2. Verify audio/mic indicators update in real time.
3. Test keyboard shortcut or UI control (if applicable).

**Expected Outcomes**
- PTT toggles correctly and audio state reflects UI.
- Latency is within acceptable limits.

**Special Setup**
- Device with microphone access.
- LiveKit or mock audio pipeline.

---

## 2.4 DM Messaging
**Objectives**
- Verify direct messaging between users.
- Validate message delivery, ordering, and notifications.

**Steps**
1. Send a DM from Member to Officer.
2. Verify recipient receives message and notification.
3. Test offline user receiving queued messages (if supported).

**Expected Outcomes**
- Messages deliver in order with correct timestamps.
- Notification appears as expected.
- Offline behavior matches spec.

**Special Setup**
- Two active sessions with different users.

---

## 2.5 AI Summarization
**Objectives**
- Confirm AI summaries are generated from comms transcripts.
- Validate error handling when AI service is unavailable.

**Steps**
1. Generate a summary after a comms session.
2. Validate summary content relevance and formatting.
3. Disable AI service and attempt summarization.

**Expected Outcomes**
- Summaries are generated and stored as expected.
- Service outage yields a graceful, user-friendly error.

**Special Setup**
- AI summarization service or mock endpoint.
- Sample transcript data.

---

# 3) Visual & UX Consistency

## 3.1 Responsive Layouts
**Objectives**
- Validate layout across common breakpoints (mobile/tablet/desktop).

**Steps**
1. Test key pages (onboarding, dashboard, events, comms console) at 360px, 768px, 1024px, 1440px widths.
2. Verify navigation and primary CTAs remain accessible.

**Expected Outcomes**
- No horizontal scrolling or clipped content.
- Key controls remain visible and usable.

**Special Setup**
- Browser dev tools for responsive viewports.

---

## 3.2 Theme Adherence (Dark Sci‑Fi Aesthetic w/ Neon Accents)
**Objectives**
- Ensure the theme is applied consistently across all pages.

**Steps**
1. Review all main pages for consistent dark theme and accent colors.
2. Validate typography, button styles, and hover states.

**Expected Outcomes**
- No theme regressions or mismatched styles.
- Accent colors and glow effects match design spec.

**Special Setup**
- Design reference or style guide.

---

## 3.3 Header & Navigation Consistency
**Objectives**
- Ensure header and nav remain consistent across pages and user roles.

**Steps**
1. Navigate through all main sections and compare header/nav placement, styling, and links.
2. Verify role-based links appear in expected positions without layout shifts.

**Expected Outcomes**
- Header/nav are consistent in layout and behavior.
- Role-based items are correctly placed and do not break layout.

**Special Setup**
- Role-based test users.

---

# 4) Error Handling

## 4.1 Missing Routes (404)
**Objectives**
- Confirm missing routes render a friendly error page.

**Steps**
1. Navigate directly to a non-existent URL.

**Expected Outcomes**
- A 404 page renders with navigation back to safe routes.

**Special Setup**
- None.

---

## 4.2 Invalid Tokens
**Objectives**
- Validate consistent handling for invalid or expired tokens.

**Steps**
1. Use malformed/expired tokens for onboarding, comms, and API calls.

**Expected Outcomes**
- Clear error messages without exposing internal details.

**Special Setup**
- Invalid/expired tokens.

---

## 4.3 Network Outages
**Objectives**
- Confirm graceful handling of offline or degraded connectivity.

**Steps**
1. Simulate offline mode while loading dashboard and comms.
2. Restore network and confirm recovery.

**Expected Outcomes**
- UI indicates offline state and retries appropriately.
- App recovers without requiring full reload (if supported).

**Special Setup**
- Browser network throttling or offline simulation.

---

## 4.4 Missing Environment Variables
**Objectives**
- Ensure app fails safely and logs meaningful errors when critical env vars are missing.

**Steps**
1. Remove/override required environment variables in staging.
2. Start the app and observe logs and UI error messaging.

**Expected Outcomes**
- App fails with explicit error logs (no silent failures).
- UI displays a safe, user-friendly error (if applicable).

**Special Setup**
- Ability to modify runtime environment variables.

---

# 5) Security & Privacy

## 5.1 Input Sanitization
**Objectives**
- Ensure user inputs are sanitized to prevent XSS/HTML injection.

**Steps**
1. Enter HTML/JS payloads into event titles, DM messages, and profile fields.
2. View rendered content in lists and detail views.

**Expected Outcomes**
- Scripts are not executed; content is sanitized or escaped.

**Special Setup**
- Known XSS test strings.

---

## 5.2 Token/Secret Leak Prevention
**Objectives**
- Ensure tokens or secrets are never exposed in client logs, URLs, or UI.

**Steps**
1. Inspect network traffic for tokens in query strings or logs.
2. Check console logs for accidental token dumps.

**Expected Outcomes**
- Tokens are transmitted securely (e.g., headers) and never logged.

**Special Setup**
- Browser dev tools and log access.

---

## 5.3 Permission Checks (Rank-Based Access)
**Objectives**
- Validate RBAC enforcement across routes and APIs.

**Steps**
1. Attempt to access officer/admin routes as Member.
2. Attempt to perform admin actions as Officer.
3. Validate API responses for unauthorized actions.

**Expected Outcomes**
- Unauthorized access is denied with 403/blocked state.
- No UI access to restricted actions.

**Special Setup**
- Role-based test users.

---

## 5.4 Privacy & Data Isolation
**Objectives**
- Ensure private event and DM data is visible only to intended users.

**Steps**
1. Create a private event and attempt access as an unauthorized user.
2. Send DMs and verify only sender/recipient can view message threads.

**Expected Outcomes**
- Private data is isolated and inaccessible to unauthorized users.

**Special Setup**
- Multiple user sessions with different roles.

---

# Exit Criteria
- All critical and high-priority tests pass.
- Known defects are documented with severity and workaround.
- Security and privacy checks show no leakage of tokens or private data.

# Reporting
- Capture defects with steps to reproduce, expected vs. actual results, and environment details.
- Provide a summary of pass/fail counts by test area.
