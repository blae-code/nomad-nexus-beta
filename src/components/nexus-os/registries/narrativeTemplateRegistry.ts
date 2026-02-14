/**
 * Narrative Template Registry
 *
 * Compact templates for immersive mission writing workflows.
 * Keep template IDs stable to preserve audit and campaign continuity.
 */

import type { NarrativeTemplate } from '../schemas/narrativeSchemas';

export type NarrativeTemplateId =
  | 'NARRATIVE_MISSION_BRIEF_V1'
  | 'NARRATIVE_CHARACTER_LOG_V1'
  | 'NARRATIVE_STORY_SO_FAR_V1';

export const NarrativeTemplateRegistry: Readonly<Record<NarrativeTemplateId, NarrativeTemplate>> = {
  NARRATIVE_MISSION_BRIEF_V1: {
    id: 'NARRATIVE_MISSION_BRIEF_V1',
    kind: 'MISSION_BRIEF',
    version: '1.0.0',
    heading: 'Mission Brief',
    sections: [
      'Situation',
      'Rescue Priorities',
      'Operational Tasks',
      'Medical and Recovery Plan',
      'Comms Discipline',
    ],
  },
  NARRATIVE_CHARACTER_LOG_V1: {
    id: 'NARRATIVE_CHARACTER_LOG_V1',
    kind: 'CHARACTER_LOG',
    version: '1.0.0',
    heading: 'Character Log',
    sections: [
      'Context',
      'What I Observed',
      'What I Did',
      'Rescue or Support Outcomes',
      'What Needs Follow-up',
    ],
  },
  NARRATIVE_STORY_SO_FAR_V1: {
    id: 'NARRATIVE_STORY_SO_FAR_V1',
    kind: 'STORY_SO_FAR',
    version: '1.0.0',
    heading: 'Story So Far',
    sections: [
      'Mission Arc',
      'Critical Turning Points',
      'Rescues and Recoveries',
      'Outstanding Risks',
      'Next Chapter',
    ],
  },
};

export function getNarrativeTemplate(templateId: string): NarrativeTemplate | null {
  return NarrativeTemplateRegistry[templateId as NarrativeTemplateId] || null;
}

export function listNarrativeTemplates(kind?: NarrativeTemplate['kind']): NarrativeTemplate[] {
  const all = Object.values(NarrativeTemplateRegistry);
  if (!kind) return all;
  return all.filter((template) => template.kind === kind);
}

