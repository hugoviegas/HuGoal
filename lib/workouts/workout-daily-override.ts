import { upsertWorkoutDailyOverride } from "@/lib/firestore/workouts";
import type { WorkoutDailyOverrideRecord } from "@/lib/firestore/workouts";

export async function applyDailyOverride(
  uid: string,
  date: string,
  patch: Omit<
    WorkoutDailyOverrideRecord,
    "id" | "user_id" | "date" | "created_at" | "updated_at"
  >,
  callbacks?: {
    onSuccess?: (record: WorkoutDailyOverrideRecord) => void;
  },
): Promise<WorkoutDailyOverrideRecord> {
  const record = await upsertWorkoutDailyOverride(uid, date, patch);
  callbacks?.onSuccess?.(record);
  return record;
}
