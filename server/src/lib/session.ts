import type { Request } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";

export type AuthRole = "employee" | "leader" | "admin";
export type AuthSource = "employees" | "admins";

export type SessionPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: AuthSource;
};

export const verifySessionToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  try {
    const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as Partial<SessionPayload>;
    if (!payload.sub || !payload.exp || payload.exp < Date.now() || !payload.role || !payload.source) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
};

export const getSessionFromRequest = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return verifySessionToken(authHeader.substring(7));
};