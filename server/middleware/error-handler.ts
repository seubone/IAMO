import { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  let message = err.message || "Internal Server Error";
  let code = err.code || "INTERNAL_ERROR";

  // Log errors
  if (statusCode >= 500) {
    console.error("💥 Server Error:", {
      message,
      code,
      stack: err.stack,
    });
  } else if (statusCode >= 400) {
    console.warn("⚠️ Client Error:", {
      message,
      code,
      statusCode,
    });
  }

  // Don't expose stack traces in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
