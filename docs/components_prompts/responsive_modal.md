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
modal.tsx;
("use client");

import React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const ModalContext = React.createContext<{ isMobile: boolean } | null>(null);

function useContext() {
  const context = React.useContext(ModalContext);
  if (!context) {
    throw new Error("Trigger or Content must be used within <Modal>");
  }
  return context;
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  dialogProps?: React.ComponentProps<typeof Dialog>;
  drawerProps?: React.ComponentProps<typeof Drawer>;
};

const Modal = ({
  dialogProps,
  open,
  onOpenChange,
  drawerProps,
  children,
}: ModalProps) => {
  const isMobile = useIsMobile();
  const Component = isMobile ? Drawer : Dialog;
  const props = isMobile ? drawerProps : dialogProps;

  return (
    <ModalContext.Provider value={{ isMobile }}>
      <Component open={open} onOpenChange={onOpenChange} {...props}>
        {children}
      </Component>
    </ModalContext.Provider>
  );
};

type ModalTriggerProps = {
  className?: string;
  children: React.ReactNode;
  asChild?: boolean;
  drawerProps?: React.ComponentProps<typeof DrawerTrigger>;
  popoverProps?: React.ComponentProps<typeof DialogTrigger>;
};

const ModalTrigger = ({
  className,
  children,
  asChild,
  drawerProps,
  popoverProps,
}: ModalTriggerProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerTrigger : DialogTrigger;
  const props = isMobile ? drawerProps : popoverProps;

  return (
    <Component className={className} asChild={asChild} {...props}>
      {children}
    </Component>
  );
};

type ModalCloseProps = {
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  drawerProps?: React.ComponentProps<typeof DrawerClose>;
  popoverProps?: React.ComponentProps<typeof DialogClose>;
};

const ModalClose = ({
  className,
  children,
  asChild,
  drawerProps,
  popoverProps,
}: ModalCloseProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerClose : DialogClose;
  const props = isMobile ? drawerProps : popoverProps;

  return (
    <Component className={className} asChild={asChild} {...props}>
      {children}
    </Component>
  );
};

type ModalContentProps = {
  children: React.ReactNode;
  className?: string;
  drawerProps?: React.ComponentProps<typeof DrawerContent>;
  popoverProps?: React.ComponentProps<typeof DialogContent>;
};

const ModalContent = ({
  className,
  children,
  drawerProps,
  popoverProps,
}: ModalContentProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerContent : DialogContent;
  const props = isMobile ? drawerProps : popoverProps;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ModalHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerHeader : DialogHeader;

  return <Component className={className} {...props} />;
};

type ModalTitleProps = {
  className?: string;
  children: React.ReactNode;
  drawerProps?: React.ComponentProps<typeof DrawerTitle>;
  popoverProps?: React.ComponentProps<typeof DialogTitle>;
};

const ModalTitle = ({
  className,
  children,
  drawerProps,
  popoverProps,
}: ModalTitleProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerTitle : DialogTitle;
  const props = isMobile ? drawerProps : popoverProps;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

type ModalDescriptionProps = {
  className?: string;
  children: React.ReactNode;
  drawerProps?: React.ComponentProps<typeof DrawerDescription>;
  popoverProps?: React.ComponentProps<typeof DialogDescription>;
};

const ModalDescription = ({
  className,
  children,
  drawerProps,
  popoverProps,
}: ModalDescriptionProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerDescription : DialogDescription;
  const props = isMobile ? drawerProps : popoverProps;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ModalBody = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div className={cn("px-4 py-6", className)} {...props} />;
};
const ModalFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerFooter : DialogFooter;
  return <Component className={className} {...props} />;
};

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
};

demo.tsx;
("use client");

import React from "react";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-media-query";

function Preview() {
  const [open, setOpen] = React.useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger>
        <Button variant="outline">Open Modal</Button>
      </ModalTrigger>
      <ModalContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Form submitted!");
          }}
        >
          <ModalHeader>
            <ModalTitle>Edit Profile</ModalTitle>
            <ModalDescription>Update your name and username.</ModalDescription>
          </ModalHeader>
          <ModalBody className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="Pedro Duarte" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="@peduarte" />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ModalClose>
            <Button type="submit">Save</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default function Default() {
  return (
    <div className="flex min-h-screen flex-col items-center space-y-12 py-24">
      <DeviceIndicator />
      <div className="space-y-3 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight">
          Responsive Modal
        </h1>
        <p className="text-xl font-medium">
          This modal automatically adapts to your device:
        </p>
        <div className="flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2 rounded-md border p-1">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="flex items-center gap-2">
              <strong className="font-semibold">Desktop:</strong>{" "}
              <code>
                <pre>{`<Dialog />`}</pre>
              </code>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-1">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="flex items-center gap-2">
              <strong className="font-semibold">Mobile:</strong>{" "}
              <code>
                <pre>{`<Drawer />`}</pre>
              </code>
            </span>
          </div>
        </div>
      </div>
      <Preview />
      <p className="text-muted-foreground text-sm">
        *Try resizing your browser window or opening this on different devices!
      </p>
    </div>
  );
}

function DeviceIndicator() {
  const isMobile = useIsMobile();

  return (
    <div className="fixed top-4 left-4 z-50">
      <div
        className={`bg-muted rounded-full border px-3 py-2 text-sm font-medium`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isMobile ? "bg-green-500" : "bg-blue-500"}`}
          />
          {isMobile ? "Mobile" : "Desktop"}
        </div>
      </div>
    </div>
  );
}
```

Copy-paste these files for dependencies:

```tsx
sshahaider / drawer;
("use client");

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-background/50 fixed inset-0 z-50 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-3xl data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto my-2 hidden h-2 w-24 shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />

        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex w-full flex-col gap-1 rounded-t-3xl border-b px-4 py-2 md:mx-auto md:max-w-md",
        className,
      )}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("w-full px-4 py-6 md:mx-auto md:max-w-md", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto grid w-full gap-2 border-t px-4 py-3 md:mx-auto md:max-w-md",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-heading font-medium", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
```

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

```tsx
shadcn / input;
import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
```

```tsx
sshahaider / dialog;
("use client");

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-background/50 fixed inset-0 z-50 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("px-4 py-6", className)}
      {...props}
    />
  );
}

function DialogHeader({
  className,
  children,
  hideCloseButton = false,
  ...props
}: React.ComponentProps<"div"> & { hideCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "bg-muted/30 flex flex-col gap-2 rounded-t-lg border-b p-4 text-center sm:text-left",
        className,
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-full opacity-80 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "bg-muted/30 flex flex-col gap-2 rounded-b-lg border-t px-4 py-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
```

```tsx
originui / button;
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-black/5 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-black/5 hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm shadow-black/5 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-black/5 hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
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

```tsx
shadcn/switch
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

```

```tsx
shadcn / label;
("use client");

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

```tsx
serafimcloud / use - media - query;
import * as React from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false);

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
```

Install NPM dependencies:

```bash
vaul, @radix-ui/react-slot, class-variance-authority, lucide-react, @radix-ui/react-dialog, @radix-ui/react-switch, @radix-ui/react-label
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
