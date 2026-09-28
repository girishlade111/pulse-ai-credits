import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/** Hairline-only toasts on the cream canvas — no glow, no shadow. Anchored to
 *  the top so it never collides with the bottom-anchored composer. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      offset={72}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-hairline-strong group-[.toaster]:bg-card group-[.toaster]:font-sans group-[.toaster]:text-ink group-[.toaster]:text-sm",
          title: "group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:text-on-primary",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:border group-[.toaster]:border-hairline group-[.toast]:text-muted",
          error: "group-[.toaster]:text-destructive",
          success: "group-[.toaster]:text-success",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
