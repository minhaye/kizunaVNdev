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

type PasswordResetAccountType = "employee" | "admin";

type PasswordResetRequestRow = {
  id: string;
  email: string;
  account_type: PasswordResetAccountType;
  otp_hash: string;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  consumed_at: string | null;
  created_at: string;
};

type AuthTokenPayload = {
  sub: string;
  exp: number;
  role: AuthRole;
  source: "employees" | "admins";
};

type PasswordResetTokenPayload = {
  exp: number;
  email: string;
  accountType: PasswordResetAccountType;
  requestId: string;
  kind: "password_reset";
};

const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

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

const fetchResetRequestById = async (requestId: string) =>
  supabase
    .from("password_reset_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<PasswordResetRequestRow>();

const fetchLatestResetRequest = async (email: string, accountType: PasswordResetAccountType) =>
  supabase
    .from("password_reset_requests")
    .select("*")
    .eq("email", email)
    .eq("account_type", accountType)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

const isStrongPassword = (pw: string) => {
  // At least 8 chars, with lower, upper, number
  return /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw);
};

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const createOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const hashOtp = (requestId: string, otp: string) =>
  crypto.createHash("sha256").update(`${requestId}:${otp}:${env.authTokenSecret}`).digest("hex");
const signResetToken = (payload: PasswordResetTokenPayload) => signToken(payload);

const verifyResetToken = (token: string) => {
  const payload = verifySignedPayload(token) as Partial<PasswordResetTokenPayload> | null;
  if (
    !payload ||
    payload.kind !== "password_reset" ||
    !payload.accountType ||
    !payload.requestId ||
    !payload.email ||
    !payload.exp ||
    payload.exp < Date.now()
  ) {
    return null;
  }

  return payload as PasswordResetTokenPayload;
};

const getAccountByEmail = async (email: string) => {
  const [employeeResult, adminResult] = await Promise.all([
    fetchEmployeeByEmail(email),
    fetchAdminByEmail(email),
  ]);

  if (employeeResult.error || adminResult.error) {
    return { error: true as const };
  }

  if (employeeResult.data) {
    return { error: false as const, accountType: "employee" as const, account: employeeResult.data };
  }

  if (adminResult.data) {
    return { error: false as const, accountType: "admin" as const, account: adminResult.data };
  }

  return { error: false as const, accountType: null, account: null };
};

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

export const requestPasswordResetHandler = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ error: "Email là bắt buộc" });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    const accountResult = await getAccountByEmail(email);

    if (accountResult.error) {
      return res.status(500).json({ error: "Lỗi truy vấn cơ sở dữ liệu." });
    }

    if (!accountResult.account || !accountResult.accountType) {
      return res.status(404).json({ error: "Email này không tồn tại trong hệ thống." });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_OTP_TTL_MS).toISOString();
    const otp = createOtp();
    const requestId = crypto.randomUUID();

    await supabase
      .from("password_reset_requests")
      .update({ consumed_at: now.toISOString() })
      .eq("email", email)
      .eq("account_type", accountResult.accountType)
      .is("consumed_at", null);

    const { data: createdRequest, error } = await supabase
      .from("password_reset_requests")
      .insert({
        id: requestId,
        email,
        account_type: accountResult.accountType,
        otp_hash: hashOtp(requestId, otp),
        attempts: 0,
        expires_at: expiresAt,
      })
      .select("id,email,account_type,otp_hash,attempts,expires_at,verified_at,consumed_at,created_at")
      .single<PasswordResetRequestRow>();

    if (error || !createdRequest) {
      return res.status(500).json({
        error: "Không thể tạo yêu cầu đặt lại mật khẩu.",
        details: error?.message ?? "Không có dữ liệu trả về từ Supabase.",
      });
    }

    // Dev-friendly fallback: log the OTP because this project has no mail provider yet.
    console.info(`[password-reset] OTP for ${email}: ${otp}`);

    return res.json({
      success: true,
      message: "Mã xác nhận đã được gửi tới email của bạn.",
      expiresAt,
      ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyPasswordResetOtpHandler = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!email || !otp) {
      return res.status(400).json({ error: "Email và mã OTP là bắt buộc" });
    }

    const accountResult = await getAccountByEmail(email);

    if (accountResult.error) {
      return res.status(500).json({ error: "Lỗi truy vấn cơ sở dữ liệu." });
    }

    if (!accountResult.account || !accountResult.accountType) {
      return res.status(404).json({ error: "Email này không tồn tại trong hệ thống." });
    }

    const requestResult = await fetchLatestResetRequest(email, accountResult.accountType);

    if (requestResult.error) {
      return res.status(500).json({ error: "Không thể xác minh mã OTP." });
    }

    const request = requestResult.data?.[0];

    if (!request) {
      return res.status(400).json({ error: "Chưa có yêu cầu đặt lại mật khẩu hợp lệ." });
    }

    if (request.consumed_at) {
      return res.status(400).json({ error: "Mã xác nhận đã được sử dụng." });
    }

    if (new Date(request.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Mã xác nhận đã hết hạn." });
    }

    if (request.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới." });
    }

    if (hashOtp(request.id, otp) !== request.otp_hash) {
      await supabase
        .from("password_reset_requests")
        .update({ attempts: request.attempts + 1 })
        .eq("id", request.id);

      return res.status(400).json({ error: "Mã OTP không đúng." });
    }

    const verifiedAt = new Date().toISOString();
    await supabase
      .from("password_reset_requests")
      .update({ verified_at: verifiedAt })
      .eq("id", request.id);

    const resetToken = signResetToken({
      email: request.email,
      accountType: request.account_type,
      requestId: request.id,
      kind: "password_reset",
      exp: Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
    });

    return res.json({
      success: true,
      message: "Xác thực OTP thành công.",
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Lỗi server",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const resetToken = typeof req.body?.resetToken === "string" ? req.body.resetToken.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!resetToken || !password) {
      return res.status(400).json({ error: "Token đặt lại và mật khẩu mới là bắt buộc" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Mật khẩu xác nhận không khớp" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Mật khẩu không hợp lệ. Mật khẩu cần ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.",
      });
    }

    const tokenPayload = verifyResetToken(resetToken);

    if (!tokenPayload) {
      return res.status(400).json({ error: "Token đặt lại không hợp lệ hoặc đã hết hạn." });
    }

    const requestResult = await fetchResetRequestById(tokenPayload.requestId);

    if (requestResult.error) {
      return res.status(500).json({ error: "Không thể xác minh yêu cầu đặt lại mật khẩu." });
    }

    const request = requestResult.data;

    if (!request || request.consumed_at) {
      return res.status(400).json({ error: "Yêu cầu đặt lại mật khẩu không còn hiệu lực." });
    }

    if (request.email !== tokenPayload.email || request.account_type !== tokenPayload.accountType) {
      return res.status(400).json({ error: "Token đặt lại không khớp với yêu cầu." });
    }

    if (new Date(request.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Yêu cầu đặt lại mật khẩu đã hết hạn." });
    }

    const targetTable = tokenPayload.accountType === "employee" ? "employees" : "admins";
    const updateResult = await supabase
      .from(targetTable)
      .update({ password })
      .eq("email", tokenPayload.email);

    if (updateResult.error) {
      return res.status(500).json({ error: "Không thể cập nhật mật khẩu mới." });
    }

    const consumedAt = new Date().toISOString();
    await supabase
      .from("password_reset_requests")
      .update({ consumed_at: consumedAt, verified_at: request.verified_at ?? consumedAt })
      .eq("id", request.id);

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
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
