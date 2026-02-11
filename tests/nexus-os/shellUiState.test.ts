import { describe, expect, it, vi } from 'vitest';
import {
  normalizeShellUIState,
  readShellUIState,
} from '../../src/components/providers/ShellUIContext.jsx';

describe('Shell UI state persistence', () => {
  it('normalizes legacy or malformed dock mode values', () => {
    const normalized = normalizeShellUIState({
      dockMode: 'legacy',
      isCommsDockOpen: 'yes',
      isContextPanelOpen: 0,
    } as unknown as Record<string, unknown>);

    expect(normalized.dockMode).toBe('voice');
    expect(normalized.isCommsDockOpen).toBe(true);
    expect(normalized.isContextPanelOpen).toBe(false);
  });

  it('reads stored state and falls back safely on invalid JSON', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validStorage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          dockMode: 'text',
          isCommsDockOpen: true,
          dockMinimized: true,
        }),
      ),
    };

    const valid = readShellUIState(validStorage as unknown as Storage);
    expect(valid.dockMode).toBe('text');
    expect(valid.isCommsDockOpen).toBe(true);
    expect(valid.dockMinimized).toBe(true);

    const invalidStorage = {
      getItem: vi.fn(() => '{bad-json'),
    };

    const fallback = readShellUIState(invalidStorage as unknown as Storage);
    expect(fallback.dockMode).toBe('voice');
    expect(fallback.isCommsDockOpen).toBe(false);
    expect(fallback.isContextPanelOpen).toBe(true);

    warnSpy.mockRestore();
  });
});
