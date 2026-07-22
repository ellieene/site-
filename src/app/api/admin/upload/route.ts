import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { isAdminAuthenticated } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`upload:${ip}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Слишком много загрузок" }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Размер файла: до 5 МБ" },
      { status: 400 }
    );
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Только JPG, PNG, WEBP или GIF" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);

  return NextResponse.json({ ok: true, url: `/uploads/${name}` });
}
