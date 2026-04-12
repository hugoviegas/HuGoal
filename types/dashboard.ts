export type WidgetType =
  | 'workout'
  | 'streak'
  | 'xp'
  | 'macros'
  | 'water'
  | 'weekly_activity'
  | 'community'
  | 'quick_actions';

export type WidgetSize = 'compact' | 'full';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  enabled: boolean;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  version: number;
  updatedAt: string;
}

export type WidgetRowItem =
  | { kind: 'full'; id: string; widget: WidgetConfig }
  | { kind: 'pair'; id: string; left: WidgetConfig; right: WidgetConfig }
  | { kind: 'single'; id: string; widget: WidgetConfig };
