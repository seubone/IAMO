import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Evolution DB
  EVOLUTION_DB_HOST: z.string().min(1, "EVOLUTION_DB_HOST is required"),
  EVOLUTION_DB_PORT: z.string().default("5432"),
  EVOLUTION_DB_NAME: z.string().min(1, "EVOLUTION_DB_NAME is required"),
  EVOLUTION_DB_USER: z.string().min(1, "EVOLUTION_DB_USER is required"),
  EVOLUTION_DB_PASSWORD: z.string().min(1, "EVOLUTION_DB_PASSWORD is required"),

  // Security
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  // Server
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // Uazapi
  UAZAPI_BASE_URL: z.string().url().optional().default("https://quatro-cinco.uazapi.com"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}
