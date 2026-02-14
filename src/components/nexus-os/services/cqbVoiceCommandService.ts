import { getMacrosForVariant, type CqbMacroDefinition } from '../registries/macroRegistry';
import type { CqbEventType } from '../schemas/coreSchemas';

export interface VoiceMacroSuggestion {
  macroId: string;
  label: string;
  eventType: CqbEventType;
}

export interface CqbVoiceCommandParseResult {
  transcript: string;
  normalizedTranscript: string;
  status: 'MATCHED' | 'UNRECOGNIZED';
  eventType?: CqbEventType;
  macroId?: string;
  macroLabel?: string;
  payload: Record<string, unknown>;
  confidence: number;
  reason: string;
  suggestions: VoiceMacroSuggestion[];
}

const KEYWORD_FALLBACK: ReadonlyArray<{ eventType: CqbEventType; keywords: string[] }> = [
  { eventType: 'CEASE_FIRE', keywords: ['cease fire'] },
  { eventType: 'CHECK_FIRE', keywords: ['check fire', 'friendly fire'] },
  { eventType: 'CLEAR_COMMS', keywords: ['clear comms', 'clear net'] },
  { eventType: 'MOVE_OUT', keywords: ['move out', 'step off'] },
  { eventType: 'SET_SECURITY', keywords: ['set security', 'set 360', 'security up'] },
  { eventType: 'HOLD', keywords: ['hold position', 'hold'] },
  { eventType: 'CONTACT', keywords: ['contact', 'hostile', 'enemy'] },
  { eventType: 'DOWNED', keywords: ['man down', 'downed', 'casualty'] },
  { eventType: 'REVIVE', keywords: ['revive', 'stabilize'] },
  { eventType: 'EXTRACT', keywords: ['extract', 'evac', 'pull out'] },
  { eventType: 'RELOADING', keywords: ['reloading'] },
];

function safeTranscript(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTranscript(value: string): string {
  return safeTranscript(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(value: string): string[] {
  return normalizeTranscript(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload || {}));
}

function buildMacroPhrases(macro: CqbMacroDefinition): string[] {
  const set = new Set<string>();
  set.add(macro.label);
  for (const phrase of macro.phrases || []) set.add(phrase);
  return [...set]
    .map((phrase) => normalizeTranscript(phrase))
    .filter(Boolean);
}

function extractDirection(normalized: string): string | undefined {
  const match = normalized.match(/\b(front|left|right|rear|back)\b/);
  return match ? match[1] : undefined;
}

function extractLane(normalized: string): string | undefined {
  const match = normalized.match(/\blane\s+([a-z0-9-]+)/);
  return match ? match[1] : undefined;
}

function extractDestination(normalized: string): string | undefined {
  const match = normalized.match(/\b(?:to|towards|toward|destination)\s+([a-z0-9-]+)/);
  return match ? match[1] : undefined;
}

function extractCount(normalized: string): number | undefined {
  const countMatch = normalized.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:contacts?|hostiles?|targets?)\b/);
  if (!countMatch) return undefined;
  const token = String(countMatch[1] || '').toLowerCase();
  const wordCountMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const count = Number.isFinite(Number(token)) ? Number(token) : wordCountMap[token];
  return Number.isFinite(count) && count > 0 ? count : undefined;
}

function mergeDerivedPayload(
  eventType: CqbEventType,
  payload: Record<string, unknown>,
  normalizedTranscriptValue: string
): Record<string, unknown> {
  const nextPayload = clonePayload(payload);
  const direction = extractDirection(normalizedTranscriptValue);
  const lane = extractLane(normalizedTranscriptValue);
  const destination = extractDestination(normalizedTranscriptValue);
  const count = extractCount(normalizedTranscriptValue);
  const urgent = /\b(now|immediate|urgent|asap)\b/.test(normalizedTranscriptValue);

  if (eventType === 'MOVE_OUT' && destination && !String(nextPayload.destinationTag || '').trim()) {
    nextPayload.destinationTag = destination;
  }
  if (eventType === 'CROSSING') {
    if (direction) nextPayload.direction = direction;
    if (lane && !String(nextPayload.lane || '').trim()) nextPayload.lane = lane;
  }
  if (eventType === 'CONTACT') {
    if (direction) nextPayload.direction = direction;
    if (typeof count === 'number') nextPayload.count = count;
  }
  if (eventType === 'SET_SECURITY' && /360|three sixty/.test(normalizedTranscriptValue)) {
    nextPayload.coverage360 = true;
  }
  if (urgent) nextPayload.urgency = 'high';
  return nextPayload;
}

function matchMacroByPhrase(
  normalizedTranscriptValue: string,
  macros: CqbMacroDefinition[]
): CqbMacroDefinition | null {
  let bestMatch: { macro: CqbMacroDefinition; score: number } | null = null;

  for (const macro of macros) {
    const phrases = buildMacroPhrases(macro);
    for (const phrase of phrases) {
      const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i');
      if (!regex.test(normalizedTranscriptValue)) continue;
      const score = phrase.length + (macro.phrases?.length || 0);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { macro, score };
      }
    }
  }

  return bestMatch?.macro || null;
}

function buildSuggestions(normalizedTranscriptValue: string, macros: CqbMacroDefinition[]): VoiceMacroSuggestion[] {
  const transcriptTokens = new Set(tokenize(normalizedTranscriptValue));
  if (transcriptTokens.size === 0) {
    return macros.slice(0, 3).map((macro) => ({
      macroId: macro.id,
      label: macro.label,
      eventType: macro.eventType,
    }));
  }

  const scored = macros.map((macro) => {
    const macroTokens = new Set(
      tokenize(`${macro.label} ${(macro.phrases || []).join(' ')}`)
    );
    let overlap = 0;
    for (const token of macroTokens) {
      if (transcriptTokens.has(token)) overlap += 1;
    }
    return { macro, overlap };
  });

  return scored
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.macro.label.localeCompare(b.macro.label))
    .slice(0, 3)
    .map((entry) => ({
      macroId: entry.macro.id,
      label: entry.macro.label,
      eventType: entry.macro.eventType,
    }));
}

function matchFallbackEvent(normalizedTranscriptValue: string): CqbEventType | null {
  for (const entry of KEYWORD_FALLBACK) {
    if (entry.keywords.some((keyword) => normalizedTranscriptValue.includes(keyword))) {
      return entry.eventType;
    }
  }
  return null;
}

function toFallbackMacro(eventType: CqbEventType, macros: CqbMacroDefinition[]): CqbMacroDefinition | null {
  return macros.find((macro) => macro.eventType === eventType) || null;
}

export function parseCqbVoiceCommand(variantId: string, transcript: string): CqbVoiceCommandParseResult {
  const sourceTranscript = safeTranscript(transcript);
  const normalized = normalizeTranscript(sourceTranscript);
  const macros = getMacrosForVariant(variantId);

  if (!normalized) {
    return {
      transcript: sourceTranscript,
      normalizedTranscript: normalized,
      status: 'UNRECOGNIZED',
      payload: {},
      confidence: 0,
      reason: 'No spoken input was captured.',
      suggestions: buildSuggestions(normalized, macros),
    };
  }

  let matchedMacro = matchMacroByPhrase(normalized, macros);
  if (!matchedMacro) {
    const fallbackEvent = matchFallbackEvent(normalized);
    if (fallbackEvent) matchedMacro = toFallbackMacro(fallbackEvent, macros);
  }

  if (!matchedMacro) {
    return {
      transcript: sourceTranscript,
      normalizedTranscript: normalized,
      status: 'UNRECOGNIZED',
      payload: {},
      confidence: 0.32,
      reason: 'No known gameplay brevity phrase matched this command.',
      suggestions: buildSuggestions(normalized, macros),
    };
  }

  const payload = mergeDerivedPayload(matchedMacro.eventType, matchedMacro.payloadTemplate, normalized);
  const phraseBonus = buildMacroPhrases(matchedMacro).some((phrase) =>
    new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i').test(normalized)
  )
    ? 0.24
    : 0.12;
  const confidence = Math.min(0.98, 0.58 + phraseBonus);

  return {
    transcript: sourceTranscript,
    normalizedTranscript: normalized,
    status: 'MATCHED',
    eventType: matchedMacro.eventType,
    macroId: matchedMacro.id,
    macroLabel: matchedMacro.label,
    payload,
    confidence,
    reason: `Mapped to macro ${matchedMacro.label}.`,
    suggestions: [],
  };
}
