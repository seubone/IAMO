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
 * Log helper para registrar eventos no console
 */
export async function log(options: LogOptions): Promise<void> {
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
