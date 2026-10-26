/**
 * Minimal structured (JSON) logger. One JSON object per line is easy to search
 * in any log tool (Vercel, Datadog, CloudWatch).
 *
 * Privacy rule: never log resume text — it is personal data (PII).
 * Log sizes, durations, ids and outcomes only.
 */
type Level = "info" | "warn" | "error";

function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields),
};
