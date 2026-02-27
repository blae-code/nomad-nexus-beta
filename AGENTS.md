# AGENTS.md — Nomad Nexus Engineering Protocol

This file defines **non-negotiable constraints**, **safe workflows**, and **output contracts** for any AI agent (Continue, LM Studio chat, scripts) and for humans operating in the repo.

Nomad Nexus is a **React + Vite** web app with **Base44** as the backend/data platform and a set of **serverless functions** under `functions/`. The project prioritizes **determinism, reliability, minimal diffs, and Base44 compatibility**.

---

## 0) Prime Directive

**Ship small, correct, reversible changes.**  
Prefer deterministic behavior and minimal diff surface area. Avoid “rewrite” or “refactor for cleanliness” unless explicitly requested.

---

## 1) Architecture Snapshot

### Stack
- **Frontend:** React + Vite, React Router
- **Styling:** Tailwind CSS + Radix UI
- **State:** TanStack React Query
- **Testing:** Vitest
- **Backend:** Base44 + `functions/` (serverless functions deployed on Base44)

### Repo map (high signal)
- `src/` — app source
  - `src/components/nexus-os/` — NexusOS shell, services, schemas, validators, preview workbench
  - `src/components/nexus-os/ui/theme/` — shared design foundations (global “Redscar” shell styling)
  - `src/pages/` — route-level modules (incl. NexusOS routes, onboarding/access gating)
  - `src/api/` — Base44 integration and member-function invocation helpers
  - `src/lib/` — core utilities/contexts/helpers
- `functions/` — Base44-deployed serverless functions (privileged operations)
- `tests/` — unit and backend-focused test suites
- `docs/` — operational docs + runbooks + refinement maps

---

## 2) Non-Negotiable Guardrails

### Base44 Compatibility
- Do **not** introduce assumptions that break Base44 deployment/runtime.
- Keep privileged logic inside `functions/`. Client must call backend via established Base44 invocation surfaces.

### Security
- **Never** store secrets (tokens, service role keys, API secrets) in:
  - source control
  - localStorage
  - client-accessible configs
- Do not log secrets.
- Ensure `.env*` stays out of git.

### Determinism First
- Prefer deterministic logic for readiness, validation, and critical paths.
- Avoid adding new LLM calls or stochastic logic unless explicitly required by scope.

### Minimal Diffs
- Avoid broad refactors, reformat sweeps, renaming cascades, or framework swaps.
- Touch the smallest number of files needed.

### Language/Tool Discipline
- Default output/code language is **TypeScript/TSX/JSX**.
- Do **not** introduce other languages (Go, Python, etc.) unless a target file extension requires it.

### UX Constraint (NexusOS)
- Favor **fit-to-viewport** and responsive layouts; avoid scroll-heavy UI in core operational views unless required.

---

## 3) Canonical Project Documents (read before major changes)

Use these as “source of truth” for operations and constraints:
- `docs/BASE44_STABILITY_RELIABILITY_RUNBOOK.md`
- `docs/BASE44_BACKEND_RESUME_PLAYBOOK.md`
- `docs/BASE44_COMPATIBILITY_CONTEXT.md`
- `docs/BASE44_NEXUSOS_UI_REFINEMENT_MAP.md`
- `docs/NEXUS_OS_TOP10_REFINEMENTS_2026-02-14.md`
- `docs/FEATURE_TODO.md`

If an agent proposes changes that contradict these docs, the agent must stop and reconcile.

---

## 4) Required Commands (Local Gates)

### Baseline gates (must pass before merge)
Run from repo root:
- `npm run verify:stability`
- `npm run verify:base44-context`

### If backend functions or backend surfaces are touched
- `npm run test:backend`

### Optional “release sweep”
- `npm run verify:all`

> Any PR that changes runtime behavior must include the command outputs (or at minimum confirm these commands were run and passed).

---

## 5) AI Agent Output Contract (Continue / LM Studio)

When an agent is asked to do work, it must follow this structure:

1) **Plan (3–7 bullets)**  
   - What will change, why, and what will not change (non-goals)
2) **Files to touch (exact paths)**  
3) **Patch**  
   - Prefer **unified diff** per file.
   - Only output **full-file content** if explicitly requested.
4) **Tests**  
   - Identify test files to add/update and what they prove.
5) **Commands**  
   - Provide exact commands to validate.

### If information is missing
- Ask only for the **minimum** missing input (exact file path, snippet, or error output).
- Do not guess repo structure or invent files.

---

## 6) Continue + LM Studio Operating Mode (Local Agent Setup)

This repo supports heavy agent workflows without cloud credits.

Recommended model split:
- **Devstral Small 2 (24B)** for `chat/edit/apply`
- **Qwen2.5 Coder 7B** for `autocomplete`

### Endpoint discipline
- Continue uses LM Studio OpenAI-compatible base: `http://localhost:1234/v1`
- LM Studio native v1 REST API: `http://localhost:1234/api/v1/*` for stateful chat / model management

### Token/auth discipline (optional)
- Prefer auth ON if you expose the server beyond localhost.
- If using tokens, store in environment variables (never commit).

---

## 7) Change Workflow (Human + Agent)

### A) Choose an unblocked target
Start from:
- `docs/NEXUS_OS_TOP10_REFINEMENTS_2026-02-14.md` (stability/perf/persistence hardening)
- `docs/FEATURE_TODO.md` (prefer items not marked BLOCKED)

If an item is BLOCKED on Base44 schema/entities, do not implement partial scaffolding unless explicitly requested.

### B) Create a branch
- `git checkout -b feat/<short-slug>`

### C) Implement minimal diff
- Preserve existing patterns (services, validators, persistence helpers).
- Do not introduce new global state patterns unless required.

### D) Add/Update tests
- Changes to logic must be covered by unit tests (Vitest) where feasible.
- Backend function behavior changes require backend tests where applicable.

### E) Run gates
- `npm run verify:stability`
- `npm run verify:base44-context`
- plus `npm run test:backend` if relevant

### F) PR checklist
PR description must include:
- What changed (1–3 sentences)
- Risks/mitigations
- Tests run + results
- Any Base44 considerations

---

## 8) Patterns and Conventions

### Base44 integration
- Use existing API wrappers under `src/api/` for member-function invocation and Base44 calls.
- Privileged operations (token minting, admin actions) belong in `functions/`.
- Client-side must treat backend as authoritative when required.

### Persistence and guardrails
- Session/workbench/layout/widget persistence paths are sensitive.
- Keep bounds/limits (caps on payload sizes, list lengths, etc.) intact.
- When adding new persisted keys, document them and provide migration or cleanup logic if necessary.

### Performance
- Avoid heavy recomputation in render paths; memoize or precompute when necessary.
- Prefer stable selectors and derived state patterns consistent with current code.

---

## 9) Common Failure Handling (Agent Must Follow)

### If lint/typecheck fails
- Fix the *smallest* root cause. Don’t reformat unrelated code.
- Keep changes localized.

### If tests fail
- Identify if the failure is due to behavior change or test brittleness.
- Prefer updating tests only when behavior is intentionally changed.

### If Base44 context verification fails
- Treat as critical. Revert any deprecated patterns or unsupported imports.

---

## 10) “Do / Don’t” Summary

### Do
- Keep diffs small.
- Follow docs/runbooks.
- Add tests for behavior changes.
- Run gates before merge.
- Preserve Base44 boundaries.

### Don’t
- Invent files/paths/entities.
- Introduce secrets into client or git.
- Perform sweeping refactors.
- Switch languages/frameworks.
- Add “AI calls everywhere.”

---

## 11) Nomad Nexus Aesthetic (UI Guidance)

Nomad Nexus targets a **dark, sci-fi operational console** feel. UI work should:
- Use the existing NexusOS theme foundations.
- Maintain high contrast, readable hierarchy, and operational density.
- Prefer responsive, non-scrolling operational surfaces where possible.

---

## 12) Agent Prompt Template (Copy/Paste)

Use this to keep agents aligned:

**Goal:**  
**Non-goals:**  
**Constraints:** Base44 compatible; minimal diff; no secrets in localStorage; TS/JS only; deterministic-first  
**Files (if known):**  
**Acceptance:** `npm run verify:stability` + `npm run verify:base44-context` (+ `npm run test:backend` if needed)  
**Output:** Plan → file list → unified diff → tests → commands

---

## 13) Updating This File

If you change workflows or add new “must-run” gates, update AGENTS.md in the same PR and explain the change in the PR description.

---