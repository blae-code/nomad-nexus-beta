import { cn } from '@/lib/utils';
import { HEADER_BASE_CLASS, HEADER_SURFACE_STYLE } from '@/components/layout/headerStyles';

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  iconContainerClassName = '',
  actions,
  rightSlot,
  className = '',
  style,
  children,
}) {
  return (
    <div
      className={cn(HEADER_BASE_CLASS, 'flex items-center px-[var(--gutter)]', className)}
      style={{ ...HEADER_SURFACE_STYLE, ...style }}
    >
      {children ? (
        children
      ) : (
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center border border-zinc-800/70 bg-zinc-900/60 text-[#ea580c] shrink-0',
                  iconContainerClassName
                )}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                  {eyebrow}
                </div>
              )}
              {title && (
                <h1 className="text-sm font-black uppercase tracking-wider text-white truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-[10px] font-mono text-zinc-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {(actions || rightSlot) && (
            <div className="flex items-center gap-3 shrink-0">
              {actions && <div className="flex items-center gap-2">{actions}</div>}
              {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
