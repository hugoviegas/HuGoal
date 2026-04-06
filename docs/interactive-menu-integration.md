# InteractiveMenu Integration Guide

This guide covers the integration of the new `InteractiveMenu` components for both mobile (React Native/Expo) and web platforms.

## 📱 Mobile/React Native Integration (InteractiveMenu.tsx)

### What is it?
A modern, animated bottom tab bar component that replaces the existing TabBar with enhanced interactive features:
- Smooth slide/fade animations when toggling visibility
- Icon + label layout with active state highlighting
- Customizable accent colors via theme store
- Dark/light theme support
- Full accessibility support
- Optimized for iOS and Android

### Installation & Usage

1. **Replace existing TabBar import** in your navigation configuration:

```tsx
// OLD
import { TabBar } from '@/components/ui/TabBar';

// NEW
import { InteractiveMenu } from '@/components/ui/InteractiveMenu';
```

2. **Use in your bottom tab navigator**:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { InteractiveMenu } from '@/components/ui/InteractiveMenu';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <InteractiveMenu {...props} />}
      // ... other navigator options
    >
      {/* Your screens */}
    </Tab.Navigator>
  );
}
```

3. **No additional setup required** - Uses existing:
   - Theme store (`useThemeStore`)
   - Navigation store (`useNavigationStore`)
   - lucide-react-native icons

### Features

- **State Management**: Integrates with your existing `theme.store.ts` and `navigation.store.ts`
- **Animations**: Uses React Native `Animated` API for smooth transitions
- **Visibility Toggle**: Respects `navbarVisible` state from navigation store
- **Active Indicator**: Shows dot indicator for active tab
- **Icon Highlighting**: Icon background changes on active state
- **Mobile Optimized**: Uses native driver for animations where available

---

## 🌐 Web Integration (InteractiveMenuWeb.tsx)

### What is it?
A web-only version of the interactive menu for future web platform development. This is a web React component (not React Native) with DOM-based animations and full CSS customization.

### Prerequisites

1. **Install lucide-react** (already added to package.json):
```bash
npm install lucide-react
```

2. **Set up CSS variables** in your global styles or Tailwind config:

Create a `web-theme-variables.css` or add to your `globals.css`:

```css
:root {
  /* Light theme */
  --component-inactive-color: #888888;
  --component-bg: #ffffff;
  --component-shadow: #e5e5e5;
  --component-active-bg: #f3f4f6;
  --component-line-inactive-color: #e5e5e5;
  --component-active-color-default: #3b82f6;
  
  /* Chart colors for accent customization */
  --chart-1: #3b82f6;
  --chart-2: #10b981;
  --chart-3: #f59e0b;
  --chart-4: #ef4444;
  --chart-5: #8b5cf6;
}

.dark {
  /* Dark theme */
  --component-inactive-color: #6b7280;
  --component-bg: #1f2937;
  --component-shadow: #374151;
  --component-active-bg: #111827;
  --component-line-inactive-color: #4b5563;
  --component-active-color-default: #60a5fa;
}
```

3. **Import the component and styles**:

```tsx
import { InteractiveMenuWeb } from '@/components/ui/InteractiveMenuWeb';
import '@/components/ui/InteractiveMenuWeb.css';
import { Home, Settings } from 'lucide-react';
import type { InteractiveMenuItemWeb } from '@/components/ui/InteractiveMenuWeb';

export function MyWebMenu() {
  const items: InteractiveMenuItemWeb[] = [
    { label: 'Home', icon: Home },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <InteractiveMenuWeb
      items={items}
      accentColor="var(--chart-2)"
      onItemChange={(index, label) => {
        console.log(`Selected: ${label}`);
      }}
    />
  );
}
```

### Features

- **Customizable Items**: Pass icon component and label
- **Accent Color**: Override default accent via CSS variable
- **Item Change Callback**: `onItemChange` prop for handling selections
- **Full CSS Customization**: All styles use CSS variables
- **Dark Theme Support**: Automatic dark mode via `.dark` class
- **Responsive**: Mobile-friendly on smaller screens
- **Accessible**: ARIA labels and keyboard navigation

### CSS Customization

The component uses these CSS variables that you can override:

| Variable | Purpose |
|----------|---------|
| `--component-inactive-color` | Text/icon color when inactive |
| `--component-bg` | Menu background color |
| `--component-shadow` | Border color |
| `--component-active-bg` | Active item background |
| `--component-line-inactive-color` | Inactive underline color |
| `--component-active-color-default` | Active item accent color |

---

## 📦 Dependencies

### Already installed:
- `lucide-react-native` (v1.7.0) - Mobile icons
- `expo-blur` (v15.0.8) - Blur effect
- `zustand` - Store management

### Added:
- `lucide-react` (v0.394.0) - Web icons for web version

---

## 🎨 Theme Integration

### Mobile (React Native)

The mobile `InteractiveMenu` uses your existing theme store colors:

```tsx
{
  colors: {
    primary: '#3b82f6',        // Active item color
    muted: '#8b92a0',          // Inactive item color
    tabBarBorder: '#e5e5e5',   // Border color
    primaryFaded: '#3b82f620', // Faded primary for background
  }
}
```

### Web

The web version uses CSS variables. Map your theme to these variables in your CSS:

```css
/* Example mapping to Shadcn/UI theme */
:root {
  --component-active-color-default: hsl(var(--primary));
  --component-inactive-color: hsl(var(--muted-foreground));
  --component-bg: hsl(var(--card));
  --component-shadow: hsl(var(--border));
  --component-active-bg: hsl(var(--secondary));
  --component-line-inactive-color: hsl(var(--border));
}
```

---

## 🧪 Testing & Examples

### Mobile Examples

The `InteractiveMenu` is a drop-in replacement for `TabBar`. Test it by:

1. Navigating between tabs
2. Toggling navbar visibility via `useNavigationStore`
3. Testing dark/light theme switches
4. Verifying animations work smoothly

### Web Examples

See `InteractiveMenuWeb.demo.tsx` for three demo implementations:

- `WebMenuDefaultDemo` - Uses default items
- `WebMenuCustomizedDemo` - Custom items and colors
- `WebMenuDarkThemeDemo` - Dark theme example

---

## 🔧 Configuration

### Mobile (InteractiveMenu.tsx)

Props passed from `BottomTabBarProps`:
- `state` - Navigation state
- `descriptors` - Route descriptors
- `navigation` - Navigation object

### Web (InteractiveMenuWeb.tsx)

Props you can pass:
```tsx
interface InteractiveMenuWebProps {
  items?: InteractiveMenuItemWeb[];        // Menu items (default: 5 items)
  accentColor?: string;                   // CSS variable or color hex
  onItemChange?: (index: number, label: string) => void;  // Selection callback
}
```

---

## 📋 Checklist

- [x] Mobile version created and integrated with existing stores
- [x] Web version created with full CSS customization
- [x] Icons using lucide-react for web and lucide-react-native for mobile
- [x] Theme support (dark/light)
- [x] Animations optimized for both platforms
- [x] Accessibility support (ARIA labels, keyboard navigation)
- [x] Demo files provided
- [x] CSS organization and variables documented
- [x] lucide-react added to package.json

---

## 🚀 Next Steps

1. **Mobile**: Replace TabBar imports and test on iOS/Android
2. **Web**: Set up CSS variables in your web app's globals.css
3. **Customization**: Adjust colors and items per your design system
4. **Deployment**: Build and test on actual devices

---

## ⚠️ Important Notes

- **Mobile Performance**: Animations use native driver for best performance
- **Web Accessibility**: Include ARIA labels and test with screen readers
- **Theme Consistency**: Map your design system colors to CSS variables
- **Browser Support**: Web version uses modern CSS (flexbox, CSS custom properties)

---

## 📞 Support

For issues or customization needs:

1. Check the component props in the source files
2. Review the demo files for implementation examples
3. Verify CSS variables are set in your theme
4. Test on both light and dark modes
