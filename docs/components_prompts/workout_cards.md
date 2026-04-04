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
workout - card.tsx;
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming you have a lib/utils.ts for shadcn

// Define the type for a single exercise
export interface Exercise {
  iconSrc: string;
  name: string;
  detail: string;
}

// Define the props for the WorkoutCard component
export interface WorkoutCardProps {
  date: string;
  wodTitle?: string;
  sessionTitle: string;
  sessionDuration: number;
  exercises: Exercise[];
  className?: string;
}

// Animation variants for the list container
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Stagger the animation of children by 0.1s
    },
  },
};

// Animation variants for each list item
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

export const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  (
    {
      date,
      wodTitle = "WOD",
      sessionTitle,
      sessionDuration,
      exercises,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-sm rounded-3xl bg-muted p-2.5 font-sans",
          className,
        )}
      >
        {/* Header section for date and WOD title */}
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{date}</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {wodTitle}
          </h2>
        </div>

        {/* Main content card */}
        <div className="mt-4 w-full rounded-2xl bg-card p-6 shadow-sm">
          {/* Session header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-card-foreground">
              {sessionTitle}
            </h3>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-clock"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{sessionDuration} min</span>
            </div>
          </div>

          {/* Animated exercise list */}
          <motion.ul
            role="list"
            className="mt-6 space-y-3"
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {exercises.map((exercise, index) => (
              <motion.li
                key={index}
                role="listitem"
                className="flex items-center gap-4 rounded-xl bg-muted p-4"
                variants={itemVariants}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ">
                  <img
                    src={exercise.iconSrc}
                    alt={`${exercise.name} icon`}
                    className="h-10 w-10"
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {exercise.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {exercise.detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    );
  },
);

WorkoutCard.displayName = "WorkoutCard";

demo.tsx;
import { WorkoutCard, Exercise } from "@/components/ui/workout-card"; // Adjust the import path as needed

// Sample data for the demo
const warmUpExercises: Exercise[] = [
  {
    iconSrc:
      "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-ZZfiEQIFOGeqPmFDkIYdNbWbSwhGOy.png&w=320&q=75",
    name: "Jumping Jacks",
    detail: "2 minutes",
  },
  {
    iconSrc:
      "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-GM1g71NpPRRnefhKHqhn5fqHXV709G.png&w=320&q=75",
    name: "High Knees",
    detail: "4 minutes",
  },
  {
    iconSrc:
      "https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-rYlgXFYWRAgTR7Ui67Hvg1honG39aV.png&w=320&q=75",
    name: "Bicycle Crunches",
    detail: "20 reps",
  },
];

export default function WorkoutCardDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <WorkoutCard
        date="Wed Jul 17"
        wodTitle="WOD"
        sessionTitle="Warm-Up Session"
        sessionDuration={50}
        exercises={warmUpExercises}
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
