import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readJsonBody } from "@/lib/security";
import { getReportEmail, setReportEmail } from "@/lib/settings";
import { sendOrdersReport, getCurrentMonthRange, getPreviousMonthRange } from "@/lib/report";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ reportEmail: getReportEmail() });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody<{ reportEmail?: unknown }>(req, 2000);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  try {
    const reportEmail = setReportEmail(String(body.data.reportEmail ?? ""));
    return NextResponse.json({ ok: true, reportEmail });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка сохранения" },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody<{ period?: unknown }>(req, 200);
  const period = body.ok && body.data.period === "previous" ? "previous" : "current";

  try {
    const range = period === "previous" ? getPreviousMonthRange() : getCurrentMonthRange();
    const result = await sendOrdersReport(range);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось отправить отчёт" },
      { status: 500 }
    );
  }
}
