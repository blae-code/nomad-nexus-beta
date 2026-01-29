import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden border rounded-lg p-4 shadow-xl backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-orange-500/40 bg-gradient-to-r from-zinc-900/98 to-zinc-950/98 text-zinc-100 shadow-orange-500/10",
        destructive:
          "destructive group border-red-500/40 bg-gradient-to-r from-zinc-900/98 to-zinc-950/98 text-red-300 shadow-red-500/10",
        success:
          "border-green-500/40 bg-gradient-to-r from-zinc-900/98 to-zinc-950/98 text-green-300 shadow-green-500/10",
        info:
          "border-cyan-500/40 bg-gradient-to-r from-zinc-900/98 to-zinc-950/98 text-cyan-300 shadow-cyan-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center border border-orange-500/30 bg-transparent px-3 text-xs font-mono uppercase tracking-wider text-orange-400 transition-all hover:bg-orange-500/10 hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-500/30 group-[.destructive]:text-red-400 group-[.destructive]:hover:border-red-500/50 group-[.destructive]:hover:bg-red-500/10 group-[.destructive]:focus:ring-red-500/50",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-2 top-2 p-1 text-zinc-500 opacity-0 transition-all hover:text-orange-400 hover:bg-orange-500/10 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 group-hover:opacity-100 group-[.destructive]:text-red-500 group-[.destructive]:hover:text-red-400 group-[.destructive]:hover:bg-red-500/10 group-[.destructive]:focus:ring-red-500/50",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-black uppercase tracking-wider text-orange-400", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-zinc-300 font-mono", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};