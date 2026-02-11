import * as React from "react"

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "nexus-control-input flex h-10 w-full rounded-lg border px-3 py-2 text-sm text-zinc-100 transition-all duration-200 placeholder:text-zinc-600 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
