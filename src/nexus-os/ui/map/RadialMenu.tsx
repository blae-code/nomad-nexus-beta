import React, { useEffect, useMemo, useRef } from 'react';
import { getNexusCssVars } from '../tokens';
import { transitionStyle, useReducedMotion } from '../motion';
import { TacticalRadialIcon, type TacticalRadialIconId } from './tacticalGlyphs';

export interface RadialMenuItem {
  id: string;
  label: string;
  icon?: TacticalRadialIconId;
  shortcut?: string;
  tone?: 'standard' | 'warning' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

interface RadialMenuProps {
  open: boolean;
  title: string;
  anchor: { x: number; y: number };
  items: RadialMenuItem[];
  onClose: () => void;
}

function angleForIndex(index: number, total: number): number {
  if (total <= 1) return -90;
  return -90 + (index * 360) / total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampAnchor(anchor: { x: number; y: number }, totalItems: number): { x: number; y: number } {
  const guard = totalItems >= 6 ? 18 : totalItems >= 4 ? 15 : 13;
  return {
    x: clamp(anchor.x, guard, 100 - guard),
    y: clamp(anchor.y, guard, 100 - guard),
  };
}

export default function RadialMenu({ open, title, anchor, items, onClose }: RadialMenuProps) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeItems = useMemo(() => items.filter(Boolean), [items]);
  const radiusPx = activeItems.length <= 3 ? 70 : activeItems.length <= 5 ? 82 : 94;
  const clampedAnchor = useMemo(
    () => clampAnchor(anchor, activeItems.length),
    [anchor, activeItems.length]
  );

  useEffect(() => {
    if (!open) return;
    const first = buttonRefs.current[0];
    if (first) first.focus();
  }, [open, activeItems.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      const shortcutItem = activeItems.find((item) => item.shortcut && item.shortcut === event.key);
      if (shortcutItem && !shortcutItem.disabled) {
        event.preventDefault();
        shortcutItem.onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, activeItems]);

  if (!open || activeItems.length === 0) return null;

  const onMenuKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = buttonRefs.current.findIndex((entry) => entry === document.activeElement);
    if (currentIndex === -1) {
      buttonRefs.current[0]?.focus();
      return;
    }
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = (currentIndex + direction + activeItems.length) % activeItems.length;
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-[30]"
      style={{
        ...vars,
        ...transitionStyle({
          preset: 'radial',
          reducedMotion,
          properties: 'opacity, transform',
        }),
        left: `${clampedAnchor.x}%`,
        top: `${clampedAnchor.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      role="menu"
      aria-label={title}
      onKeyDown={onMenuKeyDown}
    >
      <div className="nexus-map-radial-shell" data-open={open ? 'true' : 'false'}>
        <svg aria-hidden="true" viewBox="0 0 100 100" className="nexus-map-radial-spokes">
          <circle cx="50" cy="50" r="35" />
          {activeItems.map((item, index) => {
            const angle = angleForIndex(index, activeItems.length);
            const toX = 50 + Math.cos((angle * Math.PI) / 180) * 35;
            const toY = 50 + Math.sin((angle * Math.PI) / 180) * 35;
            return <line key={`spoke:${item.id}`} x1="50" y1="50" x2={toX} y2={toY} />;
          })}
        </svg>
        <div className="nexus-map-radial-core">
          <span className="nexus-map-radial-core-title">{title}</span>
          <span className="nexus-map-radial-core-subtitle">Esc to close</span>
        </div>
        {activeItems.map((item, index) => {
          const angle = angleForIndex(index, activeItems.length);
          const x = Math.cos((angle * Math.PI) / 180) * radiusPx;
          const y = Math.sin((angle * Math.PI) / 180) * radiusPx;
          return (
            <div
              key={item.id}
              className="absolute nexus-map-radial-slot"
                style={{
                  ...transitionStyle({
                    preset: 'radial',
                    reducedMotion,
                    properties: 'opacity, transform',
                    delayMs: index * 8,
                  }),
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
            >
              <button
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                }}
                type="button"
                disabled={item.disabled}
                className="nexus-map-radial-item"
                data-tone={item.tone || 'standard'}
                aria-disabled={item.disabled ? 'true' : undefined}
                role="menuitem"
                title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
              >
                <span className="nexus-map-radial-item-icon">
                  <TacticalRadialIcon id={item.icon} className="h-4 w-4" />
                </span>
                {item.shortcut ? <span className="nexus-map-radial-item-shortcut">{item.shortcut}</span> : null}
              </button>
              <span className="nexus-map-radial-item-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
