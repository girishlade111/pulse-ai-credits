import * as React from "react"

import { cn } from "@/lib/utils"

/** 44px height, 12/16 padding, 8px radius, white on cream. */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-hairline-strong bg-card px-4 py-3 text-base text-ink transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-muted-soft focus-visible:border-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
