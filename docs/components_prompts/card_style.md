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
workflow - builder - card.tsx;
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Define the types for the component props for type-safety and reusability
interface User {
  src: string;
  fallback: string;
}

interface Action {
  Icon: React.ElementType;
  bgColor: string;
}

interface CardSection {
  image?: boolean;
  header?: boolean;
  footer?: boolean;
  description?: boolean;
  tags?: boolean;
  users?: boolean;
  actions?: boolean;
  moreButton?: boolean;
}

interface WorkflowBuilderCardProps {
  // Required
  title: string;

  // Optional content
  imageUrl?: string;
  description?: string;
  tags?: string[];
  users?: User[];
  actions?: Action[];
  status?: "Active" | "Inactive";
  lastUpdated?: string;

  // Section control - choose which sections to display
  sections?: CardSection | "full" | "minimal" | "workout";

  // Customization
  showHoverAnimation?: boolean;
  onMoreClick?: () => void;
  className?: string;
}

// Preset configurations for different use cases
const SECTION_PRESETS: Record<string, CardSection> = {
  full: {
    image: true,
    header: true,
    footer: true,
    description: true,
    tags: true,
    users: true,
    actions: true,
    moreButton: true,
  },
  minimal: {
    image: true,
    header: true,
    footer: false,
    description: false,
    tags: false,
    users: false,
    actions: false,
    moreButton: false,
  },
  workout: {
    image: true,
    header: true,
    footer: false,
    description: true,
    tags: true,
    users: false,
    actions: false,
    moreButton: true,
  },
};

export const WorkflowBuilderCard = ({
  title,
  imageUrl,
  description,
  tags = [],
  users = [],
  actions = [],
  status,
  lastUpdated,
  sections = "full",
  showHoverAnimation = true,
  onMoreClick,
  className,
}: WorkflowBuilderCardProps) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // Resolve sections configuration
  const sectionConfig: CardSection =
    typeof sections === "string"
      ? SECTION_PRESETS[sections] || SECTION_PRESETS.full
      : { ...SECTION_PRESETS.full, ...sections };

  // Animation variants for the details section
  const detailVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      marginTop: "1rem",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  const cardContent = (
    <Card className="overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-xl">
      {/* Card Image */}
      {sectionConfig.image && imageUrl && (
        <div className="relative h-36 w-full">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      )}

      {sectionConfig.header && (
        <div className="p-4">
          {/* Always-visible header content */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col flex-1">
              {status && lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{lastUpdated}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        status === "Active" ? "bg-green-500" : "bg-red-500",
                      )}
                      aria-label={status}
                    />
                    <span>{status}</span>
                  </div>
                </div>
              )}
              <h3 className="mt-1 text-lg font-semibold text-card-foreground">
                {title}
              </h3>
            </div>
            {sectionConfig.moreButton && (
              <button
                onClick={onMoreClick}
                aria-label="More options"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <MoreHorizontal size={20} />
              </button>
            )}
          </div>

          {/* Animated description and tags section */}
          {showHoverAnimation ? (
            <AnimatePresence>
              {isHovered &&
                (sectionConfig.description || sectionConfig.tags) && (
                  <motion.div
                    key="details"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={detailVariants}
                    className="overflow-hidden"
                  >
                    {sectionConfig.description && description && (
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                    {sectionConfig.tags && tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          ) : (
            <>
              {sectionConfig.description && description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
              {sectionConfig.tags && tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Card Footer */}
      {sectionConfig.footer && (users.length > 0 || actions.length > 0) && (
        <div className="flex items-center justify-between border-t border-border p-4">
          {sectionConfig.users && users.length > 0 && (
            <div className="flex -space-x-2">
              {users.map((user, index) => (
                <Avatar
                  key={index}
                  className="h-7 w-7 border-2 border-card"
                  aria-label={user.fallback}
                >
                  <AvatarImage src={user.src} />
                  <AvatarFallback>{user.fallback}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          {sectionConfig.actions && actions.length > 0 && (
            <div className="flex items-center -space-x-2">
              {actions.map(({ Icon, bgColor }, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-white",
                    bgColor,
                  )}
                >
                  <Icon size={14} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );

  if (!showHoverAnimation) {
    return (
      <div className={cn("w-full max-w-sm cursor-pointer", className)}>
        {cardContent}
      </div>
    );
  }

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn("w-full max-w-sm cursor-pointer", className)}
    >
      {cardContent}
    </motion.div>
  );
};

demo.tsx;
import { Code, Share2, Zap } from "lucide-react";
import { WorkflowBuilderCard } from "@/components/ui/workflow-builder-card"; // Adjust the import path

export default function WorkflowBuilderCardDemo() {
  const cardData = {
    imageUrl:
      "https://images.unsplash.com/photo-1752154344437-44bd7480e8ee?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDY1fENEd3V3WEpBYkV3fHxlbnwwfHx8fHw%3D&auto=format&fit=crop&q=60&w=900?q=80&w=2940&auto=format&fit=crop",
    status: "Active" as const,
    lastUpdated: "5 days ago",
    title: "Personal Email Assistant",
    description:
      "Your AI helper for reading, organizing, and responding to emails.",
    tags: ["Personal", "Marketing"],
    users: [
      { src: "https://i.pravatar.cc/150?img=1", fallback: "U1" },
      { src: "https://i.pravatar.cc/150?img=2", fallback: "U2" },
      { src: "https://i.pravatar.cc/150?img=3", fallback: "U3" },
      { src: "https://i.pravatar.cc/150?img=4", fallback: "+3" },
    ],
    actions: [
      { Icon: Zap, bgColor: "bg-blue-500" },
      { Icon: Code, bgColor: "bg-gray-700" },
      { Icon: Share2, bgColor: "bg-red-500" },
    ],
  };

  // Example for Workout page - minimal, focused on description and tags
  const workoutCardData = {
    imageUrl:
      "https://images.unsplash.com/photo-1574680096145-6ffee5b27754?ixlib=rb-4.1.0&auto=format&fit=crop&q=60&w=900",
    title: "Chest & Triceps Day",
    description: "Push-focused workout with dumbbells and cable equipment",
    tags: ["Push", "Intermediate", "45min"],
  };

  return (
    <div className="flex flex-col gap-12 bg-background p-8">
      {/* Full preset with all sections */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Full Preset (Workflow)</h2>
        <WorkflowBuilderCard {...cardData} sections="full" />
      </div>

      {/* Minimal preset - just image and title */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Minimal Preset</h2>
        <WorkflowBuilderCard
          {...cardData}
          sections="minimal"
          title="Quick Card"
        />
      </div>

      {/* Workout preset - image, title, description, tags */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Workout Preset</h2>
        <WorkflowBuilderCard
          {...workoutCardData}
          sections="workout"
          showHoverAnimation={false}
        />
      </div>

      {/* Custom configuration - pick exactly what you need */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Custom Configuration</h2>
        <WorkflowBuilderCard
          {...workoutCardData}
          sections={{
            image: true,
            header: true,
            description: true,
            tags: true,
            footer: false,
            users: false,
            actions: false,
            moreButton: false,
          }}
          showHoverAnimation={true}
        />
      </div>
    </div>
  );
}
```

Copy-paste these files for dependencies:

```tsx
shadcn / card;
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
```

```tsx
shadcn / avatar;
("use client");

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
```

```tsx
shadcn / badge;
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

Install NPM dependencies:

```bash
lucide-react, framer-motion, @radix-ui/react-avatar, class-variance-authority
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

## Usage Guide - Modelable Card Component

O componente `WorkflowBuilderCard` agora é **totalmente modelável** e pode ser usado em diferentes contextos. Aqui estão as maneiras de utilizá-lo:

### 1. Usando Presets Pré-definidos

#### Full Preset (Padrão - para Workflows/Processos)

```tsx
<WorkflowBuilderCard
  title="Personal Email Assistant"
  imageUrl="..."
  description="Your AI helper for reading..."
  tags={["Personal", "Marketing"]}
  users={[...]}
  actions={[...]}
  status="Active"
  lastUpdated="5 days ago"
  sections="full"
/>
```

#### Minimal Preset (Apenas imagem e título)

```tsx
<WorkflowBuilderCard title="Quick Card" imageUrl="..." sections="minimal" />
```

#### Workout Preset (NOVO - Para página de workouts)

```tsx
<WorkflowBuilderCard
  title="Chest & Triceps Day"
  imageUrl="..."
  description="Push-focused workout with dumbbells"
  tags={["Push", "Intermediate", "45min"]}
  sections="workout"
  showHoverAnimation={false}
/>
```

### 2. Configuração Customizada

Escolha exatamente quais seções deseja exibir:

```tsx
<WorkflowBuilderCard
  title="Custom Workout"
  imageUrl="..."
  description="..."
  tags={["Tag1", "Tag2"]}
  sections={{
    image: true,
    header: true,
    description: true,
    tags: true,
    footer: false,
    users: false,
    actions: false,
    moreButton: false,
  }}
  showHoverAnimation={true}
  onMoreClick={() => console.log("More clicked")}
/>
```

### 3. Controle de Animação

```tsx
// Com animação ao hover (descrição e tags aparecem)
<WorkflowBuilderCard
  sections="workout"
  showHoverAnimation={true}
/>

// Sem animação (sempre visível)
<WorkflowBuilderCard
  sections="minimal"
  showHoverAnimation={false}
/>
```

### Props disponíveis:

| Prop                 | Tipo                                            | Padrão    | Descrição                        |
| -------------------- | ----------------------------------------------- | --------- | -------------------------------- |
| `title`              | string                                          | -         | **Obrigatório** - Título do card |
| `imageUrl`           | string                                          | undefined | URL da imagem                    |
| `description`        | string                                          | undefined | Descrição/texto adicional        |
| `tags`               | string[]                                        | []        | Lista de tags/badges             |
| `users`              | User[]                                          | []        | Avatares de usuários             |
| `actions`            | Action[]                                        | []        | Ações/ícones no footer           |
| `status`             | "Active" \| "Inactive"                          | undefined | Status do item                   |
| `lastUpdated`        | string                                          | undefined | Data de última atualização       |
| `sections`           | "full" \| "minimal" \| "workout" \| CardSection | "full"    | Qual preset usar                 |
| `showHoverAnimation` | boolean                                         | true      | Ativar animação ao hover         |
| `onMoreClick`        | function                                        | -         | Callback do botão "mais opções"  |
| `className`          | string                                          | -         | Classes Tailwind customizadas    |

### Como Usar na Página de Workouts

```tsx
// Em app/(tabs)/workouts/index.tsx ou similar

import { WorkflowBuilderCard } from "@/components/ui/workflow-builder-card";

export default function WorkoutsList() {
  const workouts = [
    {
      id: 1,
      title: "Push Day - Chest & Triceps",
      imageUrl:
        "https://images.unsplash.com/photo-1574680096145-6ffee5b27754?...",
      description: "Compound movements with dumbbells and cables",
      tags: ["Push", "Intermediate", "50 min"],
    },
    // ... mais workouts
  ];

  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <WorkflowBuilderCard
          key={workout.id}
          title={workout.title}
          imageUrl={workout.imageUrl}
          description={workout.description}
          tags={workout.tags}
          sections="workout"
          showHoverAnimation={false}
        />
      ))}
    </div>
  );
}
```
