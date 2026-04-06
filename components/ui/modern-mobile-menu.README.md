# Modern Mobile Menu - Replacement TabBar

## 📝 Overview

The `ModernMobileMenu` component is a modern, animated bottom tab bar that replaces the previous `InteractiveMenu` component. It features:

- ✨ Smooth animations with blur effect
- 🎨 Modern material design styling
- 🌙 Full dark/light theme support
- ♿ Accessibility (ARIA labels, keyboard support)
- 📱 Responsive design (iOS, Android, Web via Expo)
- ⚡ Optimized performance with native driver animations

## 🚀 Quick Start

The component is already integrated in `app/(tabs)/_layout.tsx` and automatically replaces the old TabBar.

### File Location

- **Component**: `components/ui/modern-mobile-menu.tsx`
- **Navigation Config**: `app/(tabs)/_layout.tsx`
- **Styles**: `global.css` (CSS variables + animations)

## 🎯 Component Props

```typescript
interface ModernMobileMenuProps extends BottomTabBarProps {
  items?: ModernMenuItemProps[]; // Optional custom items
  accentColor?: string; // Custom accent color (hex or CSS var)
}

interface ModernMenuItemProps {
  label: string; // Item label
  icon: IconComponentType; // Lucide icon component
}
```

## 🎨 Styling

The component uses CSS variables defined in `global.css`:

### Light Theme

```css
--component-inactive-color: hsl(0 0% 40%);
--component-bg: hsl(0 0% 100%);
--component-shadow: hsl(0 0% 90%);
--component-active-bg: hsl(0 0% 97%);
--component-active-color-default: hsl(172 100% 33%); /* Teal */
```

### Dark Theme

```css
--component-inactive-color: hsl(0 0% 53%);
--component-bg: hsl(0 0% 10%);
--component-shadow: hsl(0 0% 20%);
--component-active-bg: hsl(0 0% 15%);
--component-active-color-default: hsl(172 100% 50%); /* Bright teal */
```

## 📊 Features

### Visual

- Modern rounded container with blur effect
- Active state indicator dot below text
- Icon background highlight for active items
- Smooth color transitions
- Responsive padding and sizing

### Animations

- **Slide**: TabBar slides up/down on visibility toggle
- **Fade**: Soft opacity animation
- **Icon Bounce**: Subtle bounce on active state (via CSS)
- **Native Driver**: Uses native driver for smooth performance

### Accessibility

- ARIA labels on buttons
- `accessibilityRole="button"`
- Keyboard navigation support
- Semantic HTML structure
- Reduced motion support

## 🔧 Customization

### Change Active Color

Update theme store in `stores/theme.store.ts`:

```typescript
colors: {
  primary: '#YOUR_COLOR',  // Will be used as active color
  // ... other colors
}
```

Or pass custom color:

```tsx
<ModernMobileMenu {...props} accentColor="#ff0000" />
```

### Change Tab Items

Update in navigation config or pass via props:

```tsx
const customItems = [
  { label: "home", icon: Home },
  { label: "shop", icon: ShoppingCart },
];
<ModernMobileMenu {...props} items={customItems} />;
```

## 📱 Platform Support

- ✅ **iOS**: Full support with native animations
- ✅ **Android**: Full support with native animations
- ✅ **Web (Expo Web)**: Full support with CSS animations
- ✅ **Dark Mode**: Automatic theme detection

## 🔗 Integration Points

- **Navigation Store**: `useNavigationStore` for visibility control
- **Theme Store**: `useThemeStore` for colors and isDark state
- **React Navigation**: `BottomTabBarProps` for tab management
- **Lucide Icons**: Icon library integration

## 📋 Default Tab Mapping

| Route     | Icon            | Label     |
| --------- | --------------- | --------- |
| dashboard | LayoutDashboard | Home      |
| workouts  | Dumbbell        | Workouts  |
| nutrition | Utensils        | Nutrition |
| community | Users           | Community |
| profile   | UserCircle      | Profile   |

## 🎓 Related Files

- Component: [modern-mobile-menu.tsx](modern-mobile-menu.tsx)
- Navigation: [app/(tabs)/\_layout.tsx](<../../../app/(tabs)/_layout.tsx>)
- Styles: [global.css](../../../global.css)
- Old Component: [InteractiveMenu.tsx](InteractiveMenu.tsx) (deprecated)

## 📚 Examples

### Default Setup

```tsx
// In app/(tabs)/_layout.tsx
import { ModernMobileMenu } from "@/components/ui/modern-mobile-menu";

<Tabs tabBar={(props) => <ModernMobileMenu {...props} />} />;
```

### Custom Accent Color

```tsx
<ModernMobileMenu {...props} accentColor="#10b981" />
```

### Custom Items

```tsx
const items = [
  { label: "home", icon: Home },
  { label: "settings", icon: Settings },
];
<ModernMobileMenu {...props} items={items} />;
```

## ⚠️ Notes

- Component requires `navigation` store for visibility control
- Component requires `theme` store for colors
- Icons use `lucide-react-native` package
- CSS variables must be defined in global.css for styling
- Animations use native driver on iOS/Android for performance

## 🐛 Troubleshooting

### TabBar not showing

- Check navigation config imports correct component
- Verify `useNavigationStore` hook is available
- Check `navbarVisible` state in store

### Icons not showing

- Verify `lucide-react-native` is installed
- Check icon component is valid Lucide icon
- Check icon size prop is numeric (e.g., 24)

### Colors not applying

- Check CSS variables are defined in `global.css`
- Verify theme store colors are set
- Check dark mode is properly toggled

### Animations not smooth

- Ensure Platform detection is working
- Check if using web platform (animations use CSS)
- Verify native driver is enabled for native platforms

## 🎉 Status

✅ Production Ready  
✅ TypeScript Safe  
✅ Accessible  
✅ Tested  
✅ Documented
