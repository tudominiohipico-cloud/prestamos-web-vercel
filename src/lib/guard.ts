// Helper compartido para API routes - valida que el request esté autenticado
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, type AuthUser } from "./auth";

export interface AuthContext {
  user: AuthUser;
}

export function requireUser(req: NextRequest): AuthUser | null {
  return getUserFromRequest(req);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function forbidden(msg = "No tienes permiso para esta acción"): NextResponse {
  return NextResponse.json({ error: msg }, { status: 403 });
}

// Verifica que el usuario tenga uno de los roles permitidos
export function requireRole(req: NextRequest, roles: string[]): AuthUser | NextResponse {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  if (!roles.includes(user.role)) return forbidden();
  return user;
}
