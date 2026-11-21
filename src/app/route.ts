import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getAdminFromRequest } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// Ruta raíz /: detecta qué usuario es y lo redirige a su panel
// - Si tiene cookie de admin (super admin) → /admin/dashboard
// - Si tiene cookie de user normal → /dashboard
// - Si no tiene cookie → /login-simple
export async function GET(req: NextRequest) {
  // Verificar si es super admin
  const admin = getAdminFromRequest(req);
  if (admin) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }
  // Verificar si es usuario normal (dueño de casa, cobrador, cliente)
  const user = getUserFromRequest(req);
  if (user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  // No logueado → login unificado
  return NextResponse.redirect(new URL("/login-simple", req.url));
}
