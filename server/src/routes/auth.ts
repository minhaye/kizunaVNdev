import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { supabase } from "../supabase.js";

type EmployeeRow = {
  id: string;
  name: string;
  nationality: "vn" | "jp";
  email: string;
  password: string;
  avatar_url: string | null;
  role: "employee" | "leader";
  last_online: string | null;
};

const toPublicEmployee = (employee: EmployeeRow) => ({
  id: employee.id,
  name: employee.name,
  nationality: employee.nationality,
  email: employee.email,
  avatar_url: employee.avatar_url,
  role: employee.role,
  last_online: employee.last_online,
});

const signToken = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
};

const verifyToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const payload = JSON.parse(payloadRaw) as { sub: string; exp: number };
  if (!payload.sub || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email và password là bắt buộc",
      });
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .maybeSingle<EmployeeRow>();

    if (error) {
      return res.status(500).json({ error: "Lỗi truy vấn dữ liệu đăng nhập." });
    }

    if (!employee || employee.password !== password) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    }

    const nowIso = new Date().toISOString();
    await supabase.from("employees").update({ last_online: nowIso }).eq("id", employee.id);

    const token = signToken({
      sub: employee.id,
      email: employee.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Đăng nhập thành công",
      session: { access_token: token },
      user: { ...toPublicEmployee(employee), last_online: nowIso },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const signUpHandler = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email và password là bắt buộc",
      });
    }

    const safeName =
      typeof name === "string" && name.trim().length > 0 ? name.trim() : email.split("@")[0] ?? "Nhan vien";

    const { data, error } = await supabase
      .from("employees")
      .insert({
        name: safeName,
        nationality: "vn",
        email,
        password,
        role: "employee",
      })
      .select("id,name,nationality,email,avatar_url,role,last_online")
      .single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        return res.status(409).json({ error: "Email này đã được đăng ký. Vui lòng đăng nhập." });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      message: "Đăng ký thành công. Bạn có thể đăng nhập ngay.",
      user: data,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const logoutHandler = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "Đã đăng xuất",
  });
};

export const getMeHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token không hợp lệ",
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Token không hợp lệ hoặc hết hạn",
      });
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .select("id,name,nationality,email,avatar_url,role,last_online")
      .eq("id", payload.sub)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: "Lỗi truy vấn người dùng",
      });
    }

    if (!employee) {
      return res.status(401).json({
        error: "Không tìm thấy người dùng",
      });
    }

    return res.json({
      success: true,
      user: employee,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
