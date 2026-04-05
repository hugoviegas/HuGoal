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
social - post - card.tsx;
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RuixenCard06Props {
  id?: string;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
    timeAgo?: string;
  };
  content?: {
    text?: string;
    link?: {
      title?: string;
      description?: string;
      icon?: React.ReactNode;
    };
  };
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    isLiked?: boolean;
    isBookmarked?: boolean;
  };
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
}

const defaultProps: RuixenCard06Props = {
  author: {
    name: "Dorian Baffier",
    username: "dorian_baffier",
    avatar: "https://github.com/shadcn.png",
    timeAgo: "2h ago",
  },
  content: {
    text: "Just launched Ruixen UI! Check out the documentation and let me know what you think 🎨",
    link: {
      title: "Ruixen UI Documentation",
      description: "A comprehensive guide to Ruixen UI",
      icon: <LinkIcon className="w-5 h-5 text-blue-500" />,
    },
  },
  engagement: {
    likes: 128,
    comments: 32,
    shares: 24,
    isLiked: false,
    isBookmarked: false,
  },
};

export default function SocialPostCard({
  author = defaultProps.author,
  content = defaultProps.content,
  engagement = defaultProps.engagement,
  onLike,
  onComment,
  onShare,
  onBookmark,
  id = author?.username || "card-02",
}: CardProps) {
  return (
    <div className="w-full max-w-lg mx-auto rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-xl backdrop-blur-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-3">
          <img
            src={author?.avatar}
            alt={author?.name}
            className="w-11 h-11 rounded-full border border-zinc-300 dark:border-zinc-600 object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {author?.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              @{author?.username} · {author?.timeAgo}
            </p>
          </div>
        </div>
        <div>
          <Bookmark
            onClick={onBookmark}
            className={cn(
              "w-5 h-5 cursor-pointer transition hover:text-yellow-500",
              engagement?.isBookmarked ? "text-yellow-500" : "text-zinc-400",
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 text-zinc-700 dark:text-zinc-300 text-base">
        {content?.text}
      </div>

      {/* Optional Link Box */}
      {content?.link && (
        <div className="mx-5 mb-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 transition">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-white dark:bg-zinc-700">
              {content.link.icon}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {content.link.title}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {content.link.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reactions Footer */}
      <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-700 text-sm text-center">
        <button
          onClick={onLike}
          className={cn(
            "py-3 flex items-center justify-center gap-2 transition hover:bg-rose-50 dark:hover:bg-rose-900",
            engagement?.isLiked
              ? "text-rose-600 font-semibold"
              : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          <Heart
            className={cn("w-4 h-4", engagement?.isLiked && "fill-current")}
          />
          {engagement?.likes}
        </button>
        <button
          onClick={onComment}
          className="py-3 flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition"
        >
          <MessageCircle className="w-4 h-4" />
          {engagement?.comments}
        </button>
        <button
          onClick={onShare}
          className="py-3 flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900 transition"
        >
          <Share2 className="w-4 h-4" />
          {engagement?.shares}
        </button>
      </div>
    </div>
  );
}

demo.tsx;
import SocialPostCard from "@/components/ui/social-post-card";

const DemoOne = () => {
  return <SocialPostCard />;
};

export { DemoOne };
```

Install NPM dependencies:

```bash
lucide-react
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
