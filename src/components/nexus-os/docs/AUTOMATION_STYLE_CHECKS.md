# NexusOS Automation Style Checks (Spec)

## Local Pre-Commit (Optional)
- Scope: staged files under `src/components/nexus-os/ui/**`.
- Action: run style validator in warning mode.
- Output: per-file violations + summary score.
- Behavior: non-blocking warning by default.

Example hook logic:
1. Detect staged NexusOS files.
2. Run validator script against rendered snapshots.
3. Print remediation hints for typography/spacing/icons/colors.

## CI Workflow (Optional)
- Trigger: pull requests touching `src/components/nexus-os/**`.
- Actions:
  - Build app.
  - Run validator and emit machine report.
  - Publish report artifact.
  - Soft-fail below threshold (warning), hard-fail for critical regressions if configured.

Suggested threshold:
- Warning below 90.
- Fail below 80 or if no-scroll checks fail.

