import React, { useCallback, useState } from 'react';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { NexusBadge, NexusButton, PanelFrame } from '../primitives';
import { PanelErrorBoundary } from '../workbench';
import CqbFeedPanel from './CqbFeedPanel';
import CqbHandsFreeControl from './CqbHandsFreeControl';
import CqbMacroPad from './CqbMacroPad';
import TeamTilesCqbMode from './TeamTilesCqbMode';
import type { CqbPanelSharedProps } from './cqbTypes';
import { formatGameplayLoopVariantId } from './gameplayLoopLanguage';

interface CqbCommandConsoleProps extends CqbPanelSharedProps {}

const ORDER_EVENT_TYPES = ['HOLD', 'MOVE_OUT', 'SET_SECURITY'] as const;

export default function CqbCommandConsole(props: CqbCommandConsoleProps) {
  const [pendingAcks, setPendingAcks] = useState(['CE', 'GCE', 'ACE']);

  const dispatchMacroEvent = useCallback(
    (eventType: CqbEventType, payload: Record<string, unknown> = {}) => {
      props.onCreateMacroEvent?.(eventType, payload);
    },
    [props]
  );

  const sendOrder = (eventType: (typeof ORDER_EVENT_TYPES)[number]) => {
    dispatchMacroEvent(eventType, { commandStrip: true });
    setPendingAcks(['CE', 'GCE', 'ACE']);
  };

  const toggleAck = (element: string) => {
    setPendingAcks((prev) => (prev.includes(element) ? prev.filter((entry) => entry !== element) : [...prev, element]));
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-8">
          <CqbHandsFreeControl
            variantId={props.variantId}
            opId={props.opId}
            actorId={props.actorId}
            operations={props.operations}
            focusOperationId={props.focusOperationId}
            onDispatchMacro={dispatchMacroEvent}
          />
        </div>
        <div className="xl:col-span-4">
          <section className="rounded border border-zinc-700 bg-zinc-900/45 p-3 space-y-3 h-full">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Order Strip</h3>
              <NexusBadge tone="warning">Ack Stub</NexusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              <NexusButton size="sm" intent="primary" onClick={() => sendOrder('HOLD')} title="Hold - stop movement">
                HOLD
              </NexusButton>
              <NexusButton size="sm" intent="primary" onClick={() => sendOrder('MOVE_OUT')} title="Move out/Step off">
                MOVE OUT
              </NexusButton>
              <NexusButton size="sm" intent="primary" onClick={() => sendOrder('SET_SECURITY')} title="Set security - Set 360deg protection and self check">
                SET SECURITY
              </NexusButton>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
              <span>Acknowledgements:</span>
              {['CE', 'GCE', 'ACE'].map((element) => (
                <label key={element} className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900/60 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={!pendingAcks.includes(element)}
                    onChange={() => toggleAck(element)}
                  />
                  {element}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              For focused operations, keep command issuance on voice PTT cadence and use radial macros for rapid fallback.
            </p>
          </section>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-5 min-h-0">
          <PanelErrorBoundary panelId="focus-team-tiles">
            <PanelFrame title="Team Tiles" status="Loop Ops" statusTone="active" live>
              <TeamTilesCqbMode {...props} />
            </PanelFrame>
          </PanelErrorBoundary>
        </div>
        <div className="xl:col-span-3 min-h-0">
          <PanelErrorBoundary panelId="focus-loop-feed">
            <PanelFrame title="Event Feed" status="Live" statusTone="ok" live>
              <CqbFeedPanel {...props} />
            </PanelFrame>
          </PanelErrorBoundary>
        </div>
        <div className="xl:col-span-4 min-h-0">
          <PanelErrorBoundary panelId="focus-loop-macropad">
            <PanelFrame title="MacroPad" status={formatGameplayLoopVariantId(props.variantId)} statusTone="warning">
              <CqbMacroPad {...props} onCreateMacroEvent={dispatchMacroEvent} />
            </PanelFrame>
          </PanelErrorBoundary>
        </div>
      </div>
    </div>
  );
}
