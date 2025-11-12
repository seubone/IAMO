import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { validateEnv } from "./config/env";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./utils/vite";
import { seedData } from "./scripts/seed";
import "./config/evolution-db"; // Initialize Evolution DB connection

// Validate environment variables on startup
const env = validateEnv();
console.log("✅ Environment variables validated");

const app = express();

// Security: Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:5173']; // Default for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Add request size limits
app.use(express.json({ limit: "10mb" })); // Limit JSON payload size
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Apenas logar erros (4xx, 5xx) e requisições lentas
      const isError = res.statusCode >= 400;
      const isSlowRequest = duration > 1000; // Mais de 1 segundo
      const shouldLog = isError || isSlowRequest;

      if (shouldLog) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  // Seed data on startup in development
  if (app.get("env") === "development") {
    try {
      await seedData();
    } catch (error) {
      console.error("❌ Erro ao executar seed de dados:", error instanceof Error ? error.message : error);
      console.log("⚠️ Continuando sem seed. O banco pode estar indisponível.");
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
