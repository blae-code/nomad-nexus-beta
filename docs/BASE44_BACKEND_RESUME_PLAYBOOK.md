# Base44 Backend Resume Playbook

This is the fastest low-risk sequence to resume backend work when Base44 credits refresh.

## 1) Local preflight before any live calls

Run:

```bash
npm run backend:preflight
```

What this validates:
- Type safety (`npm run typecheck`)
- Lint safety (`npm run lint`)
- Backend/unit behavior (`npm run test:backend`)

## 2) Environment checklist

Required for service-role-backed functions:
- `BASE44_APP_ID`
- `BASE44_SERVICE_ROLE_KEY`

Required for frontend SDK path:
- `VITE_BASE44_APP_ID`
- `VITE_BASE44_BACKEND_URL`

Optional but recommended for comms readiness:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## 3) Readiness scan credit controls

`functions/scanReadiness.ts` is now deterministic-first with gated LLM usage.

Tune via env vars:
- `READINESS_LLM_MODE`: `auto` (default) | `off` | `always`
- `READINESS_MAX_LLM_INVOCATIONS`: default `3` per scan run
- `READINESS_MAX_EVENTS`: default `40`
- `READINESS_MAX_SCAN_TIME_MS`: default `25000`

Recommended first run tomorrow:
- `READINESS_LLM_MODE=off`
- Verify deterministic output and alert quality first.
- Re-enable `auto` only when deterministic baseline is confirmed.

## 4) First live backend verification sequence

1. Run `verifyCommsReadiness` (quick env/connectivity gate).
2. Run one low-risk command-path function in a scoped test event.
3. Run tactical flows that touch `updateCommsConsole` and `updateMissionControl`.
4. Enable `scanReadiness` with `READINESS_LLM_MODE=auto` after baseline checks.

## 5) Rollback posture if anything drifts

- Set `READINESS_LLM_MODE=off` immediately.
- Keep command-surface flows operational on deterministic logic.
- Use `npm run test:backend` to confirm no local regression was introduced.
