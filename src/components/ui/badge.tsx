import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Small uppercase pill. 11px / 600 / 0.88px tracking, pill radius. */
const badgeVariants = cva(
  "caption-upper inline-flex items-center rounded-full border px-2.5 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-surface-strong text-ink",
        secondary: "border-hairline bg-canvas-soft text-muted",
        destructive: "border-transparent bg-destructive text-on-primary",
        success: "border-transparent bg-success text-on-primary",
        outline: "border-hairline-strong bg-transparent text-ink",
        accent: "border-transparent bg-primary text-on-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
