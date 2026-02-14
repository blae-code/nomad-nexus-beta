/**
 * Immersive Roleplay and Narrative Schemas
 *
 * Doctrine:
 * - Narrative artifacts must remain scoped and auditable.
 * - Rescue-first framing is required for official mission narratives.
 * - AI assistance is transparent; user-authored content remains first-class.
 */

export type NarrativeVisibility = 'PRIVATE' | 'SQUAD' | 'OP' | 'ORG' | 'PUBLIC';
export type NarrativeSourceKind = 'USER' | 'AI' | 'SYSTEM';
export type NarrativeTone = 'MISSION_CONTROL' | 'FIELD_LOG' | 'IC_COMMS' | 'OOC';
export type NarrativeEventType =
  | 'MISSION_BRIEF'
  | 'TIMELINE_BEAT'
  | 'AAR_BEAT'
  | 'PERSONAL_LOG'
  | 'SYSTEM_SUMMARY'
  | 'COMMENTARY';

export interface CharacterProfile {
  id: string;
  memberProfileId: string;
  characterName: string;
  biography?: string;
  affiliation?: string;
  specialties?: string[];
  inCharacterByDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeRef {
  kind: string;
  id: string;
}

export interface NarrativeEvent {
  id: string;
  opId?: string;
  campaignId?: string;
  authorId: string;
  authorLabel?: string;
  type: NarrativeEventType;
  tone: NarrativeTone;
  title: string;
  body: string;
  tags: string[];
  inCharacter: boolean;
  rescueFirst: boolean;
  visibility: NarrativeVisibility;
  sourceKind: NarrativeSourceKind;
  sourceRefs: NarrativeRef[];
  generatedByAi?: boolean;
  aiModelHint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryArc {
  id: string;
  name: string;
  description?: string;
  operationIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NarrativeTemplate {
  id: string;
  kind: 'MISSION_BRIEF' | 'CHARACTER_LOG' | 'STORY_SO_FAR';
  version: string;
  heading: string;
  sections: string[];
}

export interface NarrativeGenerationRequest {
  mode: 'MISSION_BRIEF' | 'STORY_SO_FAR' | 'AAR_EPILOGUE' | 'IC_SUMMARY';
  opId?: string;
  title?: string;
  notes?: string;
  includeRefs?: NarrativeRef[];
  styleHint?: string;
}

