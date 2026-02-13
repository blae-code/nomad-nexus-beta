import React, { useEffect, useMemo, useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import type { Operation } from '../../schemas/opSchemas';
import type { NarrativeEvent } from '../../schemas/narrativeSchemas';
import {
  createMissionBriefNarrative,
  createNarrativeEvent,
  createStorySoFarSummary,
  getCharacterProfileByMember,
  listNarrativeEvents,
  subscribeNarrative,
  upsertCharacterProfile,
} from '../../services/narrativeService';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';

interface OperationNarrativePanelProps {
  op: Operation;
  actorId: string;
}

type NarrativeFilter = 'ALL' | 'IC' | 'OOC';

function toneBadgeTone(tone: NarrativeEvent['tone']): 'neutral' | 'active' | 'warning' {
  if (tone === 'IC_COMMS') return 'active';
  if (tone === 'MISSION_CONTROL') return 'warning';
  return 'neutral';
}

export default function OperationNarrativePanel({ op, actorId }: OperationNarrativePanelProps) {
  const [narrativeVersion, setNarrativeVersion] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAffiliation, setProfileAffiliation] = useState('');
  const [profileIcDefault, setProfileIcDefault] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState('');
  const [entryTagInput, setEntryTagInput] = useState('');
  const [entryIcMode, setEntryIcMode] = useState(false);
  const [narrativeFilter, setNarrativeFilter] = useState<NarrativeFilter>('ALL');
  const [narrativePage, setNarrativePage] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeNarrative(() => setNarrativeVersion((value) => value + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const existing = getCharacterProfileByMember(actorId);
    if (!existing) return;
    setProfileName(existing.characterName || '');
    setProfileBio(existing.biography || '');
    setProfileAffiliation(existing.affiliation || '');
    setProfileIcDefault(existing.inCharacterByDefault);
    setEntryIcMode(existing.inCharacterByDefault);
  }, [actorId, narrativeVersion]);

  const entries = useMemo(() => {
    const includeIc = narrativeFilter === 'ALL' ? undefined : narrativeFilter === 'IC';
    return listNarrativeEvents({
      opId: op.id,
      inCharacter: includeIc,
      visibilityEnvelope: ['OP', 'ORG', 'SQUAD'],
    });
  }, [op.id, narrativeVersion, narrativeFilter]);
  const entriesPerPage = 6;
  const narrativePageCount = Math.max(1, Math.ceil(entries.length / entriesPerPage));
  const visibleEntries = useMemo(
    () => entries.slice(narrativePage * entriesPerPage, narrativePage * entriesPerPage + entriesPerPage),
    [entries, narrativePage]
  );

  useEffect(() => {
    setNarrativePage((current) => Math.min(current, narrativePageCount - 1));
  }, [narrativePageCount]);

  const runAction = async (action: () => Promise<void> | void) => {
    try {
      setErrorText('');
      const result = action();
      if (result && typeof (result as Promise<void>).then === 'function') {
        await result;
      }
    } catch (error: any) {
      setErrorText(error?.message || 'Action failed');
    }
  };

  const savePersona = () =>
    runAction(() => {
      upsertCharacterProfile({
        memberProfileId: actorId,
        characterName: profileName || 'Operator',
        biography: profileBio,
        affiliation: profileAffiliation,
        inCharacterByDefault: profileIcDefault,
      });
    });

  const postEntry = () =>
    runAction(() => {
      if (!entryTitle.trim() || !entryBody.trim()) return;
      const existing = getCharacterProfileByMember(actorId);
      createNarrativeEvent({
        opId: op.id,
        authorId: actorId,
        authorLabel: existing?.characterName || actorId,
        type: entryIcMode ? 'COMMENTARY' : 'TIMELINE_BEAT',
        tone: entryIcMode ? 'IC_COMMS' : 'OOC',
        title: entryTitle,
        body: entryBody,
        tags: entryTagInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        inCharacter: entryIcMode,
        visibility: 'OP',
        sourceKind: 'USER',
      });
      setEntryTitle('');
      setEntryBody('');
      setEntryTagInput('');
    });

  const generateLocalBrief = () =>
    runAction(() => {
      createMissionBriefNarrative(op.id, actorId, {
        additionalContext: 'Rescue-first doctrine in effect. Preserve lives, maintain discipline.',
      });
    });

  const generateStorySnapshot = () =>
    runAction(() => {
      createStorySoFarSummary(op.id, actorId);
    });

  const generateAiNarrative = () =>
    runAction(async () => {
      setIsBusy(true);
      try {
        const response: any = await invokeMemberFunction('generateNarrative', {
          opId: op.id,
          mode: 'STORY_SO_FAR',
          title: `Story So Far - ${op.name}`,
          notes: 'Rescue-first, concise, mission-control tone.',
          context: {
            operation: {
              id: op.id,
              name: op.name,
              status: op.status,
              posture: op.posture,
              ao: op.ao,
            },
          },
        });
        if (!response?.success) {
          throw new Error(response?.error || 'Narrative generation unavailable');
        }
        createNarrativeEvent({
          opId: op.id,
          authorId: actorId,
          authorLabel: 'AI Assistant',
          type: 'SYSTEM_SUMMARY',
          tone: 'MISSION_CONTROL',
          title: response.title || `Story So Far - ${op.name}`,
          body: response.narrative || 'AI output was empty.',
          tags: ['ai-assisted', 'story-so-far'],
          inCharacter: false,
          visibility: 'OP',
          sourceKind: 'AI',
          generatedByAi: true,
          aiModelHint: response.model || 'unknown',
          sourceRefs: Array.isArray(response.refs) ? response.refs : [{ kind: 'operation', id: op.id }],
        });
      } finally {
        setIsBusy(false);
      }
    });

  if (!op?.id) {
    return <DegradedStateCard state="LOCKED" reason="Operation context is required for narrative tooling." />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      <section className="xl:col-span-4 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Character Persona</h4>
          <NexusBadge tone={profileIcDefault ? 'active' : 'neutral'}>
            {profileIcDefault ? 'IC DEFAULT' : 'OOC DEFAULT'}
          </NexusBadge>
        </div>
        <input
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="Character name"
        />
        <input
          value={profileAffiliation}
          onChange={(event) => setProfileAffiliation(event.target.value)}
          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          placeholder="Affiliation"
        />
        <textarea
          value={profileBio}
          onChange={(event) => setProfileBio(event.target.value)}
          className="h-20 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          placeholder="Short bio/backstory"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={profileIcDefault}
            onChange={(event) => setProfileIcDefault(event.target.checked)}
          />
          Use IC mode by default
        </label>
        <NexusButton size="sm" intent="primary" onClick={savePersona}>
          Save Persona
        </NexusButton>

        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Narrative Generation</div>
          <NexusButton size="sm" intent="subtle" onClick={generateLocalBrief}>
            Generate Brief Draft
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={generateStorySnapshot}>
            Story So Far (Local)
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={generateAiNarrative} disabled={isBusy}>
            {isBusy ? 'Generating...' : 'Story So Far (AI)'}
          </NexusButton>
          <p className="text-[11px] text-zinc-500">
            AI entries are tagged and never treated as authoritative truth without evidence refs.
          </p>
        </div>
      </section>

      <section className="xl:col-span-8 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Operation Narrative</h4>
          <div className="flex items-center gap-2">
            <NexusButton size="sm" intent={narrativeFilter === 'ALL' ? 'primary' : 'subtle'} onClick={() => setNarrativeFilter('ALL')}>All</NexusButton>
            <NexusButton size="sm" intent={narrativeFilter === 'IC' ? 'primary' : 'subtle'} onClick={() => setNarrativeFilter('IC')}>IC</NexusButton>
            <NexusButton size="sm" intent={narrativeFilter === 'OOC' ? 'primary' : 'subtle'} onClick={() => setNarrativeFilter('OOC')}>OOC</NexusButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          <input
            value={entryTitle}
            onChange={(event) => setEntryTitle(event.target.value)}
            className="lg:col-span-2 h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Entry title"
          />
          <input
            value={entryTagInput}
            onChange={(event) => setEntryTagInput(event.target.value)}
            className="lg:col-span-2 h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="tags (comma separated)"
          />
          <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 flex items-center gap-2">
            <input type="checkbox" checked={entryIcMode} onChange={(event) => setEntryIcMode(event.target.checked)} />
            IC Mode
          </label>
        </div>
        <textarea
          value={entryBody}
          onChange={(event) => setEntryBody(event.target.value)}
          className="h-20 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          placeholder="Narrative entry..."
        />
        <div className="flex items-center gap-2">
          <NexusButton size="sm" intent="primary" onClick={postEntry}>
            Post Entry
          </NexusButton>
          <p className="text-[11px] text-zinc-500">
            IC and OOC streams are explicitly tagged to avoid comms ambiguity.
          </p>
        </div>

        {errorText ? (
          <div className="rounded border border-red-900/60 bg-red-950/30 px-2 py-1 text-[11px] text-red-300">
            {errorText}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-1">
          <NexusButton size="sm" intent="subtle" onClick={() => setNarrativePage((current) => Math.max(0, current - 1))} disabled={narrativePage === 0}>
            Prev
          </NexusButton>
          <NexusBadge tone="neutral">{narrativePage + 1}/{narrativePageCount}</NexusBadge>
          <NexusButton size="sm" intent="subtle" onClick={() => setNarrativePage((current) => Math.min(narrativePageCount - 1, current + 1))} disabled={narrativePage >= narrativePageCount - 1}>
            Next
          </NexusButton>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden pr-1 space-y-1.5">
          {visibleEntries.map((entry) => (
            <article key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-zinc-200 truncate">{entry.title}</div>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={entry.inCharacter ? 'active' : 'neutral'}>{entry.inCharacter ? 'IC' : 'OOC'}</NexusBadge>
                  <NexusBadge tone={toneBadgeTone(entry.tone)}>{entry.tone}</NexusBadge>
                  {entry.generatedByAi ? <NexusBadge tone="warning">AI</NexusBadge> : null}
                </div>
              </div>
              <div className={`whitespace-pre-wrap ${entry.inCharacter ? 'italic text-zinc-300' : 'text-zinc-400'}`}>{entry.body}</div>
              <div className="flex items-center justify-between gap-2 text-zinc-500">
                <span>{entry.authorLabel || entry.authorId}</span>
                <span>{entry.createdAt}</span>
              </div>
            </article>
          ))}
          {entries.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-xs text-zinc-500">
              No narrative entries yet. Use brief/story generation or post an entry.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
