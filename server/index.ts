import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Handle unhandled rejections globally (but don't exit, allows server to continue)
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
  // Don't exit - let the server continue despite unhandled rejections
});

// Determine which .env file to load based on NODE_ENV or default to .env
// This must be done BEFORE other dotenv.config() calls
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === "production"
  ? path.resolve(__dirname, "..", ".env.production")
  : path.resolve(__dirname, "..", ".env");

dotenv.config({ path: envFile });

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import { validateEnv } from "./config/env";
import { seedData } from "./scripts/seed";
import "./config/evolution-db"; // Initialize Evolution DB connection

// Lazy load routes to avoid issues with missing Evolution DB
let registerRoutes: any = null;

// Validate environment variables on startup
const env = validateEnv();
console.log("✅ Environment variables validated");

// Dynamic import for vite (dev only) to avoid loading it in production
let setupVite: ((app: any, server: any) => Promise<void>) | null = null;
let serveStaticFiles: ((app: any) => void) | null = null;
let log: any = (message: string) => console.log(`[express] ${message}`);

const app = express();

// Security: Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:5173']; // Default for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if origin is in the allowed list (works for both dev and production)
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
  try {
    // Load vite utilities only in development to avoid loading vite in production
    if (process.env.NODE_ENV === "development") {
      const viteUtils = await import("./utils/vite");
      setupVite = viteUtils.setupVite;
      log = viteUtils.log;
    } else {
      // Use static file serving in production
      serveStaticFiles = (app: any) => {
        const publicPath = path.resolve(__dirname, "..", "dist", "public");
        app.use(express.static(publicPath));
        // Fallback to index.html for SPA routing
        app.use("*", (req, res) => {
          res.sendFile(path.resolve(publicPath, "index.html"));
        });
      };
    }

    // Seed data on startup ONLY in development
    if (process.env.NODE_ENV === "development") {
      try {
        await seedData();
      } catch (error) {
        console.error("❌ Erro ao executar seed de dados:", error instanceof Error ? error.message : error);
        console.log("⚠️ Continuando sem seed. O banco pode estar indisponível.");
      }
    }

    // Registrar health check ANTES de tentar registrar routes complexas
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      });
    });

    let server;
    try {
      // Lazy load routes on demand
      if (!registerRoutes) {
        const routesModule = await import("./routes");
        registerRoutes = routesModule.registerRoutes;
      }
      server = await registerRoutes(app);
    } catch (routeError) {
      console.warn("⚠️ Erro ao registrar rotas avançadas:", routeError instanceof Error ? routeError.message : routeError);
      console.warn("⚠️ Servidor básico iniciado (sem WebSocket)...");
      // Criar um servidor HTTP básico se falhar ao registrar rotas
      server = createServer(app);
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      // Don't expose detailed error messages in production
      const message = process.env.NODE_ENV === 'production'
        ? (status === 500 ? "Internal Server Error" : err.message)
        : (err.message || "Internal Server Error");

      console.error("Error:", err);
      res.status(status).json({ message });
      // Don't throw - we already responded to the client
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "development" && setupVite) {
      await setupVite(app, server);
    } else if (process.env.NODE_ENV === "production" && serveStaticFiles) {
      serveStaticFiles(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.warn("⚠️ Erro ao iniciar servidor:", error instanceof Error ? error.message : error);
    console.warn("⚠️ Stack:", error instanceof Error ? error.stack : error);
    // Don't exit - server may still be partially functional
  }
})();
