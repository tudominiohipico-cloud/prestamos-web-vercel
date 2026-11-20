import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  const css = fs.readFileSync(cssPath, "utf8");
  return new NextResponse(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
