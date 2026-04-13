import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { UserConfig } from "../../shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(join(__dirname, "../../data/notify-me.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  database.exec(schema);
  console.log("Database initialized");
}

export function getSettings(): UserConfig {
  const row = getDb()
    .prepare("SELECT * FROM settings WHERE id = 1")
    .get() as Record<string, unknown>;

  return {
    claudeApiKey: row.claude_api_key as string,
    elevenlabsApiKey: (row.elevenlabs_api_key as string) || undefined,
    model: (row.model as UserConfig["model"]) || "claude-sonnet-4-20250514",
    language: row.language as UserConfig["language"],
    summaryLength: row.summary_length as UserConfig["summaryLength"],
    bodyLength: row.body_length as UserConfig["bodyLength"],
    categories: JSON.parse(row.categories as string),
    timeRange: row.time_range as number,
    sources: JSON.parse(row.sources as string),
    scheduleTime: row.schedule_time as string,
    inkboxApiKey: (row.inkbox_api_key as string) || "",
    inkboxIdentityHandle: (row.inkbox_identity_handle as string) || "notify-me",
    deliveryEmail: (row.delivery_email as string) || "",
  };
}

export function updateSettings(config: Partial<UserConfig>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (config.claudeApiKey !== undefined) {
    fields.push("claude_api_key = ?");
    values.push(config.claudeApiKey);
  }
  if (config.elevenlabsApiKey !== undefined) {
    fields.push("elevenlabs_api_key = ?");
    values.push(config.elevenlabsApiKey);
  }
  if (config.model !== undefined) {
    fields.push("model = ?");
    values.push(config.model);
  }
  if (config.language !== undefined) {
    fields.push("language = ?");
    values.push(config.language);
  }
  if (config.summaryLength !== undefined) {
    fields.push("summary_length = ?");
    values.push(config.summaryLength);
  }
  if (config.bodyLength !== undefined) {
    fields.push("body_length = ?");
    values.push(config.bodyLength);
  }
  if (config.categories !== undefined) {
    fields.push("categories = ?");
    values.push(JSON.stringify(config.categories));
  }
  if (config.timeRange !== undefined) {
    fields.push("time_range = ?");
    values.push(config.timeRange);
  }
  if (config.sources !== undefined) {
    fields.push("sources = ?");
    values.push(JSON.stringify(config.sources));
  }
  if (config.scheduleTime !== undefined) {
    fields.push("schedule_time = ?");
    values.push(config.scheduleTime);
  }
  if (config.inkboxApiKey !== undefined) {
    fields.push("inkbox_api_key = ?");
    values.push(config.inkboxApiKey);
  }
  if (config.inkboxIdentityHandle !== undefined) {
    fields.push("inkbox_identity_handle = ?");
    values.push(config.inkboxIdentityHandle);
  }
  if (config.deliveryEmail !== undefined) {
    fields.push("delivery_email = ?");
    values.push(config.deliveryEmail);
  }

  if (fields.length > 0) {
    values.push(1);
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values
    );
  }
}
