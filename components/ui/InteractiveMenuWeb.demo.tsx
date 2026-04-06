/**
 * Demo Examples for InteractiveMenuWeb
 * 
 * Usage:
 * 1. Import in your web component
 * 2. Include the CSS file: import './InteractiveMenuWeb.css'
 * 3. Set up CSS variables in your root or use tailwind theme
 * 4. Customize items and colors as needed
 */

import React from 'react';
import { InteractiveMenuWeb } from '@/components/ui/InteractiveMenuWeb';
import { Home, Briefcase, Calendar, Shield, Settings } from 'lucide-react';
import type { InteractiveMenuItemWeb } from '@/components/ui/InteractiveMenuWeb';
import './InteractiveMenuWeb.css';

// Demo 1: Default Menu
export const WebMenuDefaultDemo = () => {
  return (
    <div style={{ padding: '2rem', background: '#f5f5f5' }}>
      <h2>Default Interactive Menu</h2>
      <InteractiveMenuWeb />
    </div>
  );
};

// Demo 2: Customized Menu with Custom Items
export const WebMenuCustomizedDemo = () => {
  const customItems: InteractiveMenuItemWeb[] = [
    { label: 'Dashboard', icon: Home },
    { label: 'Projects', icon: Briefcase },
    { label: 'Calendar', icon: Calendar },
    { label: 'Security', icon: Shield },
    { label: 'Preferences', icon: Settings },
  ];

  const handleItemChange = (index: number, label: string) => {
    console.log(`Selected: ${label} (index: ${index})`);
  };

  return (
    <div style={{ padding: '2rem', background: '#f5f5f5' }}>
      <h2>Customized Interactive Menu</h2>
      <InteractiveMenuWeb
        items={customItems}
        accentColor="var(--chart-2)"
        onItemChange={handleItemChange}
      />
    </div>
  );
};

// Demo 3: Dark Theme Menu
export const WebMenuDarkThemeDemo = () => {
  const customItems: InteractiveMenuItemWeb[] = [
    { label: 'Home', icon: Home },
    { label: 'Work', icon: Briefcase },
    { label: 'Events', icon: Calendar },
  ];

  return (
    <div
      style={{
        padding: '2rem',
        background: '#1a1a1a',
        borderRadius: '0.5rem',
      }}
      className="dark"
    >
      <h2 style={{ color: '#fff' }}>Dark Theme Interactive Menu</h2>
      <InteractiveMenuWeb items={customItems} />
    </div>
  );
};

// Example CSS Variables Setup (add to your root/globals.css)
/*
:root {
  --component-inactive-color: var(--muted-foreground);
  --component-bg: var(--card);
  --component-shadow: var(--border);
  --component-active-bg: var(--secondary);
  --component-line-inactive-color: var(--border);
  --component-active-color-default: var(--accent-foreground);
  
  --chart-2: #16a34a;
  --chart-3: #2563eb;
  --chart-4: #dc2626;
  --chart-5: #ca8a04;
}

.dark {
  --component-inactive-color: var(--muted-foreground);
  --component-bg: var(--card);
  --component-shadow: var(--border);
  --component-active-bg: var(--secondary);
  --component-line-inactive-color: var(--muted-foreground);
  --component-active-color-default: var(--accent-foreground);
}
*/

export default {
  WebMenuDefaultDemo,
  WebMenuCustomizedDemo,
  WebMenuDarkThemeDemo,
};
