import { NextRequest, NextResponse } from "next/server";
import { query } from "./db";
import { getUserFromRequest, type AuthUser } from "./auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.JWT_SECRET + "-admin" || "admin-fallback-secret-change-in-prod";

// ===== Rol extendido con house_id y tipo de admin =====
export interface AdminUser extends AuthUser {
  is_super_admin?: boolean;  // true: dueño del sistema (tú)
  house_id?: number | null;  // si no es super admin, a qué casa pertenece
}

// Hash
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ===== Token de admin (separado del token normal) =====
export function signAdminToken(user: AdminUser): string {
  return jwt.sign(user, ADMIN_JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminUser;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      is_super_admin: decoded.is_super_admin || false,
      house_id: decoded.house_id || null,
    };
  } catch {
    return null;
  }
}

// ===== Extraer admin del request (cookie) =====
export function getAdminFromRequest(req: NextRequest): AdminUser | null {
  const cookieToken = req.cookies.get("pw_admin")?.value;
  if (cookieToken) {
    const u = verifyAdminToken(cookieToken);
    if (u) return u;
  }
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return verifyAdminToken(token);
}

export function setAdminCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set("pw_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  return res;
}

export function clearAdminCookie(res: NextResponse): NextResponse {
  res.cookies.delete("pw_admin");
  return res;
}

// ===== Rate limit simple en memoria (por IP) =====
const attempts: Record<string, { count: number; resetAt: number }> = {};

export function checkRateLimit(ip: string, max = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const rec = attempts[ip];
  if (!rec || now > rec.resetAt) {
    attempts[ip] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  if (rec.count >= max) return false;
  rec.count++;
  return true;
}

// ===== Asegurar que existe el super-admin (tú, dueño del sistema) =====
export async function ensureSuperAdmin() {
  try {
    const res = await query("SELECT id FROM admin_users WHERE is_super_admin = TRUE LIMIT 1");
    if (res.rows.length === 0) {
      // Crear super-admin por defecto: bolivar / liam1414
      const hash = await hashPassword("liam1414");
      await query(
        `INSERT INTO admin_users (username, password_hash, role, is_super_admin, house_id)
         VALUES ($1, $2, $3, TRUE, NULL)
         ON CONFLICT (username) DO NOTHING`,
        ["bolivar", hash, "super_admin"]
      );
      console.log("[admin-auth] Super-admin creado: bolivar / liam1414");
    }
  } catch (e) {
    console.error("[admin-auth] Error creando super-admin:", e);
  }
}

// ===== Sanitizar =====
export function sanitizeAdmin(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch] || ch).slice(0, 1000);
}

export function getIpAdmin(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
