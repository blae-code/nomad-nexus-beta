import React from 'react';
import { ExternalLink, PenLine, Trash2 } from 'lucide-react';
import { NexusButton } from '../primitives';
import { parseCustomWorkbenchWidgetPanelId } from '../../services/customWorkbenchWidgetService';

function renderBody(body) {
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.trimEnd());
  if (lines.length === 0) return null;
  return lines.map((line, index) => (
    <div key={`${index}:${line}`} className="text-[12px] text-zinc-300 leading-relaxed break-words">
      {line || <span className="text-zinc-600"> </span>}
    </div>
  ));
}

export default function CustomWorkbenchWidgetPanel({
  panelId,
  customWorkbenchWidgetMap = {},
  onEditCustomWorkbenchWidget,
  onDeleteCustomWorkbenchWidget,
}) {
  const widgetId = parseCustomWorkbenchWidgetPanelId(panelId);
  const widget = widgetId ? customWorkbenchWidgetMap[widgetId] : null;

  if (!widget) {
    return (
      <div className="h-full rounded border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
        Widget unavailable. It may have been removed from this workspace scope.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {widget.description ? <p className="text-xs text-zinc-500">{widget.description}</p> : null}

      <div className="rounded border border-zinc-800 bg-zinc-950/45 p-2.5 space-y-1 overflow-auto min-h-[5rem]">
        {widget.body ? renderBody(widget.body) : <div className="text-[12px] text-zinc-600">No widget body content.</div>}
      </div>

      {Array.isArray(widget.links) && widget.links.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-zinc-500">Links</div>
          <div className="space-y-1.5">
            {widget.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-600"
              >
                <span className="truncate">{link.label}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2">
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => onEditCustomWorkbenchWidget?.(widget.id)}
          title="Edit this custom widget"
        >
          <PenLine className="w-3.5 h-3.5 mr-1" />
          Edit
        </NexusButton>
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => onDeleteCustomWorkbenchWidget?.(widget.id)}
          title="Delete this custom widget"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Delete
        </NexusButton>
      </div>
    </div>
  );
}
