import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-fallback-secret-change-in-prod";
const JWT_EXPIRES_IN = "8h";

export interface AuthUser {
  id: number;
  username: string;
  role: "owner" | "admin" | "collector";
}

// ===== Hashear contraseña (bcrypt) =====
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

// ===== Verificar contraseña =====
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ===== Generar JWT =====
export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ===== Verificar JWT =====
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return { id: decoded.id, username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

// ===== Extraer usuario del request (header Authorization) =====
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return verifyToken(token);
}

// ===== Rate limit simple en memoria (por IP) =====
// En Vercel serverless esto es por instancia; para producción usar Upstash Redis
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

// ===== Inicializar usuario por defecto si no existe =====
export async function ensureDefaultUsers() {
  try {
    const res = await query("SELECT COUNT(*)::int as n FROM users");
    if (res.rows[0].n === 0) {
      const defaultUsers = [
        { username: "dueno", password: "Dueno@2026.Kx7p", role: "owner" },
        { username: "admin1", password: "Admin@2026.Mq9r", role: "admin" },
        { username: "cobrador1", password: "Cobrad@2026.Lz4s", role: "collector" },
      ];
      for (const u of defaultUsers) {
        const hash = await hashPassword(u.password);
        await query(
          "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
          [u.username, hash, u.role]
        );
      }
      console.log("[auth] Usuarios por defecto creados");
    }
  } catch (e) {
    console.error("[auth] Error creando usuarios por defecto:", e);
  }
}

// ===== Sanitizar texto (prevenir XSS en inputs) =====
export function sanitize(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch] || ch)
    .slice(0, 1000);
}

// ===== Obtener IP del request =====
export function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
