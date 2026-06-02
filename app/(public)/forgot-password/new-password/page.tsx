"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ForgotPasswordShell } from "../_components/forgot-password-shell";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function NewPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const resetToken = searchParams.get("resetToken") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đặt lại mật khẩu thất bại");
        return;
      }

      setSuccess(data.message || "Đổi mật khẩu thành công");
      sessionStorage.removeItem("forgotPasswordOtp");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ForgotPasswordShell
      title="Tạo mật khẩu mới / 新しいパスワード"
      description="Vui lòng nhập mật khẩu mới để hoàn tất. / 新しいパスワードを入力してください。"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <p className="text-sm leading-6 text-slate-500">
          Tài khoản: {email || "email của bạn"}
        </p>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu mới / 新しいパスワード"
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 grid place-items-center text-slate-500 hover:text-slate-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Nhập lại mật khẩu / パスワードを再入力"
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 grid place-items-center text-slate-500 hover:text-slate-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !resetToken}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu / 更新"}
        </button>

        {!resetToken && (
          <p className="text-sm text-red-600">
            Phiên đặt lại mật khẩu không hợp lệ. Vui lòng quay lại và xác minh OTP lại.
          </p>
        )}

        <Link href="/login" className="block text-sm font-medium text-blue-600 hover:underline">
          Quay lại đăng nhập / ログインへ戻る
        </Link>
      </form>
    </ForgotPasswordShell>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50" />}>
      <NewPasswordContent />
    </Suspense>
  );
}