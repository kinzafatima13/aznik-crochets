import nodemailer from "nodemailer";

export async function sendOrderEmail(input: {
  to: string;
  orderId: string;
  name: string;
  pieces: string;
  totalPkr: number;
}): Promise<{ sent: boolean }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.ORDER_FROM_EMAIL || user;
  if (!host || !user || !pass || !from || !input.to) return { sent: false };
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
  const text = [
    `Thank you for your order of ${input.pieces}.`,
    ``,
    `Order ${input.orderId}`,
    `Name: ${input.name}`,
    `Total: Rs. ${input.totalPkr.toLocaleString("en-PK")}`,
    ``,
    `This order is cash on delivery. Please keep the total ready for the courier.`,
    `Aznik Crochets`,
  ].join("\n");
  await transport.sendMail({
    from: `Aznik Crochets <${from}>`,
    to: input.to,
    bcc: from,
    subject: `Thank you for your order of ${input.pieces}`,
    text,
  });
  return { sent: true };
}
