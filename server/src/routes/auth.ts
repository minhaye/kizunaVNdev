import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { supabase } from "../supabase.js";

type AuthRole = "employee" | "leader" | "admin";

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

type AdminRow = {
  id: string;
  email: string;
  password: string;
};


type AuthTokenPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: "employees" | "admins";
};

// (password-reset handlers were removed per user's request)

const toPublicEmployee = (employee: EmployeeRow) => ({
  id: employee.id,
  name: employee.name,
  nationality: employee.nationality,
  email: employee.email,
  avatar_url: employee.avatar_url,
  role: employee.role,
  last_online: employee.last_online,
});

const toPublicAdmin = (admin: AdminRow) => ({
  id: admin.id,
  email: admin.email,
  role: "admin" as const,
});

const signToken = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
};

export const verifySignedPayload = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", env.authTokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  if (signature !== expected) return null;

  const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
  return JSON.parse(payloadRaw) as Record<string, unknown>;
};

const verifyToken = (token: string) => {
  const payload = verifySignedPayload(token) as Partial<AuthTokenPayload> | null;
  if (!payload || !payload.sub || !payload.exp || payload.exp < Date.now() || !payload.role || !payload.source) return null;
  return payload;
};

const fetchEmployeeByEmail = async (email: string) =>
  supabase.from("employees").select("*").eq("email", email).maybeSingle<EmployeeRow>();

const fetchAdminByEmail = async (email: string) =>
  supabase.from("admins").select("*").eq("email", email).maybeSingle<AdminRow>();

// password-reset DB helpers removed

const isStrongPassword = (pw: string) => {
  // At least 8 chars, with lower, upper, number
  return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw);
};

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

// password-reset token helpers removed

// simplified: direct fetch helpers are used by other auth handlers

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email và password là bắt buộc",
      });
    }

    const [employeeResult, adminResult] = await Promise.all([
      fetchEmployeeByEmail(email),
      fetchAdminByEmail(email),
    ]);

    if (employeeResult.error) {
      return res.status(500).json({ error: "Lỗi truy vấn dữ liệu đăng nhập." });
    }

    if (adminResult.error) {
      return res.status(500).json({ error: "Lỗi truy vấn dữ liệu đăng nhập." });
    }

    const employee = employeeResult.data;
    const admin = adminResult.data;

    if (employee && employee.password === password) {
      const nowIso = new Date().toISOString();
      await supabase.from("employees").update({ last_online: nowIso }).eq("id", employee.id);

      const token = signToken({
        sub: employee.id,
        email: employee.email,
        role: employee.role,
        source: "employees",
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: "Đăng nhập thành công",
        session: { access_token: token },
        user: { ...toPublicEmployee(employee), last_online: nowIso },
      });
    }

    if (admin && admin.password === password) {
      const token = signToken({
        sub: admin.id,
        email: admin.email,
        role: "admin",
        source: "admins",
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: "Đăng nhập thành công",
        session: { access_token: token },
        user: toPublicAdmin(admin),
      });
    }

    return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
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

    // basic email format check
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    if (typeof password !== "string" || !isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Mật khẩu không hợp lệ. Mật khẩu cần ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.",
      });
    }

    const safeName =
      typeof name === "string" && name.trim().length > 0 ? name.trim() : email.split("@")[0] ?? "Nhan vien";

    // check existing email in employees/admins to avoid duplicate
    const [empCheck, adminCheck] = await Promise.all([fetchEmployeeByEmail(email), fetchAdminByEmail(email)]);

    if (empCheck.error || adminCheck.error) {
      return res.status(500).json({ error: "Lỗi truy vấn cơ sở dữ liệu." });
    }

    if (empCheck.data || adminCheck.data) {
      return res.status(409).json({ error: "Email này đã được đăng ký. Vui lòng đăng nhập." });
    }

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

// password-reset handlers removed per user's request

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

    if (payload.source === "admins") {
      const { data: admin, error } = await supabase
        .from("admins")
        .select("id,email,password")
        .eq("id", payload.sub)
        .maybeSingle<AdminRow>();

      if (error) {
        return res.status(500).json({
          error: "Lỗi truy vấn người dùng",
        });
      }

      if (!admin) {
        return res.status(401).json({
          error: "Không tìm thấy người dùng",
        });
      }

      return res.json({
        success: true,
        user: toPublicAdmin(admin),
      });
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .select("id,name,nationality,email,avatar_url,role,last_online")
      .eq("id", payload.sub)
      .maybeSingle<EmployeeRow>();

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
