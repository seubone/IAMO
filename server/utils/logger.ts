import { db } from "./db";
import { systemLogs } from "@shared/schema";

type LogLevel = "info" | "warning" | "error" | "debug";

interface LogOptions {
  level: LogLevel;
  source: string;
  message: string;
  details?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log helper para registrar eventos no banco de dados
 */
export async function log(options: LogOptions): Promise<void> {
  try {
    await db.insert(systemLogs).values({
      level: options.level,
      source: options.source,
      message: options.message,
      details: options.details || null,
      userId: options.userId || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    });

    // Também logar no console para desenvolvimento
    const emoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      debug: "🔍"
    }[options.level];

    console.log(`${emoji} [${options.source}] ${options.message}`, options.details || "");
  } catch (error) {
    // Se falhar ao salvar no banco, pelo menos logar no console
    console.error("Failed to save log to database:", error);
    console.log(`[${options.level}] [${options.source}] ${options.message}`);
  }
}

// Helper functions para facilitar uso
export const logger = {
  info: (source: string, message: string, details?: any, userId?: string) =>
    log({ level: "info", source, message, details, userId }),

  warning: (source: string, message: string, details?: any, userId?: string) =>
    log({ level: "warning", source, message, details, userId }),

  error: (source: string, message: string, details?: any, userId?: string) =>
    log({ level: "error", source, message, details, userId }),

  debug: (source: string, message: string, details?: any, userId?: string) =>
    log({ level: "debug", source, message, details, userId }),
};
