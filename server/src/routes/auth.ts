import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../env.js";
import { sendOtpEmail } from "../mailer.js";
import { supabase } from "../supabase.js";
import { loadAccountSettings, touchAccountHeartbeat } from "../lib/account-settings.js";

type AuthRole = "employee" | "leader" | "admin";

type EmployeeRow = {
  id: string;
  name: string;
  nationality: "vn" | "jp";
  email: string;
  password: string;
  avatar_url: string | null;
  role: "employee" | "leader";
  status?: "active" | "inactive" | null;
  last_online: string | null;
};

type AdminRow = {
  id: string;
  email: string;
  password: string;
};

type PasswordResetRow = {
  id: string;
  email: string;
  source: "employees" | "admins";
  otp_hash: string;
  otp_expires_at: string;
  reset_token: string | null;
  reset_expires_at: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
};


type AuthTokenPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: "employees" | "admins";
};

const OTP_TTL_MS = 3 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;

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

const fetchPasswordResetByEmail = async (email: string) =>
  supabase.from("password_reset_otps").select("*").eq("email", email).maybeSingle<PasswordResetRow>();

const fetchPasswordResetByToken = async (token: string) =>
  supabase.from("password_reset_otps").select("*").eq("reset_token", token).maybeSingle<PasswordResetRow>();

const isStrongPassword = (pw: string) => {
  // At least 8 chars, with lower, upper, number
  return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw);
};

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");

const parseDbTime = (value: string | null) => {
  if (!value) return null;
  const hasTimezone = /z$|[+-]\d{2}:\d{2}$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

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
      if (employee.status === "inactive") {
        return res.status(403).json({ error: "アカウントが無効になっています / Tài khoản đã bị vô hiệu hóa." });
      }
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

      const nowIso = new Date().toISOString();
      await touchAccountHeartbeat({ sub: admin.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000, role: "admin", source: "admins" }).catch(() => null);
      const adminSettings = await loadAccountSettings({ sub: admin.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000, role: "admin", source: "admins" }).catch(() => null);

      return res.json({
        success: true,
        message: "Đăng nhập thành công",
        session: { access_token: token },
        user: { ...toPublicAdmin(admin), last_online: adminSettings?.last_online ?? nowIso },
      });
    }

    return res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています / Email hoặc mật khẩu không đúng." });
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

export const forgotPasswordRequestHandler = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ error: "Email la bat buoc" });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Email khong hop le" });
    }

    const [employeeResult, adminResult] = await Promise.all([
      fetchEmployeeByEmail(email),
      fetchAdminByEmail(email),
    ]);

    if (employeeResult.error || adminResult.error) {
      return res.status(500).json({ error: "Loi truy van du lieu" });
    }

    const employee = employeeResult.data;
    const admin = adminResult.data;

    if (!employee && !admin) {
      return res.status(404).json({ error: "Email khong ton tai" });
    }

    const source: PasswordResetRow["source"] = employee ? "employees" : "admins";
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: upsertError } = await supabase.from("password_reset_otps").upsert(
      {
        email,
        source,
        otp_hash: otpHash,
        otp_expires_at: otpExpiresAt,
        reset_token: null,
        reset_expires_at: null,
        used_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

    if (upsertError) {
      return res.status(500).json({ error: "Khong the tao yeu cau OTP" });
    }

    await sendOtpEmail({
      to: email,
      otp,
      expiresMinutes: Math.round(OTP_TTL_MS / 60000),
    });

    return res.json({
      success: true,
      message: "Da gui ma OTP toi email cua ban",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Loi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const forgotPasswordVerifyHandler = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!email || !otp) {
      return res.status(400).json({ error: "Email va OTP la bat buoc" });
    }

    const { data: resetRow, error } = await fetchPasswordResetByEmail(email);

    if (error) {
      return res.status(500).json({ error: "Loi truy van OTP" });
    }

    if (!resetRow) {
      return res.status(404).json({ error: "Khong tim thay yeu cau dat lai mat khau" });
    }

    const otpExpiresAt = parseDbTime(resetRow.otp_expires_at);
    if (!otpExpiresAt) {
      return res.status(400).json({ error: "OTP khong hop le" });
    }

    if (otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "OTP da het han" });
    }

    if (hashOtp(otp) !== resetRow.otp_hash) {
      return res.status(400).json({ error: "OTP khong dung" });
    }

    const resetToken = crypto.randomBytes(32).toString("base64url");
    const resetExpiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

    const { error: updateError } = await supabase
      .from("password_reset_otps")
      .update({
        reset_token: resetToken,
        reset_expires_at: resetExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resetRow.id);

    if (updateError) {
      return res.status(500).json({ error: "Khong the tao ma dat lai mat khau" });
    }

    return res.json({
      success: true,
      message: "Xac minh thanh cong",
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Loi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const forgotPasswordResetHandler = async (req: Request, res: Response) => {
  try {
    const resetToken = typeof req.body?.resetToken === "string" ? req.body.resetToken.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({ error: "Du lieu dat lai mat khau khong hop le" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Mat khau xac nhan khong khop" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: "Mat khau can it nhat 8 ky tu, gom chu hoa, chu thuong va so",
      });
    }

    const { data: resetRow, error } = await fetchPasswordResetByToken(resetToken);

    if (error) {
      return res.status(500).json({ error: "Loi truy van phien dat lai mat khau" });
    }

    if (!resetRow) {
      return res.status(404).json({ error: "Phien dat lai mat khau khong ton tai" });
    }

    if (resetRow.used_at) {
      return res.status(400).json({ error: "Phien dat lai mat khau da duoc su dung" });
    }

    const resetExpiresAt = parseDbTime(resetRow.reset_expires_at);
    if (!resetExpiresAt || resetExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "Phien dat lai mat khau da het han" });
    }

    const targetTable = resetRow.source === "admins" ? "admins" : "employees";
    const { error: updateUserError } = await supabase
      .from(targetTable)
      .update({ password })
      .eq("email", resetRow.email);

    if (updateUserError) {
      return res.status(500).json({ error: "Khong the cap nhat mat khau" });
    }

    const { error: finalizeError } = await supabase
      .from("password_reset_otps")
      .update({
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", resetRow.id);

    if (finalizeError) {
      return res.status(500).json({ error: "Khong the hoan tat dat lai mat khau" });
    }

    return res.json({
      success: true,
      message: "Doi mat khau thanh cong",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Loi server",
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

      const adminSettings = await loadAccountSettings({
        sub: payload.sub!,
        exp: payload.exp!,
        role: "admin",
        source: "admins",
      }).catch(() => null);

      return res.json({
        success: true,
        user: { ...toPublicAdmin(admin), last_online: adminSettings?.last_online ?? null },
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
