"use client";

import { useCharacterLimit } from "@/components/ui/shadcn/hooks/use-character-limit";
import { useImageUpload } from "@/components/ui/shadcn/hooks/use-image-upload";
import { Button } from "@/components/ui/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/shadcn/avatar";
import { Check, ImagePlus, X } from "lucide-react";
import { useId, useState } from "react";

function ProfileBg({ defaultImage }: { defaultImage?: string }) {
  const [hideDefault, setHideDefault] = useState(false);
  const {
    previewUrl,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload();

  const currentImage = previewUrl || (!hideDefault ? defaultImage : null);

  const handleImageRemove = () => {
    handleRemove();
    setHideDefault(true);
  };

  return (
    <div className="h-32">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted">
        {currentImage && (
          <img
            src={currentImage}
            alt="Profile background"
            className="h-full w-full object-cover"
          />
        )}
        <button
          onClick={handleThumbnailClick}
          className="absolute flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-sm font-medium text-white hover:bg-black/60 transition-colors"
          aria-label="Upload background image"
        >
          <ImagePlus size={16} />
          Change
        </button>
        {currentImage && (
          <button
            onClick={handleImageRemove}
            className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/60 transition-colors"
            aria-label="Remove background image"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload background image file"
      />
    </div>
  );
}

function ProfileAvatar({ defaultImage }: { defaultImage?: string }) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } =
    useImageUpload();

  const currentImage = previewUrl || defaultImage;

  return (
    <div className="-mt-10 px-6">
      <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm shadow-black/10">
        {currentImage ? (
          <img
            src={currentImage}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus size={32} className="text-muted-foreground" />
        )}
        <button
          onClick={handleThumbnailClick}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
          aria-label="Change avatar"
        >
          <ImagePlus size={20} className="text-white" />
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload avatar image file"
      />
    </div>
  );
}

function Component() {
  const id = useId();

  const maxLength = 180;
  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit,
  } = useCharacterLimit({
    maxLength,
    initialValue:
      "Hey, I am a passionate developer who loves turning ideas into amazing experiences!",
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
        <DialogHeader className="contents space-y-0 text-left">
          <ProfileBg defaultImage="https://images.unsplash.com/photo-1579546189647-f9adf38abccd?w=400&h=128&fit=crop" />
          <div className="px-6 pb-4">
            <ProfileAvatar defaultImage="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop" />
            <DialogTitle className="mt-4">Edit profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              placeholder="Your name"
              defaultValue="Alex"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${id}-bio`}>Bio</Label>
            <Textarea
              id={`${id}-bio`}
              placeholder="Tell us about yourself"
              value={value}
              onChange={handleChange}
              rows={3}
            />
            <div className="text-xs text-muted-foreground">
              {characterCount} / {limit}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>
            <Check className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { Component as EditProfileDialog };
