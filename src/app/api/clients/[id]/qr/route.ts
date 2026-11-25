import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import QRCode from "qrcode";

// GET /api/clients/[id]/qr — devuelve el QR del cliente (como data URL PNG)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId) || clientId < 1) {
    return NextResponse.json({ error: "id inválido" }, { status: 422 });
  }
  try {
    const res = await query("SELECT id, name, qr_token FROM clients WHERE id = $1", [clientId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    const client = res.rows[0];
    if (!client.qr_token) {
      return NextResponse.json({ error: "Cliente sin QR token" }, { status: 404 });
    }
    // El contenido del QR es una URL que apunta a /cobrar?token=XXX
    // El motorizado escanea esto y el sistema abre la página de cobro
    const host = req.headers.get("host") || "prestamos-web-eight.vercel.app";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const qrUrl = `${protocol}://${host}/cobrar-qr?token=${client.qr_token}`;

    const qrImage = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#0b2545", light: "#ffffff" },
    });

    return NextResponse.json({
      client_id: client.id,
      client_name: client.name,
      qr_token: client.qr_token,
      qr_url: qrUrl,
      qr_image: qrImage,
    });
  } catch (e: any) {
    console.error("[clients/qr] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
