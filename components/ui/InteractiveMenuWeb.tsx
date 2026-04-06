import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Home, Briefcase, Calendar, Shield, Settings } from 'lucide-react';

type IconComponentType = React.ElementType<{ className?: string }>;

export interface InteractiveMenuItemWeb {
  label: string;
  icon: IconComponentType;
}

export interface InteractiveMenuWebProps {
  items?: InteractiveMenuItemWeb[];
  accentColor?: string;
  onItemChange?: (index: number, label: string) => void;
}

const defaultItems: InteractiveMenuItemWeb[] = [
  { label: 'Home', icon: Home },
  { label: 'Strategy', icon: Briefcase },
  { label: 'Period', icon: Calendar },
  { label: 'Security', icon: Shield },
  { label: 'Settings', icon: Settings },
];

const defaultAccentColor = 'var(--component-active-color-default)';

/**
 * InteractiveMenuWeb - A web-only interactive menu component
 * For use in web platform (Next.js/shadcn web)
 * 
 * Features:
 * - Smooth active indicator animation
 * - Icon + label layout
 * - Customizable accent color
 * - Dark/light theme support via CSS variables
 * - Responsive design
 * - Accessibility support
 */
const InteractiveMenuWeb: React.FC<InteractiveMenuWebProps> = ({
  items,
  accentColor,
  onItemChange,
}) => {
  const finalItems = useMemo(() => {
    const isValid =
      items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    if (!isValid) {
      console.warn(
        "InteractiveMenuWeb: 'items' prop is invalid or missing. Using default items.",
        items
      );
      return defaultItems;
    }
    return items;
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= finalItems.length) {
      setActiveIndex(0);
    }
  }, [finalItems, activeIndex]);

  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const setLineWidth = () => {
      const activeItemElement = itemRefs.current[activeIndex];
      const activeTextElement = textRefs.current[activeIndex];

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth;
        activeItemElement.style.setProperty('--lineWidth', `${textWidth}px`);
      }
    };

    setLineWidth();

    window.addEventListener('resize', setLineWidth);
    return () => {
      window.removeEventListener('resize', setLineWidth);
    };
  }, [activeIndex, finalItems]);

  const handleItemClick = (index: number, label: string) => {
    setActiveIndex(index);
    onItemChange?.(index, label);
  };

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor;
    return { '--component-active-color': activeColor } as React.CSSProperties;
  }, [accentColor]);

  return (
    <nav
      className="interactive-menu"
      role="navigation"
      style={navStyle}
      aria-label="Interactive navigation menu"
    >
      {finalItems.map((item, index) => {
        const isActive = index === activeIndex;
        const IconComponent = item.icon;

        return (
          <button
            key={item.label}
            className={`interactive-menu__item ${isActive ? 'active' : ''}`}
            onClick={() => handleItemClick(index, item.label)}
            ref={(el) => {
              if (el) itemRefs.current[index] = el;
            }}
            aria-pressed={isActive}
            aria-label={`Navigate to ${item.label}`}
            style={
              { '--lineWidth': '0px' } as React.CSSProperties
            }
          >
            <div className="interactive-menu__icon">
              <IconComponent className="icon" aria-hidden="true" />
            </div>
            <strong
              className={`interactive-menu__text ${isActive ? 'active' : ''}`}
              ref={(el) => {
                if (el) textRefs.current[index] = el;
              }}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
};

export { InteractiveMenuWeb };
