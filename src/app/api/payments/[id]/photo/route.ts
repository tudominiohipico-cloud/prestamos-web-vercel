import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { uploadBuffer } from "@/lib/cloudinary";

// POST /api/payments/{id}/photo  (multipart/form-data con campo "photo")
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isFinite(paymentId) || paymentId < 1) {
    return NextResponse.json({ error: "id inválido" }, { status: 422 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("photo");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No se adjuntó foto" }, { status: 400 });
    }
    // Validar tipo y tamaño (máx 5 MB)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo no es imagen" }, { status: 422 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera 5 MB" }, { status: 422 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const photoUrl = await uploadBuffer(buf, "comprobantes");
    await query("UPDATE payments SET photo_url = $1 WHERE id = $2", [photoUrl, paymentId]);
    await logAudit({
      userId: user.id, action: "upload_payment_photo", entity: "payment",
      entityId: paymentId, ip: getIp(req),
      details: { photo_url: photoUrl },
    });
    return NextResponse.json({ message: "Foto subida", photo_url: photoUrl });
  } catch (e: any) {
    console.error("[payments/photo] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
