import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 40px default height, 8px radius (developer dialect). Pulse Orange is the
 * only brand action colour and stays scarce: `default` is the primary CTA,
 * `ink` is the heavier download-style CTA, everything else is hairline-only.
 */
const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-[18px] py-2.5 text-sm font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-active",
        ink: "h-11 bg-ink px-5 text-canvas hover:bg-ink/90",
        destructive:
          "border border-destructive bg-transparent text-destructive hover:bg-destructive/5",
        outline:
          "border border-hairline-strong bg-card text-ink hover:bg-canvas-soft",
        secondary:
          "border border-hairline-strong bg-card text-ink hover:bg-canvas-soft",
        ghost: "text-ink hover:bg-canvas-soft",
        link: "h-auto p-0 text-ink underline-offset-4 hover:text-primary hover:underline",
      },
      size: {
        default: "",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
