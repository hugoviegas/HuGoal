import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { NutritionReminder, NutritionReminderSchedule } from "@/types";

function remindersCollection(uid: string) {
  return collection(db, "users", uid, "nutrition_reminders");
}

function sanitizeWeekdays(weekdays: number[]): number[] {
  return Array.from(
    new Set(
      weekdays
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b),
    ),
  );
}

function sanitizeSchedule(
  schedule: NutritionReminderSchedule,
): NutritionReminderSchedule {
  const safeTime = /^\d{2}:\d{2}$/.test(schedule.time)
    ? schedule.time
    : "09:00";

  return {
    time: safeTime,
    weekdays: sanitizeWeekdays(schedule.weekdays),
    timezone: schedule.timezone,
  };
}

function sanitizeReminder(
  reminder: Omit<
    NutritionReminder,
    "id" | "user_id" | "created_at" | "updated_at"
  >,
): Omit<NutritionReminder, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    ...reminder,
    title: reminder.title.trim() || "Nutrition reminder",
    body: reminder.body.trim() || "Time to log your nutrition.",
    schedule: sanitizeSchedule(reminder.schedule),
    repeat_interval_minutes:
      typeof reminder.repeat_interval_minutes === "number" &&
      Number.isFinite(reminder.repeat_interval_minutes)
        ? Math.max(0, Math.round(reminder.repeat_interval_minutes))
        : undefined,
  };
}

export async function listNutritionReminders(
  uid: string,
): Promise<NutritionReminder[]> {
  const snapshot = await getDocs(
    query(remindersCollection(uid), orderBy("updated_at", "desc")),
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data() as Omit<NutritionReminder, "id">;
    return {
      ...data,
      id: entry.id,
    };
  });
}

export async function upsertNutritionReminder(
  uid: string,
  input: Omit<
    NutritionReminder,
    "id" | "user_id" | "created_at" | "updated_at"
  >,
  reminderId?: string,
): Promise<NutritionReminder> {
  const now = new Date().toISOString();
  const reference = reminderId
    ? doc(db, "users", uid, "nutrition_reminders", reminderId)
    : doc(remindersCollection(uid));

  const payload = sanitizeReminder(input);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(reference);
    const writePayload: NutritionReminder = {
      id: reference.id,
      user_id: uid,
      ...payload,
      created_at: existing.exists()
        ? ((existing.data().created_at as string | undefined) ?? now)
        : now,
      updated_at: now,
    };

    tx.set(reference, writePayload, { merge: true });
  });

  return {
    id: reference.id,
    user_id: uid,
    ...payload,
    created_at: now,
    updated_at: now,
  };
}

export async function deleteNutritionReminder(
  uid: string,
  reminderId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "nutrition_reminders", reminderId));
}
