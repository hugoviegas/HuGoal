import type { WorkoutTemplateRecord } from "@/lib/firestore/workouts";

export interface WorkoutWeekDayAssignment {
  date: string;
  day_index: number;
  kind: "workout" | "rest";
  template_id?: string;
}

export interface WorkoutWeekPlanRecord {
  id: string;
  user_id: string;
  week_start_date: string;
  source: "cycle_v1";
  next_rotation_offset: number;
  days: WorkoutWeekDayAssignment[];
  created_at: string;
  updated_at: string;
}

interface BuildWorkoutWeekPlanInput {
  uid: string;
  weekStartDate: string;
  trainingDays: number[];
  templates: WorkoutTemplateRecord[];
  rotationOffset?: number;
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekMonday(date: Date): Date {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const jsDay = base.getDay();
  const mondayFirst = jsDay === 0 ? 6 : jsDay - 1;
  base.setDate(base.getDate() - mondayFirst);
  return base;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function buildWorkoutWeekPlan(
  input: BuildWorkoutWeekPlanInput,
): WorkoutWeekPlanRecord {
  const baseDate = new Date(`${input.weekStartDate}T00:00:00`);
  const normalizedTrainingDays = Array.from(
    new Set(input.trainingDays.filter((day) => day >= 0 && day <= 6)),
  ).sort((left, right) => left - right);

  const activeTemplates = input.templates.filter(
    (template) => template.is_active !== false,
  );
  const templates =
    activeTemplates.length > 0 ? activeTemplates : input.templates;
  const totalTemplates = templates.length;

  let pointer = input.rotationOffset ?? 0;

  const days: WorkoutWeekDayAssignment[] = Array.from(
    { length: 7 },
    (_, index) => {
      const date = addDays(baseDate, index);
      const dateKey = formatLocalDateKey(date);

      if (!normalizedTrainingDays.includes(index) || totalTemplates === 0) {
        return {
          date: dateKey,
          day_index: index,
          kind: "rest",
        };
      }

      const template = templates[pointer % totalTemplates];
      pointer += 1;

      return {
        date: dateKey,
        day_index: index,
        kind: "workout",
        template_id: template.id,
      };
    },
  );

  const now = new Date().toISOString();
  const id = `${input.uid}_${input.weekStartDate}`;

  return {
    id,
    user_id: input.uid,
    week_start_date: input.weekStartDate,
    source: "cycle_v1",
    next_rotation_offset: pointer,
    days,
    created_at: now,
    updated_at: now,
  };
}
