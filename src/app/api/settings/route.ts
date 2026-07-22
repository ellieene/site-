import { NextResponse } from "next/server";
import {
  getSiteName,
  getSecondaryName,
  getSocials,
  getAboutBlocks,
  getFooterInfo,
} from "@/lib/settings";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  ensureSeed();
  return NextResponse.json({
    siteName: getSiteName(),
    secondaryName: getSecondaryName(),
    socials: getSocials(),
    aboutBlocks: getAboutBlocks(),
    footerInfo: getFooterInfo(),
  });
}
