
import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50",
  {
    variants: {
      variant: {
        default:
          "border-orange-500/60 bg-orange-600/20 text-orange-300 hover:bg-orange-600/30 hover:border-orange-500",
        secondary:
          "border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-600",
        destructive:
          "border-red-500/60 bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:border-red-500",
        outline: "text-zinc-300 border-zinc-700 hover:text-white hover:border-zinc-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Badge = React.forwardRef(({
  className,
  variant,
  ...props
}, ref) => (
  <div 
    ref={ref}
    className={cn(badgeVariants({ variant }), className)} 
    {...props} 
  />
));

Badge.displayName = "Badge";

export { Badge, badgeVariants }
