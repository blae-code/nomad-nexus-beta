import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-orange-600 text-white font-black uppercase tracking-wider hover:bg-orange-500 active:bg-orange-700 border-2 border-orange-500/50 hover:border-orange-400",
        destructive:
          "bg-red-600 text-white font-black uppercase tracking-wider hover:bg-red-500 active:bg-red-700 border-2 border-red-500/50",
        outline:
          "border-2 border-zinc-700 bg-zinc-950/90 text-zinc-200 font-bold uppercase tracking-wide hover:border-orange-500 hover:bg-zinc-900 active:bg-zinc-800",
        secondary:
          "bg-zinc-800 text-zinc-100 font-bold uppercase tracking-wide hover:bg-zinc-700 active:bg-zinc-600 border-2 border-zinc-700",
        ghost: "text-zinc-400 hover:bg-zinc-900/60 hover:text-orange-400 active:bg-zinc-800",
        link: "text-orange-500 underline-offset-4 hover:underline hover:text-orange-400 font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }