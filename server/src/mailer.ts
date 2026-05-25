import nodemailer from "nodemailer";
import { env } from "./env.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

type SendOtpEmailParams = {
  to: string;
  otp: string;
  expiresMinutes: number;
};

export const sendOtpEmail = async ({ to, otp, expiresMinutes }: SendOtpEmailParams) => {
  const subject = "Ma OTP dat lai mat khau";
  const text = [
    "Ban vua yeu cau dat lai mat khau tai KizunaVN.",
    "Ma OTP cua ban:",
    otp,
    `Ma co hieu luc trong ${expiresMinutes} phut.`,
    "Neu ban khong yeu cau, vui long bo qua email nay.",
  ].join("\n");

  await transporter.sendMail({
    from: `${env.smtpFromName} <${env.smtpFromEmail}>`,
    to,
    subject,
    text,
  });
};
