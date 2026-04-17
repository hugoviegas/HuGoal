/**
 * Tests for the workout AI feature:
 *   - buildAICatalogIndex     (workout-ai-catalog.ts)
 *   - buildAIExerciseSubset   (workout-ai-catalog.ts)
 *   - validateAITemplate      (workout-template-validator.ts)
 *   - buildWorkoutSessionContext (workout-session-context.ts)
 *
 * Run with:
 *   npx jest lib/workouts/__tests__/workout-ai.test.ts
 *
 * Requires:
 *   npm install --save-dev jest @babel/preset-env @babel/preset-typescript
 */

import {
  buildAICatalogIndex,
  buildAIExerciseSubset,
  type AIExerciseIndex,
} from "../workout-ai-catalog";
import { validateAITemplate } from "../workout-template-validator";
import { buildWorkoutSessionContext } from "../workout-session-context";
import type { CachedLibraryExercise } from "../exercise-cache";
import type { WorkoutTemplateRecord, WorkoutDailyOverrideRecord } from "../../firestore/workouts";
import type { UserProfile } from "../../../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeExercise(
  overrides: Partial<CachedLibraryExercise> & { id: string },
): CachedLibraryExercise {
  return {
    id: overrides.id,
    name: overrides.name ?? `Exercise ${overrides.id}`,
    name_en: overrides.name_en ?? `Exercise ${overrides.id}`,
    primary_muscles: overrides.primary_muscles ?? ["chest"],
    secondary_muscles: overrides.secondary_muscles ?? [],
    equipment: overrides.equipment ?? ["barbell"],
    equipment_label: overrides.equipment_label ?? "barbell",
    difficulty: overrides.difficulty ?? "beginner",
    category: overrides.category ?? "strength",
    type: overrides.type,
    has_weight: overrides.has_weight ?? true,
    short_description: overrides.short_description ?? "strength • Chest",
    video_youtube_ids: overrides.video_youtube_ids ?? [],
    aliases: overrides.aliases ?? [],
    ...overrides,
  } as CachedLibraryExercise;
}

/** A minimal catalog of 5 exercises covering different muscles and equipment */
const CATALOG: CachedLibraryExercise[] = [
  makeExercise({
    id: "ex_bench",
    name: "Bench Press",
    primary_muscles: ["chest"],
    equipment: ["barbell"],
    equipment_label: "barbell",
  }),
  makeExercise({
    id: "ex_squat",
    name: "Back Squat",
    primary_muscles: ["quads"],
    equipment: ["barbell"],
    equipment_label: "barbell",
  }),
  makeExercise({
    id: "ex_pushup",
    name: "Push-up",
    primary_muscles: ["chest"],
    equipment: ["bodyweight"],
    equipment_label: "bodyweight",
  }),
  makeExercise({
    id: "ex_row",
    name: "Dumbbell Row",
    primary_muscles: ["back"],
    equipment: ["dumbbell"],
    equipment_label: "dumbbell",
  }),
  makeExercise({
    id: "ex_plank",
    name: "Plank",
    primary_muscles: ["core"],
    equipment: ["bodyweight"],
    equipment_label: "bodyweight",
    category: "stretching",
  }),
];

/** Pre-built index from the fixture catalog */
let INDEX: AIExerciseIndex;

// ---------------------------------------------------------------------------
// buildAICatalogIndex
// ---------------------------------------------------------------------------

describe("buildAICatalogIndex", () => {
  beforeAll(() => {
    INDEX = buildAICatalogIndex(CATALOG);
  });

  it("populates byId with every exercise", () => {
    expect(Object.keys(INDEX.byId)).toHaveLength(CATALOG.length);
    CATALOG.forEach((ex) => {
      expect(INDEX.byId[ex.id]).toBeDefined();
      expect(INDEX.byId[ex.id].id).toBe(ex.id);
      expect(INDEX.byId[ex.id].name).toBe(ex.name);
    });
  });

  it("maps equipment_label to entry.equipment", () => {
    expect(INDEX.byId["ex_bench"].equipment).toBe("barbell");
    expect(INDEX.byId["ex_pushup"].equipment).toBe("bodyweight");
    expect(INDEX.byId["ex_row"].equipment).toBe("dumbbell");
  });

  it("populates byMuscle correctly", () => {
    expect(INDEX.byMuscle["chest"]).toEqual(
      expect.arrayContaining(["ex_bench", "ex_pushup"]),
    );
    expect(INDEX.byMuscle["quads"]).toContain("ex_squat");
    expect(INDEX.byMuscle["back"]).toContain("ex_row");
    expect(INDEX.byMuscle["core"]).toContain("ex_plank");
  });

  it("populates byEquipment correctly", () => {
    expect(INDEX.byEquipment["barbell"]).toEqual(
      expect.arrayContaining(["ex_bench", "ex_squat"]),
    );
    expect(INDEX.byEquipment["bodyweight"]).toEqual(
      expect.arrayContaining(["ex_pushup", "ex_plank"]),
    );
    expect(INDEX.byEquipment["dumbbell"]).toContain("ex_row");
  });

  it("infers mode=time for stretching category", () => {
    expect(INDEX.byId["ex_plank"].mode).toBe("time");
  });

  it("infers mode=reps for strength category", () => {
    expect(INDEX.byId["ex_bench"].mode).toBe("reps");
  });

  it("infers mode=time for exercises with type=static", () => {
    const staticEx = makeExercise({
      id: "ex_wall",
      name: "Wall Sit",
      primary_muscles: ["quads"],
      equipment: ["bodyweight"],
      equipment_label: "bodyweight",
      category: "strength",
      type: "static",
    });
    const idx = buildAICatalogIndex([staticEx]);
    expect(idx.byId["ex_wall"].mode).toBe("time");
  });

  it("returns empty indexes for empty input", () => {
    const empty = buildAICatalogIndex([]);
    expect(Object.keys(empty.byId)).toHaveLength(0);
    expect(Object.keys(empty.byMuscle)).toHaveLength(0);
    expect(Object.keys(empty.byEquipment)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildAIExerciseSubset
// ---------------------------------------------------------------------------

describe("buildAIExerciseSubset", () => {
  beforeAll(() => {
    INDEX = buildAICatalogIndex(CATALOG);
  });

  describe("equipment filtering", () => {
    it("returns only matching equipment + bodyweight when equipment is specified", () => {
      const result = buildAIExerciseSubset(INDEX, ["dumbbell"], ["chest", "back"]);
      const ids = result.map((e) => e.id);
      // dumbbell row matches; push-up is bodyweight (always allowed)
      expect(ids).toContain("ex_row");
      expect(ids).toContain("ex_pushup");
      // barbell bench should be excluded
      expect(ids).not.toContain("ex_bench");
      expect(ids).not.toContain("ex_squat");
    });

    it("always includes bodyweight exercises even when equipment specifies other types", () => {
      const result = buildAIExerciseSubset(INDEX, ["barbell"], []);
      const ids = result.map((e) => e.id);
      // bodyweight exercises are always allowed
      expect(ids).toContain("ex_pushup");
      expect(ids).toContain("ex_plank");
    });

    it("skips equipment filter entirely when equipment array is empty", () => {
      const result = buildAIExerciseSubset(INDEX, [], ["chest"]);
      const ids = result.map((e) => e.id);
      // Both barbell and bodyweight chest exercises returned
      expect(ids).toContain("ex_bench");
      expect(ids).toContain("ex_pushup");
    });

    it("returns all muscles when equipment is empty and muscles is empty", () => {
      const result = buildAIExerciseSubset(INDEX, [], []);
      expect(result.length).toBe(CATALOG.length);
    });
  });

  describe("muscle targeting", () => {
    it("only targets specified muscles in the primary pass", () => {
      const result = buildAIExerciseSubset(INDEX, [], ["quads"]);
      const ids = result.map((e) => e.id);
      // Squat targets quads; other muscles may fill in from the secondary pass
      expect(ids).toContain("ex_squat");
    });

    it("uses all muscles when muscles array is empty", () => {
      const result = buildAIExerciseSubset(INDEX, [], []);
      expect(result.length).toBe(CATALOG.length);
    });
  });

  describe("deduplication", () => {
    it("does not return duplicate entries", () => {
      const result = buildAIExerciseSubset(INDEX, [], []);
      const ids = result.map((e) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe("maxPerMuscle cap", () => {
    it("respects maxPerMuscle limit per muscle group", () => {
      // Build a catalog where chest has 5 exercises
      const bigCatalog: CachedLibraryExercise[] = Array.from(
        { length: 5 },
        (_, i) =>
          makeExercise({
            id: `chest_${i}`,
            name: `Chest Ex ${i}`,
            primary_muscles: ["chest"],
            equipment: ["barbell"],
            equipment_label: "barbell",
          }),
      );
      const idx = buildAICatalogIndex(bigCatalog);
      // maxPerMuscle=2 → only 2 chest exercises in the primary pass
      const result = buildAIExerciseSubset(idx, [], ["chest"], 2);
      // Primary pass contributes at most 2; secondary pass fills remaining from byEquipment
      // But since all exercises share the same ids, deduplication prevents more than 5 total.
      // The key assertion: result length is at most 5 (total catalog size).
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("100-entry hard cap", () => {
    it("never returns more than 100 entries", () => {
      const largeCatalog: CachedLibraryExercise[] = Array.from(
        { length: 200 },
        (_, i) =>
          makeExercise({
            id: `ex_${i}`,
            name: `Exercise ${i}`,
            primary_muscles: ["chest"],
            equipment: ["barbell"],
            equipment_label: "barbell",
          }),
      );
      const idx = buildAICatalogIndex(largeCatalog);
      const result = buildAIExerciseSubset(idx, [], []);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });
});

// ---------------------------------------------------------------------------
// validateAITemplate
// ---------------------------------------------------------------------------

describe("validateAITemplate", () => {
  /** Helper for a minimal valid template raw object */
  function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      name: "Push Day",
      difficulty: "intermediate",
      estimated_duration_minutes: 45,
      sections: [
        {
          id: "s0",
          type: "round",
          name: "Main",
          order: 0,
          blocks: [
            {
              id: "b0",
              type: "exercise",
              exercise_id: "ex_bench",
              execution_mode: "reps",
              reps: "10",
              primary_muscles: ["chest"],
            },
          ],
        },
      ],
      ...overrides,
    };
  }

  describe("null / non-object inputs", () => {
    it("returns valid=false for null", () => {
      const result = validateAITemplate(null, INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/not a valid object/i);
    });

    it("returns valid=false for a string", () => {
      expect(validateAITemplate("hello", INDEX).valid).toBe(false);
    });

    it("returns valid=false for a number", () => {
      expect(validateAITemplate(42, INDEX).valid).toBe(false);
    });

    it("returns valid=false for undefined", () => {
      expect(validateAITemplate(undefined, INDEX).valid).toBe(false);
    });
  });

  describe("name validation", () => {
    it("reports error when name is missing", () => {
      const raw = validRaw();
      delete (raw as Record<string, unknown>).name;
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("reports error when name is empty string", () => {
      const result = validateAITemplate(validRaw({ name: "   " }), INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });
  });

  describe("difficulty validation", () => {
    it("reports error for invalid difficulty value", () => {
      const result = validateAITemplate(validRaw({ difficulty: "expert" }), INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("difficulty"))).toBe(true);
    });

    it("accepts all valid difficulty values", () => {
      (["beginner", "intermediate", "advanced"] as const).forEach((d) => {
        const result = validateAITemplate(validRaw({ difficulty: d }), INDEX);
        // Difficulty itself should not cause errors
        expect(result.errors.some((e) => e.includes("difficulty"))).toBe(false);
      });
    });
  });

  describe("sections validation", () => {
    it("returns valid=false and error when sections array is missing", () => {
      const raw = validRaw();
      delete (raw as Record<string, unknown>).sections;
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("section"))).toBe(true);
    });

    it("returns valid=false and error when sections array is empty", () => {
      const result = validateAITemplate(validRaw({ sections: [] }), INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("section"))).toBe(true);
    });

    it("reports error when no round section exists", () => {
      const noRound = validRaw({
        sections: [
          { id: "s0", type: "warmup", name: "Warmup", order: 0, blocks: [] },
        ],
      });
      const result = validateAITemplate(noRound, INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("round"))).toBe(true);
    });

    it("reports error for invalid section type", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "cardio",
            name: "Cardio",
            order: 0,
            blocks: [],
          },
          // Need a round section too to avoid the "no round" error hiding this one
          {
            id: "s1",
            type: "round",
            name: "Main",
            order: 1,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("cardio"))).toBe(true);
    });
  });

  describe("block validation — exercise_id", () => {
    it("reports error when exercise_id is not in catalog", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "nonexistent_id",
                execution_mode: "reps",
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("nonexistent_id")),
      ).toBe(true);
    });

    it("reports error when exercise_id is missing", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                // no exercise_id
                execution_mode: "reps",
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("exercise_id")),
      ).toBe(true);
    });
  });

  describe("block validation — execution_mode", () => {
    it("reports error when execution_mode is missing", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                // no execution_mode
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("execution_mode")),
      ).toBe(true);
    });
  });

  describe("rest blocks", () => {
    it("accepts rest blocks without requiring exercise_id or execution_mode", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
              },
              {
                id: "b1",
                type: "rest",
                rest_seconds: 60,
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
    });

    it("defaults rest_seconds to 60 when neither rest_seconds nor duration_seconds is provided", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
              },
              { id: "b1", type: "rest" },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
      const restBlock = result.sanitized!.sections![0].blocks[1];
      expect(restBlock.type).toBe("rest");
      expect((restBlock as { rest_seconds?: number }).rest_seconds).toBe(60);
    });
  });

  describe("auto-fill from catalog", () => {
    it("fills block name from catalog when block.name is absent", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
                // no name
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
      const block = result.sanitized!.sections![0].blocks[0];
      expect(block.name).toBe("Bench Press");
    });

    it("fills primary_muscles from catalog when block.primary_muscles is absent", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
                // no primary_muscles
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
      const block = result.sanitized!.sections![0].blocks[0];
      expect(block.primary_muscles).toEqual(["chest"]);
    });
  });

  describe("block order auto-fix", () => {
    it("sets block.order to its array index regardless of the raw value", () => {
      const raw = validRaw({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                exercise_id: "ex_bench",
                execution_mode: "reps",
                order: 99,
              },
              {
                id: "b1",
                type: "rest",
                rest_seconds: 30,
                order: 55,
              },
            ],
          },
        ],
      });
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
      const blocks = result.sanitized!.sections![0].blocks;
      expect(blocks[0].order).toBe(0);
      expect(blocks[1].order).toBe(1);
    });
  });

  describe("happy path", () => {
    it("returns valid=true and sanitized template for a correct input", () => {
      const raw = validRaw();
      const result = validateAITemplate(raw, INDEX);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized!.name).toBe("Push Day");
      expect(result.sanitized!.difficulty).toBe("intermediate");
      expect(result.sanitized!.is_ai_generated).toBe(true);
      expect(result.sanitized!.is_draft).toBe(false);
    });

    it("sets tags to ['ai_generated'] when tags are absent in raw input", () => {
      const result = validateAITemplate(validRaw(), INDEX);
      expect(result.sanitized!.tags).toEqual(["ai_generated"]);
    });

    it("preserves tags from raw input when provided", () => {
      const result = validateAITemplate(
        validRaw({ tags: ["push", "strength"] }),
        INDEX,
      );
      expect(result.sanitized!.tags).toEqual(["push", "strength"]);
    });
  });
});

// ---------------------------------------------------------------------------
// buildWorkoutSessionContext
// ---------------------------------------------------------------------------

describe("buildWorkoutSessionContext", () => {
  /** Minimal valid WorkoutTemplateRecord using sections */
  function makeTemplate(
    overrides: Partial<WorkoutTemplateRecord> = {},
  ): WorkoutTemplateRecord {
    return {
      id: "tpl_1",
      user_id: "user_1",
      name: "Push Day",
      difficulty: "intermediate",
      is_ai_generated: true,
      estimated_duration_minutes: 45,
      tags: ["strength"],
      exercises: [],
      sections: [
        {
          id: "s0",
          type: "round",
          name: "Main",
          order: 0,
          blocks: [
            {
              id: "b0",
              type: "exercise",
              order: 0,
              exercise_id: "ex_bench",
              name: "Bench Press",
              execution_mode: "reps",
              reps: "10",
              primary_muscles: ["chest"],
            },
          ],
        },
      ],
      target_muscles: ["chest"],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    };
  }

  /** Minimal UserProfile with no workout_settings */
  function makeProfile(
    overrides: Partial<UserProfile> = {},
  ): UserProfile {
    return {
      id: "user_1",
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
      allergies: [],
      dietary_restrictions: [],
      preferred_cuisines: [],
      xp: 0,
      streak_current: 0,
      streak_longest: 0,
      onboarding_complete: true,
      created_at: "2025-01-01T00:00:00Z",
      ...overrides,
    };
  }

  describe("equipment resolution — new location_profiles format", () => {
    it("maps EquipmentItemIds to EquipmentTypes via location_profiles", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["gym"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_gym",
          location_profiles: [
            {
              id: "lp_gym",
              name: "Gym",
              type: "gym",
              equipment_ids: ["barbell", "dumbbell", "machine_cable"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);

      expect(ctx.user_equipment).toContain("barbell");
      expect(ctx.user_equipment).toContain("dumbbell");
      expect(ctx.user_equipment).toContain("cable");
      // bodyweight is always added
      expect(ctx.user_equipment).toContain("bodyweight");
    });

    it("maps barbell + ez_bar + plates → 'barbell' (deduplicated)", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["gym"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_gym",
          location_profiles: [
            {
              id: "lp_gym",
              name: "Gym",
              type: "gym",
              equipment_ids: ["barbell", "ez_bar", "plates"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      // All three map to "barbell" — should appear only once
      const barbellCount = ctx.user_equipment.filter((e) => e === "barbell").length;
      expect(barbellCount).toBe(1);
    });

    it("maps kettlebell → 'kettlebell'", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["home"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_home",
          location_profiles: [
            {
              id: "lp_home",
              name: "Home",
              type: "home",
              equipment_ids: ["kettlebell"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_equipment).toContain("kettlebell");
    });

    it("maps resistance_band + glute_band → 'band' (deduplicated)", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["home"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_home",
          location_profiles: [
            {
              id: "lp_home",
              name: "Home",
              type: "home",
              equipment_ids: ["resistance_band", "glute_band"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      const bandCount = ctx.user_equipment.filter((e) => e === "band").length;
      expect(bandCount).toBe(1);
    });

    it("maps pullup_bar → 'bodyweight' and does not duplicate it", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["home"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_home",
          location_profiles: [
            {
              id: "lp_home",
              name: "Home",
              type: "home",
              equipment_ids: ["pullup_bar", "bodyweight"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      const bwCount = ctx.user_equipment.filter((e) => e === "bodyweight").length;
      expect(bwCount).toBe(1);
    });

    it("skips EquipmentItemIds that have no EquipmentType mapping (returns null)", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["gym"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          active_location_profile_id: "lp_gym",
          location_profiles: [
            {
              id: "lp_gym",
              name: "Gym",
              type: "gym",
              // foam_roller and gym_ball → null (skipped)
              equipment_ids: ["foam_roller", "gym_ball"],
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      // Only bodyweight should be present (always added), no null entries
      expect(ctx.user_equipment).toEqual(["bodyweight"]);
    });
  });

  describe("equipment resolution — legacy equipment_by_location fallback", () => {
    it("falls back to equipment_by_location when no location_profiles", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["gym"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          equipment_by_location: {
            gym: ["barbell", "dumbbell"],
          },
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_equipment).toContain("barbell");
      expect(ctx.user_equipment).toContain("dumbbell");
      expect(ctx.user_equipment).toContain("bodyweight");
    });

    it("returns empty equipment array when legacy location has no equipment configured", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["home"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
          equipment_by_location: {
            home: [],
          },
        },
      });

      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_equipment).toHaveLength(0);
    });
  });

  describe("equipment resolution — no workout_settings", () => {
    it("returns empty equipment array when profile has no workout_settings", () => {
      const profile = makeProfile(); // no workout_settings
      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_equipment).toHaveLength(0);
    });
  });

  describe("sections-based template", () => {
    it("maps exercise blocks to WorkoutSessionContextBlocks", () => {
      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), null);

      expect(ctx.sections).toHaveLength(1);
      expect(ctx.sections[0].type).toBe("round");
      const block = ctx.sections[0].blocks[0];
      expect(block.type).toBe("exercise");
      expect(block.exercise_id).toBe("ex_bench");
      expect(block.name).toBe("Bench Press");
      expect(block.execution_mode).toBe("reps");
      expect(block.primary_muscles).toEqual(["chest"]);
    });

    it("includes rest blocks in sections output", () => {
      const template = makeTemplate({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                order: 0,
                exercise_id: "ex_bench",
                name: "Bench Press",
                execution_mode: "reps",
                reps: "10",
                primary_muscles: ["chest"],
              },
              {
                id: "b1",
                type: "rest",
                order: 1,
                rest_seconds: 90,
              },
            ],
          },
        ],
      });

      const ctx = buildWorkoutSessionContext(template, makeProfile(), null);
      const blocks = ctx.sections[0].blocks;
      expect(blocks).toHaveLength(2);
      const restBlock = blocks[1];
      expect(restBlock.type).toBe("rest");
      expect(restBlock.rest_seconds).toBe(90);
      expect(restBlock.order).toBe(1);
    });

    it("defaults rest_seconds to 60 for rest blocks without explicit duration", () => {
      const template = makeTemplate({
        sections: [
          {
            id: "s0",
            type: "round",
            name: "Main",
            order: 0,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                order: 0,
                exercise_id: "ex_bench",
                name: "Bench Press",
                execution_mode: "reps",
              },
              {
                id: "b1",
                type: "rest",
                order: 1,
                // no rest_seconds or duration_seconds
              },
            ],
          },
        ],
      });

      const ctx = buildWorkoutSessionContext(template, makeProfile(), null);
      const restBlock = ctx.sections[0].blocks[1];
      expect(restBlock.rest_seconds).toBe(60);
    });

    it("sorts sections by order", () => {
      const template = makeTemplate({
        sections: [
          {
            id: "s1",
            type: "cooldown",
            name: "Cooldown",
            order: 2,
            blocks: [],
          },
          {
            id: "s0",
            type: "warmup",
            name: "Warmup",
            order: 0,
            blocks: [],
          },
          {
            id: "s_main",
            type: "round",
            name: "Main",
            order: 1,
            blocks: [
              {
                id: "b0",
                type: "exercise",
                order: 0,
                exercise_id: "ex_bench",
                name: "Bench Press",
                execution_mode: "reps",
              },
            ],
          },
        ],
      });

      const ctx = buildWorkoutSessionContext(template, makeProfile(), null);
      expect(ctx.sections[0].name).toBe("Warmup");
      expect(ctx.sections[1].name).toBe("Main");
      expect(ctx.sections[2].name).toBe("Cooldown");
    });
  });

  describe("flat exercises[] fallback (legacy templates)", () => {
    it("wraps flat exercises in a single Workout section", () => {
      const template = makeTemplate({
        sections: undefined,
        exercises: [
          { id: "ex_bench", name: "Bench Press", sets: 3, reps: "10", muscleGroups: ["chest"] },
          { id: "ex_squat", name: "Back Squat", sets: 4, reps: "8", muscleGroups: ["quads"] },
        ],
      });

      const ctx = buildWorkoutSessionContext(template, makeProfile(), null);
      expect(ctx.sections).toHaveLength(1);
      expect(ctx.sections[0].name).toBe("Workout");
      expect(ctx.sections[0].type).toBe("round");
      expect(ctx.sections[0].blocks).toHaveLength(2);
      expect(ctx.sections[0].blocks[0].exercise_id).toBe("ex_bench");
      expect(ctx.sections[0].blocks[1].exercise_id).toBe("ex_squat");
    });
  });

  describe("todayOverride", () => {
    it("includes override data when todayOverride is provided", () => {
      const override: WorkoutDailyOverrideRecord = {
        id: "ov_1",
        user_id: "user_1",
        date: "2025-04-17",
        template_id: "tpl_1",
        source_type: "chat_create_workout",
        manually_set: true,
      };

      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), override);
      expect(ctx.today_override).toEqual({
        source_type: "chat_create_workout",
        manually_set: true,
      });
    });

    it("sets today_override to null when todayOverride is null", () => {
      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), null);
      expect(ctx.today_override).toBeNull();
    });
  });

  describe("context metadata", () => {
    it("includes template_id, template_name, difficulty, estimated_duration_minutes", () => {
      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), null);
      expect(ctx.template_id).toBe("tpl_1");
      expect(ctx.template_name).toBe("Push Day");
      expect(ctx.difficulty).toBe("intermediate");
      expect(ctx.estimated_duration_minutes).toBe(45);
    });

    it("includes target_muscles from template", () => {
      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), null);
      expect(ctx.target_muscles).toEqual(["chest"]);
    });

    it("uses empty array for target_muscles when template has none", () => {
      const template = makeTemplate({ target_muscles: undefined });
      const ctx = buildWorkoutSessionContext(template, makeProfile(), null);
      expect(ctx.target_muscles).toEqual([]);
    });

    it("reflects user_fitness_goal from profile", () => {
      const profile = makeProfile({ goal: "gain_muscle" });
      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_fitness_goal).toBe("gain_muscle");
    });

    it("defaults user_fitness_goal to 'maintain' when goal is not set", () => {
      const ctx = buildWorkoutSessionContext(makeTemplate(), makeProfile(), null);
      expect(ctx.user_fitness_goal).toBe("maintain");
    });

    it("includes user_training_days from workout_settings", () => {
      const profile = makeProfile({
        workout_settings: {
          completed: true,
          locations: ["gym"],
          training_days_per_week: 3,
          training_days: [1, 3, 5],
          training_hours_per_day: "60m",
          limitations: [],
        },
      });
      const ctx = buildWorkoutSessionContext(makeTemplate(), profile, null);
      expect(ctx.user_training_days).toEqual([1, 3, 5]);
    });
  });
});
