import React from 'react';
import { Copy, ExternalLink, PenLine, Trash2 } from 'lucide-react';
import { NexusButton } from '../primitives';
import { parseCustomWorkbenchWidgetPanelId } from '../../services/customWorkbenchWidgetService';

function renderBody(widget, maxLines = 8) {
  const body = widget?.body || '';
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.trimEnd());
  if (lines.length === 0) return null;
  const visibleLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  if (widget?.kind === 'CHECKLIST') {
    return (
      <>
        {visibleLines.map((line, index) => {
          const normalized = line.replace(/^[-*]\s*/, '');
          return (
            <label key={`${index}:${line}`} className="flex items-start gap-2 text-[12px] text-zinc-300 leading-relaxed">
              <input type="checkbox" className="mt-0.5" />
              <span className="break-words">{normalized || ' '}</span>
            </label>
          );
        })}
        {hasMore ? <div className="text-[10px] text-zinc-500">Additional lines available in editor view.</div> : null}
      </>
    );
  }
  if (widget?.kind === 'METRIC') {
    return (
      <>
        {visibleLines.map((line, index) => {
          const [label, ...rest] = line.split(':');
          const value = rest.join(':').trim();
          return (
            <div key={`${index}:${line}`} className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label || 'Metric'}</div>
              <div className="text-sm text-zinc-200">{value || '--'}</div>
            </div>
          );
        })}
        {hasMore ? <div className="text-[10px] text-zinc-500">Additional metrics available in editor view.</div> : null}
      </>
    );
  }
  return (
    <>
      {visibleLines.map((line, index) => (
        <div key={`${index}:${line}`} className="text-[12px] text-zinc-300 leading-relaxed break-words">
          {line || <span className="text-zinc-600"> </span>}
        </div>
      ))}
      {hasMore ? <div className="text-[10px] text-zinc-500">Additional lines available in editor view.</div> : null}
    </>
  );
}

function bodyStyleClasses(widget) {
  if (widget?.visualStyle === 'AURORA') {
    return 'border-zinc-700 bg-[linear-gradient(160deg,rgba(255,136,84,0.2),rgba(86,164,255,0.12)_48%,rgba(18,15,14,0.72))]';
  }
  if (widget?.visualStyle === 'CONSOLE') {
    return 'border-emerald-900/40 bg-zinc-950/85';
  }
  if (widget?.visualStyle === 'SURFACE') {
    return 'border-zinc-700 bg-zinc-900/55';
  }
  return 'border-zinc-800 bg-zinc-950/45';
}

export default function CustomWorkbenchWidgetPanel({
  panelId,
  customWorkbenchWidgetMap = {},
  onEditCustomWorkbenchWidget,
  onDeleteCustomWorkbenchWidget,
  onDuplicateCustomWorkbenchWidget,
  onShareCustomWorkbenchWidget,
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
      <div className="flex items-center justify-between gap-2">
        {widget.description ? <p className="text-xs text-zinc-500 truncate">{widget.description}</p> : <div className="text-xs text-zinc-600">No description</div>}
        <div className="text-[10px] text-zinc-600 shrink-0">Updated {new Date(widget.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
        <span>{widget.kind || 'NOTE'}</span>
        <span>{widget.visualStyle || 'STANDARD'}</span>
      </div>

      <div className={`rounded border p-2.5 space-y-1 overflow-hidden min-h-[5rem] ${bodyStyleClasses(widget)}`}>
        {widget.body ? renderBody(widget) : <div className="text-[12px] text-zinc-600">No widget body content.</div>}
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
          onClick={() => onShareCustomWorkbenchWidget?.(widget.id)}
          title="Copy widget share code"
        >
          <Copy className="w-3.5 h-3.5 mr-1" />
          Share
        </NexusButton>
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => onDuplicateCustomWorkbenchWidget?.(widget.id)}
          title="Duplicate this custom widget"
        >
          <Copy className="w-3.5 h-3.5 mr-1" />
          Duplicate
        </NexusButton>
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
