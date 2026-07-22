import ExcelJS from "exceljs";
import { getDb, type Order } from "./db";
import { getReportEmail } from "./settings";
import { getMailer } from "./mailer";

type DateRange = { start: string; end: string; label: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Диапазон [start, end) — прошлый календарный месяц (по UTC) */
export function getPreviousMonthRange(ref = new Date()): DateRange {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // текущий месяц, 0-based
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  return {
    start: `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-01 00:00:00`,
    end: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01 00:00:00`,
    label: `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}`,
  };
}

/** Диапазон [start, end) — текущий месяц по сегодняшний день (для теста) */
export function getCurrentMonthRange(ref = new Date()): DateRange {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const next = new Date(Date.UTC(y, m + 1, 1));
  return {
    start: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-01 00:00:00`,
    end: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01 00:00:00`,
    label: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}`,
  };
}

export function getOrdersInRange(start: string, end: string): Order[] {
  return getDb()
    .prepare("SELECT * FROM orders WHERE created_at >= ? AND created_at < ? ORDER BY created_at ASC")
    .all(start, end) as Order[];
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В работе",
  done: "Выполнен",
  cancelled: "Отменён",
};

export async function buildOrdersWorkbookBuffer(orders: Order[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Заказы");

  sheet.columns = [
    { header: "№ заказа", key: "id", width: 10 },
    { header: "Дата", key: "date", width: 20 },
    { header: "Телефон", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 22 },
    { header: "Товары", key: "items", width: 50 },
    { header: "Сумма, ₽", key: "total", width: 12 },
    { header: "Статус", key: "status", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const o of orders) {
    let items: { title: string; qty: number; price: number }[] = [];
    try {
      items = JSON.parse(o.items_json || "[]");
    } catch {
      items = [];
    }
    sheet.addRow({
      id: o.id,
      date: o.created_at,
      phone: o.phone,
      email: o.email || "",
      items: items.map((i) => `${i.title} × ${i.qty}`).join("; "),
      total: o.total,
      status: STATUS_LABELS[o.status] || o.status,
    });
  }

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

export async function sendOrdersReport(range: DateRange) {
  const orders = getOrdersInRange(range.start, range.end);
  const buffer = await buildOrdersWorkbookBuffer(orders);
  const to = getReportEmail();

  const transporter = getMailer();
  if (!transporter) {
    throw new Error("SMTP не настроен: заполните SMTP_USER и SMTP_PASSWORD в .env");
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `Отчёт по заказам за ${range.label}`,
    text: `Во вложении отчёт по заказам за ${range.label}. Всего заказов: ${orders.length}.`,
    attachments: [
      {
        filename: `orders-${range.label}.xlsx`,
        content: buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  return { ordersCount: orders.length, to, label: range.label };
}
