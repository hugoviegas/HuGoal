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
progress - card.tsx;
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assumes you have a 'cn' utility from shadcn

/**
 * @interface AnimatedProgressCardProps
 * @description Defines the props for the AnimatedProgressCard component.
 * @property {React.ReactNode} icon - The icon to be displayed at the top of the card.
 * @property {string} title - The main title or goal description.
 * @property {string} progressLabel - The label for the progress section (e.g., "Your Progress").
 * @property {string} progressSubLabel - A secondary label under the progress label (e.g., "Since 20 days ago").
 * @property {number} currentValue - The current value of the progress.
 * @property {number} maxValue - The maximum value for the progress calculation.
 * @property {string} [className] - Optional additional CSS classes for custom styling.
 */
export interface AnimatedProgressCardProps {
  icon: React.ReactNode;
  title: string;
  progressLabel: string;
  progressSubLabel: string;
  currentValue: number;
  maxValue: number;
  className?: string;
}

/**
 * A visually polished card for displaying progress with a smooth animation.
 * It's theme-adaptive, responsive, and reusable.
 */
export const AnimatedProgressCard = React.forwardRef<
  HTMLDivElement,
  AnimatedProgressCardProps
>(
  (
    {
      icon,
      title,
      progressLabel,
      progressSubLabel,
      currentValue,
      maxValue,
      className,
    },
    ref,
  ) => {
    // Calculate the percentage, ensuring it doesn't exceed 100%
    const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;
    const clampedPercentage = Math.min(percentage, 100);

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-sm rounded-xl border bg-primary p-6 text-primary-foreground shadow-lg",
          className,
        )}
      >
        {/* Header section with icon and title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
            {icon}
          </div>
          <p className="font-medium">{title}</p>
        </div>

        {/* Progress bar section with animation */}
        <div className="my-5">
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-primary-foreground/20"
            role="progressbar"
            aria-valuenow={currentValue}
            aria-valuemin={0}
            aria-valuemax={maxValue}
            aria-label={title}
          >
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-primary-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercentage}%` }}
              transition={{
                duration: 1.2,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        {/* Footer section with progress details */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
              {progressLabel}
            </p>
            <p className="text-sm text-primary-foreground/60">
              {progressSubLabel}
            </p>
          </div>
          <p className="text-2xl font-bold">
            {currentValue}
            <span className="text-lg font-medium text-primary-foreground/80">
              {" "}
              / {maxValue}
            </span>
          </p>
        </div>
      </div>
    );
  },
);

AnimatedProgressCard.displayName = "AnimatedProgressCard";

demo.tsx;
import { AnimatedProgressCard } from "@/components/ui/progress-card";
import { Timer, Code2 } from "lucide-react"; // Example icons

/**
 * A demo page to showcase the AnimatedProgressCard component.
 */
export default function AnimatedProgressCardDemo() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-background p-4">
      {/* Example 1: Running Progress (from the image) */}
      <AnimatedProgressCard
        title="Running last week"
        icon={<Timer className="h-5 w-5 text-primary-foreground" />}
        progressLabel="Your Progress"
        progressSubLabel="Since 20 days ago"
        currentValue={152}
        maxValue={160}
      />
    </div>
  );
}
```

Install NPM dependencies:

```bash
framer-motion
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
