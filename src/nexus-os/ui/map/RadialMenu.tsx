import React, { useEffect, useMemo, useRef } from 'react';
import { getNexusCssVars } from '../tokens';
import { NexusButton } from '../primitives';
import { transitionStyle, useReducedMotion } from '../motion';

export interface RadialMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
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

export default function RadialMenu({ open, title, anchor, items, onClose }: RadialMenuProps) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeItems = useMemo(() => items.filter(Boolean), [items]);
  const radiusPx = activeItems.length <= 4 ? 78 : 92;

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
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
        left: `${anchor.x}%`,
        top: `${anchor.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      role="menu"
      aria-label={title}
      onKeyDown={onMenuKeyDown}
    >
      <div
        className="relative rounded-full border border-zinc-700 bg-zinc-950/95"
        style={{
          width: '84px',
          height: '84px',
          borderColor: 'var(--nx-border-strong)',
          boxShadow: '0 0 0 1px rgba(179,90,47,0.22), 0 12px 26px rgba(0,0,0,0.5)',
        }}
      >
        <div className="absolute inset-2 rounded-full border border-zinc-800 bg-zinc-900/70 flex items-center justify-center px-2 text-center">
          <span className="text-[10px] uppercase tracking-wide text-zinc-200 leading-tight">{title}</span>
        </div>
        {activeItems.map((item, index) => {
          const angle = angleForIndex(index, activeItems.length);
          const x = Math.cos((angle * Math.PI) / 180) * radiusPx;
          const y = Math.sin((angle * Math.PI) / 180) * radiusPx;
          return (
            <div
              key={item.id}
              className="absolute"
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
              <NexusButton
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                size="sm"
                intent={item.disabled ? 'subtle' : 'primary'}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                }}
                disabled={item.disabled}
                className="h-9 min-w-[96px] px-2 justify-between text-[10px] normal-case tracking-normal"
                role="menuitem"
                title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
              >
                <span className="truncate mr-2">
                  {item.icon ? `${item.icon} ` : ''}
                  {item.label}
                </span>
                {item.shortcut ? <span className="text-[9px] text-zinc-400">{item.shortcut}</span> : null}
              </NexusButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
