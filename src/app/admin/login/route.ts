import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// /admin/login ahora redirige a /login-simple
// (un solo login para todos: clientes, dueños de casa, super admin)
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/login-simple", req.url));
}
