import * as React from "react"

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border-2 border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 transition-all duration-200 placeholder:text-zinc-600 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-100 hover:border-zinc-600 focus:outline-none focus:border-orange-500 focus:bg-zinc-900 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }