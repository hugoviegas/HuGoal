You are given a task to integrate an existing React component in the codebase

The codebase should support:

- shadcn project structure
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles.
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:

```tsx
toast.tsx;
("use client");

import { forwardRef, useImperativeHandle, useRef } from "react";
import { motion } from "framer-motion";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error" | "warning";
type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface ToasterProps {
  title?: string;
  message: string;
  variant?: Variant;
  duration?: number;
  position?: Position;
  actions?: ActionButton;
  onDismiss?: () => void;
  highlightTitle?: boolean;
}

export interface ToasterRef {
  show: (props: ToasterProps) => void;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-card border-border text-foreground",
  success: "bg-card border-green-600/50",
  error: "bg-card border-destructive/50",
  warning: "bg-card border-amber-600/50",
};

const titleColor: Record<Variant, string> = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

const iconColor: Record<Variant, string> = {
  default: "text-muted-foreground",
  success: "text-green-600 dark:text-green-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

const variantIcons: Record<
  Variant,
  React.ComponentType<{ className?: string }>
> = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

const Toaster = forwardRef<ToasterRef, { defaultPosition?: Position }>(
  ({ defaultPosition = "bottom-right" }, ref) => {
    const toastReference = useRef<ReturnType<typeof sonnerToast.custom> | null>(
      null,
    );

    useImperativeHandle(ref, () => ({
      show({
        title,
        message,
        variant = "default",
        duration = 4000,
        position = defaultPosition,
        actions,
        onDismiss,
        highlightTitle,
      }) {
        const Icon = variantIcons[variant];

        toastReference.current = sonnerToast.custom(
          (toastId) => (
            <motion.div
              variants={toastAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "flex items-center justify-between w-full max-w-xs p-3 rounded-xl border shadow-md",
                variantStyles[variant],
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    "h-4 w-4 mt-0.5 flex-shrink-0",
                    iconColor[variant],
                  )}
                />
                <div className="space-y-0.5">
                  {title && (
                    <h3
                      className={cn(
                        "text-xs font-medium leading-none",
                        titleColor[variant],
                        highlightTitle && titleColor["success"], // override for meeting case
                      )}
                    >
                      {title}
                    </h3>
                  )}
                  <p className="text-xs text-muted-foreground">{message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {actions?.label && (
                  <Button
                    variant={actions.variant || "outline"}
                    size="sm"
                    onClick={() => {
                      actions.onClick();
                      sonnerToast.dismiss(toastId);
                    }}
                    className={cn(
                      "cursor-pointer",
                      variant === "success"
                        ? "text-green-600 border-green-600 hover:bg-green-600/10 dark:hover:bg-green-400/20"
                        : variant === "error"
                          ? "text-destructive border-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                          : variant === "warning"
                            ? "text-amber-600 border-amber-600 hover:bg-amber-600/10 dark:hover:bg-amber-400/20"
                            : "text-foreground border-border hover:bg-muted/10 dark:hover:bg-muted/20",
                    )}
                  >
                    {actions.label}
                  </Button>
                )}

                <button
                  onClick={() => {
                    sonnerToast.dismiss(toastId);
                    onDismiss?.();
                  }}
                  className="rounded-full p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          ),
          { duration, position },
        );
      },
    }));

    return (
      <SonnerToaster
        position={defaultPosition}
        toastOptions={{ unstyled: true, className: "flex justify-end" }}
      />
    );
  },
);

export default Toaster;

demo.tsx;
("use client");

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import Toaster, { ToasterRef } from "@/components/ui/toast";

type Variant = "default" | "success" | "error" | "warning";
type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export default function ToasterDemo() {
  const toasterRef = useRef<ToasterRef>(null);

  const showToast = (variant: Variant, position: Position = "bottom-right") => {
    toasterRef.current?.show({
      title: `${variant.charAt(0).toUpperCase() + variant.slice(1)} Notification`,
      message: `This is a ${variant} toast notification.`,
      variant,
      position,
      duration: 3000,
      onDismiss: () => console.log(`${variant} toast at ${position} dismissed`),
    });
  };

  const simulateApiCall = async () => {
    toasterRef.current?.show({
      title: "Scheduling...",
      message: "Please wait while we schedule your meeting.",
      variant: "default",
      position: "bottom-right",
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toasterRef.current?.show({
        title: "Meeting Scheduled",
        message: "Your meeting is scheduled for July 4, 2025, at 3:42 PM IST.",
        variant: "success",
        position: "bottom-right",
        highlightTitle: true,
        actions: {
          label: "Undo",
          onClick: () => console.log("Undoing meeting schedule"),
          variant: "outline",
        },
      });
    } catch (error) {
      toasterRef.current?.show({
        title: "Error Scheduling Meeting",
        message: "Failed to schedule the meeting. Please try again.",
        variant: "error",
        position: "bottom-right",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toaster ref={toasterRef} />

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">Toast Variants</h2>
          <div className="flex flex-wrap gap-4">
            {["default", "success", "error", "warning"].map((variantKey) => (
              <Button
                key={variantKey}
                variant="outline"
                onClick={() => showToast(variantKey as Variant)}
                className={`border-${
                  variantKey === "default" ? "border" : variantKey
                }-600 text-${
                  variantKey === "default" ? "foreground" : variantKey
                }-600 hover:bg-${variantKey}-600/10 dark:hover:bg-${variantKey}-400/20`}
              >
                {variantKey.charAt(0).toUpperCase() + variantKey.slice(1)} Toast
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Toast Positions</h2>
          <div className="flex flex-wrap gap-4">
            {[
              "top-left",
              "top-center",
              "top-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ].map((positionKey) => (
              <Button
                key={positionKey}
                variant="outline"
                onClick={() => showToast("default", positionKey as Position)}
                className="border-border text-foreground hover:bg-muted/10 dark:hover:bg-muted/20"
              >
                {positionKey
                  .replace("-", " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Real‑World Example</h2>
          <Button
            variant="outline"
            onClick={simulateApiCall}
            className="border-border text-foreground hover:bg-muted/10 dark:hover:bg-muted/20"
          >
            Schedule Meeting
          </Button>
        </section>
      </div>
    </div>
  );
}
```

Copy-paste these files for dependencies:

```tsx
shadcn / button;
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

Install NPM dependencies:

```bash
sonner, lucide-react, framer-motion, @radix-ui/react-slot, class-variance-authority
```

Implementation Guidelines

1.  Analyze the component structure and identify all required dependencies
2.  Review the component's argumens and state
3.  Identify any required context providers or hooks and install them
4.  Questions to Ask

- What data/props will be passed to this component?
- Are there any specific state management requirements?
- Are there any required assets (images, icons, etc.)?
- What is the expected responsive behavior?
- What is the best place to use this component in the app?

Steps to integrate 0. Copy paste all the code above in the correct directories

1.  Install external dependencies
2.  Fill image assets with Unsplash stock images you know exist
3.  Use lucide-react icons for svgs or logos if component requires them
