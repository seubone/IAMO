import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";

type Role = "admin" | "operator" | "viewer";

const PERMISSIONS = {
  admin: ["*"],
  operator: [
    "ias:read",
    "ias:update",
    "tickets:read",
    "tickets:create",
    "tickets:update",
    "actions:read",
    "actions:create",
    "conversations:read",
    "conversations:update",
    "messages:read",
    "messages:create",
    "metrics:read",
  ],
  viewer: [
    "ias:read",
    "tickets:read",
    "actions:read",
    "conversations:read",
    "messages:read",
    "metrics:read",
  ],
};

export function requireRole(roles: Role | Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: "Permissão negada" });
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    const userRole = req.user.role as Role;
    const userPermissions = PERMISSIONS[userRole] || [];

    if (userPermissions.includes("*") || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ error: "Permissão negada" });
  };
}
