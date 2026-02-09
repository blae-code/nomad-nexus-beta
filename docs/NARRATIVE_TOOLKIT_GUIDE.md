# Narrative Toolkit Guide (Nexus OS)

This guide covers the immersive roleplay and narrative toolkit introduced for Nexus OS operations.

## Purpose

- Turn missions into auditable story artifacts.
- Keep rescue-first framing in briefs and after-action narratives.
- Support IC (in-character) and OOC (out-of-character) contributions without mixing context.

## What Is Included

- Character persona profiles (name, affiliation, bio, IC default).
- Scoped narrative log entries for operations.
- Mission brief and story-so-far generation helpers.
- AI narrative function (`generateNarrative`) with explicit no-fabrication doctrine.
- Report-to-narrative bridge for `OP_BRIEF` and `AAR`.

## Doctrine Guardrails

- Narrative entries are scoped (`OP`/`ORG`/`PRIVATE`); no global omniscient chat.
- Official entries are rescue-first and should explicitly mark unknowns when data is missing.
- AI-authored text is tagged as AI-assisted and can be edited or superseded by operators.
- Narrative does not override evidence tracks or operational truth records.

## Operator Workflow

1. Open `Operation Focus` in Nexus OS.
2. Select the `NARRATIVE` tab.
3. Configure persona (optional but recommended for immersive roleplay).
4. Post IC or OOC entries with tags.
5. Use:
   - `Generate Brief Draft` for deterministic mission brief baseline.
   - `Story So Far (Local)` for deterministic snapshot from operation/thread data.
   - `Story So Far (AI)` for AI-assisted narrative wording.

## AI Function Setup

Function file: `functions/generateNarrative.ts`

Expected request payload example:

```json
{
  "mode": "STORY_SO_FAR",
  "opId": "op_123",
  "title": "Story So Far - Redscar Echo",
  "notes": "Rescue-first framing. Keep concise.",
  "context": {
    "operation": {
      "id": "op_123",
      "name": "Redscar Echo",
      "status": "ACTIVE",
      "posture": "FOCUSED",
      "ao": { "nodeId": "body-daymar" }
    },
    "timeline": [
      { "summary": "Medic stabilized pilot at breach lane" }
    ]
  },
  "refs": [
    { "kind": "operation", "id": "op_123" }
  ]
}
```

Response includes `title`, `narrative`, `warnings`, `refs`, and persistence diagnostics.

## Testing Checklist

- Save persona and verify it appears in new narrative entries.
- Post both IC and OOC entries and filter by mode.
- Generate local mission brief and ensure rescue-first line appears.
- Generate AI story and verify AI badge/metadata is shown.
- Generate OP brief/AAR report, then publish to narrative log from Reports focus app.

