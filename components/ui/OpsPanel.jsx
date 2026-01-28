import { cn } from "@/lib/utils";

export function OpsPanel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 shadow-inner",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function OpsPanelHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "px-3 py-2 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function OpsPanelTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn(
        "text-sm font-bold uppercase tracking-wider text-zinc-200",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function OpsPanelContent({ className, children, ...props }) {
  return (
    <div
      className={cn("p-3 space-y-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function OpsPanelFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "px-3 py-2 border-t border-zinc-800 bg-zinc-950/30 flex items-center justify-between gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}