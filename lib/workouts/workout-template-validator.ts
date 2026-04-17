import type {
  WorkoutTemplateInput,
  WorkoutTemplateSectionRecord,
  WorkoutTemplateBlockRecord,
} from "@/lib/firestore/workouts";
import type { AIExerciseIndex } from "@/lib/workouts/workout-ai-catalog";

export function validateAITemplate(
  raw: unknown,
  catalogIndex: AIExerciseIndex,
): { valid: boolean; errors: string[]; sanitized?: WorkoutTemplateInput } {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Template is not a valid object"] };
  }

  const t = raw as Record<string, unknown>;

  if (typeof t.name !== "string" || !t.name.trim()) {
    errors.push("Missing or empty template name");
  }

  if (
    !["beginner", "intermediate", "advanced"].includes(t.difficulty as string)
  ) {
    errors.push(`Invalid difficulty: "${t.difficulty}"`);
  }

  const duration = Number(t.estimated_duration_minutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push("estimated_duration_minutes must be a positive number");
  }

  const rawSections = t.sections;
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    errors.push("Template must have at least one section");
    return { valid: false, errors };
  }

  const validSectionTypes = ["warmup", "round", "cooldown"];
  let hasRound = false;

  const sections: WorkoutTemplateSectionRecord[] = rawSections.map(
    (sec: unknown, si: number) => {
      const s = sec as Record<string, unknown>;

      if (!validSectionTypes.includes(s.type as string)) {
        errors.push(
          `Section ${si}: invalid type "${s.type}" — must be warmup, round, or cooldown`,
        );
      }

      if (s.type === "round") hasRound = true;

      const rawBlocks = Array.isArray(s.blocks) ? s.blocks : [];
      const blocks: WorkoutTemplateBlockRecord[] = rawBlocks.map(
        (blk: unknown, bi: number) => {
          const b = blk as Record<string, unknown>;

          if (b.type === "rest") {
            return {
              id: String(b.id ?? `s${si}_b${bi}`),
              type: "rest" as const,
              order: bi,
              rest_seconds: Number(b.rest_seconds ?? b.duration_seconds ?? 60),
            };
          }

          // exercise block
          const exId = b.exercise_id as string | undefined;
          if (!exId) {
            errors.push(`Section ${si}, block ${bi}: missing exercise_id`);
          } else if (!catalogIndex.byId[exId]) {
            errors.push(
              `Section ${si}, block ${bi}: exercise_id "${exId}" not found in catalog`,
            );
          }

          if (!b.execution_mode) {
            errors.push(
              `Section ${si}, block ${bi}: missing execution_mode`,
            );
          }

          const catalogEntry = exId ? catalogIndex.byId[exId] : undefined;

          return {
            id: String(b.id ?? `s${si}_b${bi}`),
            type: "exercise" as const,
            order: bi,
            exercise_id: exId,
            name: String(b.name ?? catalogEntry?.name ?? exId ?? ""),
            execution_mode: (b.execution_mode as "reps" | "time") ?? "reps",
            reps: b.reps != null ? String(b.reps) : undefined,
            exercise_seconds:
              b.exercise_seconds != null
                ? Number(b.exercise_seconds)
                : undefined,
            prep_seconds:
              b.prep_seconds != null ? Number(b.prep_seconds) : undefined,
            weight_kg:
              b.weight_kg != null ? Number(b.weight_kg) : undefined,
            rest_seconds:
              b.rest_seconds != null ? Number(b.rest_seconds) : undefined,
            primary_muscles: Array.isArray(b.primary_muscles)
              ? (b.primary_muscles as string[])
              : (catalogEntry?.muscles ?? []),
            secondary_muscles: Array.isArray(b.secondary_muscles)
              ? (b.secondary_muscles as string[])
              : [],
            notes: b.notes != null ? String(b.notes) : undefined,
          };
        },
      );

      return {
        id: String(s.id ?? `section_${si}`),
        type: (s.type as WorkoutTemplateSectionRecord["type"]) ?? "round",
        name: String(s.name ?? `Section ${si + 1}`),
        order: si,
        blocks,
      };
    },
  );

  if (!hasRound) {
    errors.push("Template must have at least one round section");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitized: WorkoutTemplateInput = {
    name: String(t.name ?? "").trim(),
    description:
      t.description != null ? String(t.description) : undefined,
    difficulty: t.difficulty as WorkoutTemplateInput["difficulty"],
    is_ai_generated: true,
    estimated_duration_minutes: duration,
    exercises: [],
    sections,
    target_muscles: Array.isArray(t.target_muscles)
      ? (t.target_muscles as string[])
      : undefined,
    location: t.location != null ? String(t.location) : undefined,
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : ["ai_generated"],
    is_draft: false,
  };

  return { valid: true, errors: [], sanitized };
}
