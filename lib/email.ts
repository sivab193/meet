import nodemailer from "nodemailer";

export type EmailAttachment = { filename: string; content: string };
export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
};

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;

function getTransporter(): MailTransporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Send an email. If SMTP is not configured, log it to the console instead of
 * crashing (dev fallback). Returns true if the mail was accepted for delivery.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!smtpConfigured()) {
    console.log(
      "[email:dev] SMTP not configured; email not sent:",
      JSON.stringify({ to: input.to, subject: input.subject })
    );
    console.log(input.text);
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: "text/calendar",
      })),
    });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}
