import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readJsonBody } from "@/lib/security";
import {
  getSiteName,
  setSiteName,
  getSecondaryName,
  setSecondaryName,
  getSocials,
  setSocials,
  getAboutBlocks,
  setAboutBlocks,
  getFooterInfo,
  setFooterInfo,
} from "@/lib/settings";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ensureSeed();
  return NextResponse.json({
    siteName: getSiteName(),
    secondaryName: getSecondaryName(),
    socials: getSocials(),
    aboutBlocks: getAboutBlocks(),
    footerInfo: getFooterInfo(),
  });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody<{
    siteName?: unknown;
    secondaryName?: unknown;
    socials?: unknown;
    aboutBlocks?: unknown;
    footerInfo?: unknown;
  }>(req, 20_000);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  try {
    if (body.data.siteName !== undefined) {
      const siteName = String(body.data.siteName ?? "").trim().slice(0, 80);
      if (siteName.length < 2) throw new Error("Название: минимум 2 символа");
      setSiteName(siteName);
    }

    if (body.data.secondaryName !== undefined) {
      setSecondaryName(String(body.data.secondaryName ?? ""));
    }

    if (body.data.socials !== undefined) {
      const s = body.data.socials;
      if (!s || typeof s !== "object") throw new Error("Некорректные соцсети");
      setSocials(s as Record<string, unknown>);
    }

    if (body.data.aboutBlocks !== undefined) {
      setAboutBlocks(body.data.aboutBlocks);
    }

    if (body.data.footerInfo !== undefined) {
      const f = body.data.footerInfo;
      if (!f || typeof f !== "object") throw new Error("Некорректные данные футера");
      setFooterInfo(f as Record<string, unknown>);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка сохранения" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    siteName: getSiteName(),
    secondaryName: getSecondaryName(),
    socials: getSocials(),
    aboutBlocks: getAboutBlocks(),
    footerInfo: getFooterInfo(),
  });
}
