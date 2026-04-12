import type {
  DashboardConfig,
  WidgetConfig,
  WidgetSize,
  WidgetType,
} from "@/types/dashboard";

export const WIDGET_META: Record<
  WidgetType,
  {
    label: string;
    description: string;
    defaultSize: WidgetSize;
    canResize: boolean;
  }
> = {
  workout: {
    label: "Treino de hoje",
    description: "Próximo treino agendado e progresso",
    defaultSize: "full",
    canResize: false,
  },
  streak: {
    label: "Streak",
    description: "Sequência de dias consecutivos ativos",
    defaultSize: "compact",
    canResize: true,
  },
  xp: {
    label: "XP & Nível",
    description: "Experiência acumulada e nível atual",
    defaultSize: "compact",
    canResize: true,
  },
  macros: {
    label: "Macronutrientes",
    description: "Calorias e macros consumidos hoje",
    defaultSize: "full",
    canResize: false,
  },
  water: {
    label: "Hidratação",
    description: "Consumo de água do dia",
    defaultSize: "compact",
    canResize: true,
  },
  weekly_activity: {
    label: "Atividade semanal",
    description: "Treinos completados nos últimos 7 dias",
    defaultSize: "full",
    canResize: false,
  },
  community: {
    label: "Comunidade",
    description: "Meus grupos e check-ins recentes",
    defaultSize: "full",
    canResize: false,
  },
  quick_actions: {
    label: "Ações rápidas",
    description: "Atalhos para as funções mais usadas",
    defaultSize: "full",
    canResize: false,
  },
};

export const ASYNC_STORAGE_KEY = "dashboard_config_v1";

function uid8(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function buildDefaultDashboardConfig(): DashboardConfig {
  const make = (type: WidgetType): WidgetConfig => ({
    id: uid8(),
    type,
    size: WIDGET_META[type].defaultSize,
    enabled: true,
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    widgets: [
      make("workout"),
      make("streak"),
      make("xp"),
      make("macros"),
      make("water"),
      make("weekly_activity"),
      make("community"),
      make("quick_actions"),
    ],
  };
}
