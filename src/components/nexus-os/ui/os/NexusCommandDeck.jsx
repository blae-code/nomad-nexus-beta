import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Command, History, Sparkles, TerminalSquare, X, Zap } from 'lucide-react';
import { NexusButton } from '../primitives';
import NexusTutorialSystem from '../tutorial/NexusTutorialSystem';

const CATALOG_PAGE_SIZE = 6;
const OUTPUT_PAGE_SIZE = 4;
const HISTORY_PAGE_SIZE = 4;

const DEFAULT_CATALOG = [
  { id: 'help', label: 'Help', command: 'help', detail: 'Show supported command syntax.' },
  { id: 'tutorial', label: 'Tutorials', command: 'tutorial', detail: 'Open interactive training modules.' },
  { id: 'status', label: 'System Status', command: 'status', detail: 'Show bridge/link/focus status.' },
  { id: 'open-map', label: 'Focus Map', command: 'open map', detail: 'Open tactical map focus mode.' },
  { id: 'open-ops', label: 'Focus Ops', command: 'open ops', detail: 'Open operations focus mode.' },
  { id: 'open-comms', label: 'Focus Comms', command: 'open comms', detail: 'Open comms focus mode.' },
  { id: 'bridge', label: 'Bridge Info', command: 'bridge', detail: 'Show available bridge IDs.' },
  { id: 'bridge-next', label: 'Bridge Next', command: 'bridge next', detail: 'Cycle to next bridge profile.' },
  { id: 'close', label: 'Standby Focus', command: 'close', detail: 'Return focused app to standby.' },
];

function toTimestampLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function NexusCommandDeck({
  open,
  onClose,
  onRunCommand,
  commandCatalog = DEFAULT_CATALOG,
  contextSummary = 'Execute workspace controls and bridge commands.',
  suggestedTutorial = null,
}) {
  const inputRef = useRef(null);
  const [command, setCommand] = useState('');
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [catalogPage, setCatalogPage] = useState(0);
  const [outputPage, setOutputPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [showTutorials, setShowTutorials] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCommand('');
    setHistoryCursor(-1);
    setCatalogPage(0);
    setOutputPage(0);
    setHistoryPage(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  const normalizedCatalog = useMemo(() => {
    if (!Array.isArray(commandCatalog) || commandCatalog.length === 0) return DEFAULT_CATALOG;
    return commandCatalog.slice(0, 18);
  }, [commandCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = command.trim().toLowerCase();
    if (!query) return normalizedCatalog;
    const startsWith = normalizedCatalog.filter((entry) => entry.command.toLowerCase().startsWith(query));
    const includes = normalizedCatalog.filter(
      (entry) =>
        !startsWith.some((candidate) => candidate.id === entry.id) &&
        `${entry.label} ${entry.command} ${entry.detail || ''}`.toLowerCase().includes(query)
    );
    return [...startsWith, ...includes];
  }, [command, normalizedCatalog]);

  const catalogPageCount = Math.max(1, Math.ceil(filteredCatalog.length / CATALOG_PAGE_SIZE));
  const outputPageCount = Math.max(1, Math.ceil(results.length / OUTPUT_PAGE_SIZE));
  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));

  useEffect(() => {
    setCatalogPage((prev) => Math.min(prev, catalogPageCount - 1));
  }, [catalogPageCount]);

  useEffect(() => {
    setOutputPage((prev) => Math.min(prev, outputPageCount - 1));
  }, [outputPageCount]);

  useEffect(() => {
    setHistoryPage((prev) => Math.min(prev, historyPageCount - 1));
  }, [historyPageCount]);

  const visibleCatalog = useMemo(
    () => filteredCatalog.slice(catalogPage * CATALOG_PAGE_SIZE, catalogPage * CATALOG_PAGE_SIZE + CATALOG_PAGE_SIZE),
    [filteredCatalog, catalogPage]
  );

  const visibleResults = useMemo(
    () => results.slice(outputPage * OUTPUT_PAGE_SIZE, outputPage * OUTPUT_PAGE_SIZE + OUTPUT_PAGE_SIZE),
    [results, outputPage]
  );

  const visibleHistory = useMemo(
    () => history.slice(historyPage * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE),
    [history, historyPage]
  );

  const executeCommand = (nextCommand) => {
    const payload = String(nextCommand ?? command).trim();
    if (!payload) return;

    if (payload === 'tutorial' || payload === 'tutorials') {
      setShowTutorials(true);
      setCommand('');
      return;
    }

    const result = String(onRunCommand(payload) || '');
    const timestamp = toTimestampLabel();

    setResults((prev) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, command: payload, result, timestamp }, ...prev].slice(0, 16));
    setHistory((prev) => [payload, ...prev.filter((entry) => entry !== payload)].slice(0, 16));
    setHistoryCursor(-1);
    setOutputPage(0);
    setHistoryPage(0);
    setCommand('');
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      executeCommand();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowUp' && history.length > 0) {
      event.preventDefault();
      const nextCursor = Math.min(history.length - 1, historyCursor + 1);
      setHistoryCursor(nextCursor);
      setCommand(history[nextCursor] || '');
      return;
    }
    if (event.key === 'ArrowDown' && history.length > 0) {
      event.preventDefault();
      const nextCursor = historyCursor - 1;
      if (nextCursor < 0) {
        setHistoryCursor(-1);
        setCommand('');
        return;
      }
      setHistoryCursor(nextCursor);
      setCommand(history[nextCursor] || '');
    }
  };

  if (!open) return null;

  return (
    <div className="nx-command-deck-backdrop" onClick={onClose}>
      <section className="nx-command-deck nexus-panel-glow" onClick={(event) => event.stopPropagation()}>
        <header className="nx-command-deck-header">
          <div className="nx-command-deck-title-wrap">
            <span className="nx-command-deck-mark">
              <Command className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="nx-command-deck-title">Nexus Command Deck</h3>
              <p className="nx-command-deck-context">{contextSummary}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="nx-command-deck-close" title="Close command deck (Esc)">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="nx-command-deck-input-wrap">
          <div className="nx-command-deck-input-shell">
            <TerminalSquare className="w-4 h-4 text-orange-300" />
            <input
              ref={inputRef}
              value={command}
              onChange={(event) => {
                setCommand(event.target.value);
                setHistoryCursor(-1);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command... (help, status, open map, bridge next)"
              className="nx-command-deck-input"
            />
          </div>
          <NexusButton size="sm" intent="primary" onClick={() => executeCommand()} className="nx-command-deck-run">
            <Zap className="w-3.5 h-3.5 mr-1" />
            Run
          </NexusButton>
        </div>

        <div className="nx-command-deck-hints">
          <span>Enter run</span>
          <span>Up/Down history</span>
          <span>Esc close</span>
        </div>

        <div className="nx-command-deck-content">
          <section className="nx-command-block">
            <div className="nx-command-block-head">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-300" />
                <span>Suggested Commands</span>
              </div>
              <span>{filteredCatalog.length}</span>
            </div>
            <div className="nx-command-catalog-grid">
              {visibleCatalog.length > 0 ? (
                visibleCatalog.map((item) => (
                  <button key={item.id} type="button" className="nx-command-catalog-item" onClick={() => executeCommand(item.command)}>
                    <span className="nx-command-catalog-label">{item.label}</span>
                    <span className="nx-command-catalog-command">{item.command}</span>
                    <span className="nx-command-catalog-detail">{item.detail || 'Execute command'}</span>
                  </button>
                ))
              ) : (
                <div className="nx-command-empty">No command matches current input.</div>
              )}
            </div>
            {catalogPageCount > 1 ? (
              <div className="nx-command-pager">
                <button type="button" onClick={() => setCatalogPage((prev) => Math.max(0, prev - 1))} disabled={catalogPage === 0}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{catalogPage + 1}/{catalogPageCount}</span>
                <button
                  type="button"
                  onClick={() => setCatalogPage((prev) => Math.min(catalogPageCount - 1, prev + 1))}
                  disabled={catalogPage >= catalogPageCount - 1}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : null}
          </section>

          <section className="nx-command-block">
            <div className="nx-command-block-head">
              <div className="flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-orange-300" />
                <span>Execution Feed</span>
              </div>
              <span>{results.length}</span>
            </div>
            <div className="nx-command-output-list">
              {visibleResults.length > 0 ? (
                visibleResults.map((entry) => (
                  <div key={entry.id} className="nx-command-output-item">
                    <div className="nx-command-output-row">
                      <span className="nx-command-output-time">{entry.timestamp}</span>
                      <span className="nx-command-output-command">{entry.command}</span>
                    </div>
                    <div className="nx-command-output-result">{entry.result}</div>
                  </div>
                ))
              ) : (
                <div className="nx-command-empty">Run a command to see execution feedback.</div>
              )}
            </div>
            {outputPageCount > 1 ? (
              <div className="nx-command-pager">
                <button type="button" onClick={() => setOutputPage((prev) => Math.max(0, prev - 1))} disabled={outputPage === 0}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{outputPage + 1}/{outputPageCount}</span>
                <button
                  type="button"
                  onClick={() => setOutputPage((prev) => Math.min(outputPageCount - 1, prev + 1))}
                  disabled={outputPage >= outputPageCount - 1}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : null}

            <div className="nx-command-history-strip">
              {visibleHistory.length > 0 ? (
                visibleHistory.map((entry) => (
                  <button key={`${entry}:history`} type="button" className="nx-command-history-chip" onClick={() => setCommand(entry)}>
                    {entry}
                  </button>
                ))
              ) : (
                <span className="nx-command-history-empty">No recent command history.</span>
              )}
            </div>
            {historyPageCount > 1 ? (
              <div className="nx-command-pager">
                <button type="button" onClick={() => setHistoryPage((prev) => Math.max(0, prev - 1))} disabled={historyPage === 0}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{historyPage + 1}/{historyPageCount}</span>
                <button
                  type="button"
                  onClick={() => setHistoryPage((prev) => Math.min(historyPageCount - 1, prev + 1))}
                  disabled={historyPage >= historyPageCount - 1}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <NexusTutorialSystem 
          open={showTutorials} 
          onClose={() => setShowTutorials(false)}
          autoSuggestModule={suggestedTutorial}
        />
      </section>
    </div>
  );
}