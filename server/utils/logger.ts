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

// Environment-aware logging: suppress DEBUG logs in production
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Log helper para registrar eventos no console
 * Respects NODE_ENV to suppress verbose logging in production
 */
export async function log(options: LogOptions): Promise<void> {
  // Suppress DEBUG logs in production
  if (!isDevelopment && options.level === "debug") {
    return;
  }

  // Logar no console para desenvolvimento
  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    debug: "🔍"
  }[options.level];

  console.log(`${emoji} [${options.source}] ${options.message}`, options.details || "");
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
