import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { getMacrosForVariant, type CqbMacroDefinition } from '../../registries/macroRegistry';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { parseCqbVoiceCommand } from '../../services/cqbVoiceCommandService';
import { NexusBadge, NexusButton } from '../primitives';
import CqbQuickRadialMenu from './CqbQuickRadialMenu';
import type { CqbPanelSharedProps } from './cqbTypes';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface CqbHandsFreeControlProps extends Pick<CqbPanelSharedProps, 'variantId' | 'opId' | 'actorId' | 'operations' | 'focusOperationId'> {
  onDispatchMacro?: (eventType: CqbEventType, payload: Record<string, unknown>) => void;
}

const AGENT_SYNC_EVENTS = new Set<CqbEventType>(['CONTACT', 'DOWNED', 'EXTRACT', 'CHECK_FIRE', 'CEASE_FIRE', 'THREAT_UPDATE']);

function inferVoiceMandatory(ops: CqbPanelSharedProps['operations'], opId?: string, focusOperationId?: string): boolean {
  if (!Array.isArray(ops) || ops.length === 0) return false;
  const activeId = String(opId || focusOperationId || '').trim();
  const target = activeId ? ops.find((entry) => entry.id === activeId) : ops.find((entry) => entry.id === focusOperationId);
  if (!target) return false;
  return target.posture === 'FOCUSED' && target.status === 'ACTIVE';
}

function sanitizeTranscript(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function canUseInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = String(element.tagName || '').toLowerCase();
  return element.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}

export default function CqbHandsFreeControl({
  variantId,
  opId,
  actorId,
  operations,
  focusOperationId,
  onDispatchMacro,
}: CqbHandsFreeControlProps) {
  const voiceNet = useVoiceNet();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const shouldProcessOnEndRef = useRef(false);
  const [holdingPTT, setHoldingPTT] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready.');
  const [parseSummary, setParseSummary] = useState('');
  const [agentSyncState, setAgentSyncState] = useState('');
  const [lastDispatchedMacro, setLastDispatchedMacro] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState('');

  const voiceMandatory = useMemo(
    () => inferVoiceMandatory(operations, opId, focusOperationId),
    [focusOperationId, opId, operations]
  );

  const connectedNetId = voiceNet.transmitNetId || voiceNet.activeNetId || null;
  const voiceReady =
    Boolean(connectedNetId) &&
    voiceNet.connectionState === 'CONNECTED' &&
    Boolean(voiceNet.micEnabled);

  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const pushTranscriptToRadioLog = useCallback(
    async (transcript: string, confidence: number) => {
      if (!transcript) return;
      await voiceNet.appendRadioLogEntry?.({
        eventId: opId || focusOperationId || undefined,
        netId: connectedNetId || undefined,
        speakerMemberProfileId: actorId,
        transcript,
        transcriptConfidence: confidence,
      });
    },
    [actorId, connectedNetId, focusOperationId, opId, voiceNet]
  );

  const syncAgentDraft = useCallback(
    async (eventType: CqbEventType) => {
      if (!AGENT_SYNC_EVENTS.has(eventType)) return;
      setAgentSyncState('Agent sync: drafting STATUS update...');
      await voiceNet.generateVoiceStructuredDraft?.({
        eventId: opId || focusOperationId || undefined,
        netId: connectedNetId || undefined,
        draftType: 'STATUS',
      });
      setAgentSyncState('Agent sync: STATUS draft refreshed from radio log.');
    },
    [connectedNetId, focusOperationId, opId, voiceNet]
  );

  const dispatchTranscript = useCallback(
    async (rawTranscript: string, source: 'voice' | 'manual') => {
      const transcript = sanitizeTranscript(rawTranscript);
      if (!transcript) {
        setParseSummary('No transcript captured.');
        return;
      }
      const parsed = parseCqbVoiceCommand(variantId, transcript);
      setLastTranscript(transcript);
      setParseSummary(parsed.reason);
      setStatusMessage(
        parsed.status === 'MATCHED'
          ? `Mapped to ${parsed.macroLabel || parsed.eventType}.`
          : 'Command not recognized. Use suggestion or radial action.'
      );

      await pushTranscriptToRadioLog(transcript, parsed.confidence);

      if (parsed.status !== 'MATCHED' || !parsed.eventType) {
        if (parsed.suggestions.length > 0) {
          setStatusMessage(
            `Unrecognized. Suggestions: ${parsed.suggestions.map((entry) => entry.label).join(', ')}.`
          );
        }
        return;
      }

      onDispatchMacro?.(parsed.eventType, {
        ...parsed.payload,
        transcript,
        commandSource: source,
        parserConfidence: parsed.confidence,
        macroId: parsed.macroId,
      });
      setLastDispatchedMacro(parsed.macroId || null);
      await syncAgentDraft(parsed.eventType);
    },
    [onDispatchMacro, pushTranscriptToRadioLog, syncAgentDraft, variantId]
  );

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    shouldProcessOnEndRef.current = true;
    try {
      recognition.stop();
    } catch {
      // ignore browser stop errors
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!speechSupported) {
      setSpeechError('Browser speech recognition unavailable.');
      return;
    }

    if (listening) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechError('Browser speech recognition unavailable.');
      return;
    }

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    shouldProcessOnEndRef.current = false;
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = sanitizeTranscript(result?.[0]?.transcript || '');
        if (!transcript) continue;
        if (result.isFinal) finalText += ` ${transcript}`;
        else interimText += ` ${transcript}`;
      }
      if (finalText.trim()) {
        finalTranscriptRef.current = sanitizeTranscript(`${finalTranscriptRef.current} ${finalText}`);
      }
      interimTranscriptRef.current = sanitizeTranscript(interimText);
      const liveTranscript = sanitizeTranscript(`${finalTranscriptRef.current} ${interimTranscriptRef.current}`);
      if (liveTranscript) setLastTranscript(liveTranscript);
    };

    recognition.onerror = (event) => {
      setSpeechError(`Speech recognition error: ${event?.error || 'unknown'}.`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      const finalTranscript = sanitizeTranscript(
        finalTranscriptRef.current || interimTranscriptRef.current
      );
      if (shouldProcessOnEndRef.current && finalTranscript) {
        void dispatchTranscript(finalTranscript, 'voice');
      }
      shouldProcessOnEndRef.current = false;
    };

    try {
      recognition.start();
      setListening(true);
      setSpeechError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start speech recognition.';
      setSpeechError(message);
      setListening(false);
    }
  }, [dispatchTranscript, listening, speechSupported]);

  const startPTTSession = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      event?.preventDefault();
      if (voiceMandatory && !voiceReady) {
        setStatusMessage('Voice discipline active: connect voice net + mic before gameplay command entry.');
        return;
      }
      setHoldingPTT(true);
      voiceNet.startPTT?.();
      startRecognition();
    },
    [startRecognition, voiceMandatory, voiceNet, voiceReady]
  );

  const stopPTTSession = useCallback(
    (event?: React.MouseEvent | React.TouchEvent) => {
      event?.preventDefault();
      if (!holdingPTT) return;
      setHoldingPTT(false);
      voiceNet.stopPTT?.();
      stopRecognition();
    },
    [holdingPTT, stopRecognition, voiceNet]
  );

  const dispatchMacro = useCallback(
    (macro: CqbMacroDefinition) => {
      const payload = {
        ...macro.payloadTemplate,
        macroId: macro.id,
        macroLabel: macro.label,
        commandSource: 'radial',
      };
      onDispatchMacro?.(macro.eventType, payload);
      setLastDispatchedMacro(macro.id);
      setStatusMessage(`Radial dispatch: ${macro.label}.`);
      setParseSummary(`Mapped to macro ${macro.label}.`);
    },
    [onDispatchMacro]
  );

  useEffect(() => {
    if (!connectedNetId || !voiceMandatory) return;
    const currentMode = String(voiceNet.disciplineModeByNet?.[connectedNetId] || '').toUpperCase();
    if (currentMode !== 'PTT') {
      void voiceNet.setDisciplineMode?.('PTT', connectedNetId);
      setStatusMessage('Focused posture detected: enforcing PTT discipline for gameplay loop control.');
    }
  }, [connectedNetId, voiceMandatory, voiceNet]);

  useEffect(() => {
    const macros = getMacrosForVariant(variantId)
      .slice(0, 8)
      .sort((a, b) => a.label.localeCompare(b.label));
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || canUseInteractiveTarget(event.target)) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= macros.length) return;
      event.preventDefault();
      dispatchMacro(macros[index]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatchMacro, variantId]);

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-3 nexus-panel-glow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100">Hands-Free Loop Control</h3>
        <div className="flex items-center gap-1.5">
          <NexusBadge tone={voiceMandatory ? 'warning' : 'neutral'}>
            {voiceMandatory ? 'PTT Mandatory' : 'Voice Optional'}
          </NexusBadge>
          <NexusBadge tone={voiceReady ? 'ok' : 'warning'}>
            {voiceReady ? 'Voice Ready' : 'Voice Not Ready'}
          </NexusBadge>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Hold PTT, speak brevity callouts, and dispatch via parser. Radial actions remain available for single-tap control.
      </p>

      <div className="mt-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-5 space-y-2">
          <button
            type="button"
            onMouseDown={startPTTSession}
            onMouseUp={stopPTTSession}
            onMouseLeave={stopPTTSession}
            onTouchStart={startPTTSession}
            onTouchEnd={stopPTTSession}
            onTouchCancel={stopPTTSession}
            disabled={voiceMandatory && !voiceReady}
            className={`w-full h-24 rounded-lg border text-sm font-semibold uppercase tracking-[0.13em] transition ${
              holdingPTT || listening
                ? 'border-orange-400 bg-orange-500/20 text-orange-100'
                : 'border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-orange-500/60'
            } ${voiceMandatory && !voiceReady ? 'opacity-60 cursor-not-allowed' : ''}`}
            aria-label="Press and hold PTT for gameplay loop voice command"
          >
            {holdingPTT || listening ? 'Listening.. release to dispatch' : 'Hold PTT + Speak'}
          </button>

          <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 text-[11px] text-zinc-400 min-h-[5.5rem] space-y-1">
            <div>
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Transcript</span>
            </div>
            <div className="text-zinc-200 min-h-[1.4rem]">{lastTranscript || 'No transcript captured.'}</div>
            <div>{parseSummary}</div>
            <div className="text-zinc-500">{statusMessage}</div>
            {agentSyncState ? <div className="text-orange-300">{agentSyncState}</div> : null}
          </div>
        </div>

        <div className="xl:col-span-7 space-y-2">
          <CqbQuickRadialMenu variantId={variantId} disabled={voiceMandatory && !voiceReady} onSelect={dispatchMacro} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
        <span>Speech engine: {speechSupported ? 'Web Speech API' : 'Unavailable'}</span>
        <span>Net: {connectedNetId || 'none'}</span>
        <span>Mic: {voiceNet.micEnabled ? 'enabled' : 'muted'}</span>
        {lastDispatchedMacro ? <span>Last macro: {lastDispatchedMacro}</span> : null}
      </div>
      {speechError ? <div className="mt-1 text-[11px] text-red-300">{speechError}</div> : null}

      {!speechSupported ? (
        <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
          <label className="text-[11px] text-zinc-500 uppercase tracking-[0.12em]">Manual voice transcript fallback</label>
          <div className="mt-1 flex gap-2">
            <input
              value={manualTranscript}
              onChange={(event) => setManualTranscript(event.target.value)}
              placeholder="Type captured comms phrase..."
              className="flex-1 h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            />
            <NexusButton
              size="sm"
              intent="subtle"
              onClick={() => {
                void dispatchTranscript(manualTranscript, 'manual');
                setManualTranscript('');
              }}
              disabled={!sanitizeTranscript(manualTranscript)}
            >
              Parse
            </NexusButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
