# AGENTS.md

## Setup Notes
- Scope: Tactical map UI/UX work inside current NexusOS codebase.
- Stack: Use vanilla JavaScript patterns and existing Tailwind usage only.
- Do not add new frameworks, runtime dependencies, or build tooling.
- Preserve current file structure; only split one large script into 1-2 small modules when it clearly improves readability.
- Preserve existing Element SDK config integration and behavior.

## Layout Constraints
- No scrolling anywhere by default:
  - No page scroll.
  - No internal panel/list scrollbars.
- Fit and remain usable at `1366x768`, `1440x900`, and `1920x1080` at 100% zoom.
- Use viewport-safe sizing with `dvh` and adaptive layout primitives:
  - CSS Grid/Flex.
  - `clamp()` and `minmax()`.
- Content must adapt to viewport instead of overflowing.
- Lists (roster/comms/orders) must show only latest capped items (5-7) with paging controls.
- If full detail is needed, use explicit `Expand` to modal/drawer (modal/drawer may scroll if necessary).

## Interaction Model
- Implement RTS-like flow:
  1. Select object/unit.
  2. Right-click or target click.
  3. Open radial menu.
  4. Issue order.
  5. Reflect result in overlays, roster badges, and orders feed.
- Voice features are optional and not required for completion.
- Keep interactions keyboard/mouse accessible where practical.

## Order Model
- Orders must be deterministic and visible in UI feedback surfaces:
  - Map overlays update immediately.
  - Roster badges/state update.
  - Orders feed logs newest-first within capped list + paging.
- Keep order microcopy concise and operational.
- Do not fabricate telemetry; use existing data/services/contracts.

<!-- Acceptance Criteria
- Zero page/panel scrollbars at target resolutions (1366x768, 1440x900, 1920x1080).
- Tactical flow works: select -> radial -> issue order -> overlays + roster + orders feed update.
- Roster/comms/orders lists are capped (5-7) and page with controls; no inline scrolling.
- Element SDK config integration remains functional.
- No new framework/tooling introduced.
-->

<!-- Quick QA Checklist
- [ ] Resize viewport to 1366x768, 1440x900, 1920x1080; confirm no clipping of primary controls.
- [ ] Confirm no `overflow-y: auto|scroll` behavior in page/panels during normal use.
- [ ] Validate list caps and pagination for roster/comms/orders.
- [ ] Execute at least one RTS order path and confirm all three feedback surfaces update.
- [ ] Confirm Element SDK config still reads/applies map settings.
- [ ] Run local checks (typecheck/lint/build) if code changed.
-->
