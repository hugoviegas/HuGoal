import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIProvider } from "@/types";
import { DEFAULT_MONTHLY_BUDGET_USD } from "./ai-cost-calculator";

const AS_KEY = "ai_usage_log_v1";

type LogEntry = {
  id: number;
  provider: AIProvider;
  timestamp: number;
  duration_ms: number;
  success: number; // 1 or 0
  error_type: string | null;
  cost_estimate: number | null;
};

function tryRequireExpoSqlite(): any | null {
  try {
    // use eval('require') to avoid static analysis bundlers trying to resolve
    // expo-sqlite for web builds where it isn't available.
    // eslint-disable-next-line no-eval
    const req: any = eval("require");
    return req("expo-sqlite");
  } catch (_e) {
    return null;
  }
}

const sqliteModule = tryRequireExpoSqlite();
let useSqlite = Boolean(sqliteModule);

let sqliteDb: any = null;
function getSqliteDb() {
  if (!sqliteModule) return null;
  if (!sqliteDb) sqliteDb = sqliteModule.openDatabase("ai_usage.db");
  return sqliteDb;
}

function execSql<T = any>(sql: string, args: any[] = []): Promise<T> {
  const db = getSqliteDb();
  if (!db) return Promise.reject(new Error("sqlite not available"));
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        args,
        (_: any, result: any) => resolve(result as unknown as T),
        (_: any, err: any) => {
          reject(err);
          return false;
        },
      );
    });
  });
}

async function readAllFromAsync(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(AS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ai-usage-tracker] readAllFromAsync failed", e);
    return [];
  }
}

async function writeAllToAsync(rows: LogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(AS_KEY, JSON.stringify(rows));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ai-usage-tracker] writeAllToAsync failed", e);
  }
}

export async function initUsageDb(): Promise<void> {
  if (useSqlite) {
    try {
      const sql = `CREATE TABLE IF NOT EXISTS ai_usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT,
        timestamp INTEGER,
        duration_ms INTEGER,
        success INTEGER,
        error_type TEXT,
        cost_estimate REAL
      );`;
      await execSql(sql);
      return;
    } catch (e) {
      // fallback to AsyncStorage on any SQLite failure
      // eslint-disable-next-line no-console
      console.warn(
        "[ai-usage-tracker] sqlite init failed, falling back to AsyncStorage",
        e,
      );
      useSqlite = false;
    }
  }

  // ensure AsyncStorage key exists
  const existing = await readAllFromAsync();
  if (!existing) {
    await writeAllToAsync([]);
  }
}

export async function logUsage(
  provider: AIProvider,
  durationMs: number,
  success: boolean,
  errorType: string | null,
  costEstimate: number | null,
): Promise<void> {
  if (useSqlite) {
    try {
      await initUsageDb();
      const now = Date.now();
      const sql = `INSERT INTO ai_usage_log (provider, timestamp, duration_ms, success, error_type, cost_estimate)
        VALUES (?, ?, ?, ?, ?, ?)`;
      await execSql(sql, [
        provider,
        now,
        durationMs,
        success ? 1 : 0,
        errorType,
        costEstimate,
      ]);
      return;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "[ai-usage-tracker] sqlite log failed, switching to AsyncStorage",
        e,
      );
      useSqlite = false;
    }
  }

  // AsyncStorage fallback
  try {
    const rows = await readAllFromAsync();
    const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    const entry: LogEntry = {
      id: nextId,
      provider,
      timestamp: Date.now(),
      duration_ms: durationMs,
      success: success ? 1 : 0,
      error_type: errorType,
      cost_estimate: costEstimate,
    };
    rows.push(entry);
    await writeAllToAsync(rows);
  } catch (err) {
    // best-effort
    // eslint-disable-next-line no-console
    console.error("[ai-usage-tracker] logUsage (async) failed", err);
  }
}

export async function getUsageThisMonth(): Promise<{
  requests_count: number;
  total_cost: number;
}> {
  if (useSqlite) {
    try {
      await initUsageDb();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const since = startOfMonth.getTime();

      const res: any = await execSql(
        `SELECT COUNT(*) as count, IFNULL(SUM(cost_estimate),0) as total FROM ai_usage_log WHERE timestamp >= ?`,
        [since],
      );
      const rows = (res.rows && res.rows._array) || [];
      const first = rows[0] || { count: 0, total: 0 };
      return {
        requests_count: first.count ?? 0,
        total_cost: Number(first.total ?? 0),
      };
    } catch (e) {
      // sqlite failure -> fallback to async
      // eslint-disable-next-line no-console
      console.warn(
        "[ai-usage-tracker] sqlite query failed, falling back to AsyncStorage",
        e,
      );
      useSqlite = false;
    }
  }

  // AsyncStorage path
  const rows = await readAllFromAsync();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const since = startOfMonth.getTime();
  const filtered = rows.filter((r) => r.timestamp >= since);
  const total = filtered.reduce(
    (s, r) => s + (Number(r.cost_estimate ?? 0) || 0),
    0,
  );
  return { requests_count: filtered.length, total_cost: Number(total) };
}

export async function getRecentLogs(limit = 20) {
  if (useSqlite) {
    try {
      await initUsageDb();
      const res: any = await execSql(
        `SELECT * FROM ai_usage_log ORDER BY timestamp DESC LIMIT ?`,
        [limit],
      );
      const rows = (res.rows && res.rows._array) || [];
      return rows;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "[ai-usage-tracker] sqlite recent logs failed, falling back to AsyncStorage",
        e,
      );
      useSqlite = false;
    }
  }

  const rows = await readAllFromAsync();
  rows.sort((a, b) => b.timestamp - a.timestamp);
  return rows.slice(0, limit);
}

export function getDefaultMonthlyBudget() {
  return DEFAULT_MONTHLY_BUDGET_USD;
}

export default {
  initUsageDb,
  logUsage,
  getUsageThisMonth,
  getRecentLogs,
  getDefaultMonthlyBudget,
};
