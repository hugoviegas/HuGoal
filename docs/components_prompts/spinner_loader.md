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
morphing - spinner.tsx;
("use client");

import { cn } from "@/lib/utils";

interface MorphingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MorphingSpinner({
  size = "md",
  className,
}: MorphingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 animate-[smoothMorph_3s_ease-in-out_infinite] bg-primary" />

      <style jsx>{`
        @keyframes smoothMorph {
          0% {
            transform: scale(1) rotate(0deg);
            border-radius: 50%;
          }
          20% {
            transform: scale(0.9) rotate(72deg);
            border-radius: 35%;
          }
          40% {
            transform: scale(1.1) rotate(144deg);
            border-radius: 15%;
          }
          60% {
            transform: scale(0.85) rotate(216deg);
            border-radius: 8%;
          }
          80% {
            transform: scale(1.05) rotate(288deg);
            border-radius: 25%;
          }
          100% {
            transform: scale(1) rotate(360deg);
            border-radius: 50%;
          }
        }
      `}</style>
    </div>
  );
}

demo.tsx;
import { MorphingSpinner } from "@/components/ui/morphing-spinner";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <MorphingSpinner size="lg" />
        <p className="text-lg text-foreground flex gap-1">Loading</p>
      </div>
    </main>
  );
}
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
