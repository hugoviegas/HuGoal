"use client";

import { AvatarPicker } from "@/components/ui/shadcn/avatar-picker";
import { EditProfileDialog } from "@/components/ui/shadcn/edit-profile";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";

/**
 * Demo unificada: Mostra os 3 componentes integrados
 * 1. Avatar Picker - Seletor de avatar com animações
 * 2. Avatar com Badge - Avatar simples com número
 * 3. Edit Profile Dialog - Diálogo para editar perfil
 */
function DemoAvatarComplete() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Avatar Components Demo</h1>
          <p className="text-muted-foreground">
            Integrated Avatar components with animations and profile management
          </p>
        </div>

        {/* Grid de componentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Avatar Picker */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Avatar Picker</CardTitle>
              <CardDescription>
                Select your favorite avatar with smooth animations
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <AvatarPicker />
            </CardContent>
          </Card>

          {/* Card 2: Avatar with Badge */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Avatar + Badge</CardTitle>
              <CardDescription>
                Show user count or notifications with badge
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-6">
              {/* Single Avatar */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  User Profile
                </p>
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop"
                    alt="User"
                  />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>

              {/* Avatar with Badge */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  With Notification
                </p>
                <div className="relative mx-auto w-fit">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop"
                      alt="User"
                    />
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 left-full min-w-5 -translate-x-4 px-1">
                    5
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Edit Profile Dialog */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Edit Profile</CardTitle>
              <CardDescription>
                Update profile with image upload and bio
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <EditProfileDialog />
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Component Details</CardTitle>
            <CardDescription>
              Información sobre los componentes integrados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Avatar Picker</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Animated selection</li>
                  <li>✓ Rotation effects</li>
                  <li>✓ Smooth transitions</li>
                  <li>✓ 4 avatar options</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">2. Avatar Base</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Radix UI components</li>
                  <li>✓ Fallback support</li>
                  <li>✓ Badge integration</li>
                  <li>✓ Responsive sizing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">3. Edit Profile</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Image upload (bg + avatar)</li>
                  <li>✓ Character limit on bio</li>
                  <li>✓ Form validation</li>
                  <li>✓ Dialog modal pattern</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dependencies Info */}
        <Card className="mt-6 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Dependencies Installed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              <p>✓ @radix-ui/react-avatar</p>
              <p>✓ @radix-ui/react-dialog</p>
              <p>✓ @radix-ui/react-icons</p>
              <p>✓ @radix-ui/react-popover</p>
              <p>✓ @radix-ui/react-slot</p>
              <p>✓ motion (framer-motion alternative)</p>
              <p>✓ class-variance-authority</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DemoAvatarComplete;
