import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { User } from "@shared/schema";
import { verifySupabaseToken } from "../supabase";

// Validação obrigatória do JWT_SECRET em produção
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET é obrigatório em produção! Defina a variável de ambiente JWT_SECRET.");
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: User & { supabaseId?: string };
  supabaseUser?: any;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    // Try Supabase token first (preferred)
    const { user: supabaseUser, error: supabaseError } = await verifySupabaseToken(token);

    if (supabaseUser) {
      req.supabaseUser = supabaseUser;
      // Attach minimal user info - should be synced with local DB
      req.user = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || supabaseUser.email || "User",
        role: "viewer", // Default role, should be fetched from local DB based on supabaseUser.id
        supabaseId: supabaseUser.id,
      } as User & { supabaseId?: string };
      return next();
    }

    // Fall back to JWT token for backward compatibility
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
}
