import nodemailer from "nodemailer";

/** SMTP настраивается в .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD */
export function getMailer() {
  const host = process.env.SMTP_HOST || "smtp.mail.ru";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}
