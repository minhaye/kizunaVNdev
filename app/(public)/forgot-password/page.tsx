"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ForgotPasswordShell } from "./_components/forgot-password-shell";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Không thể gửi mã xác nhận");
        return;
      }

      if (data.debugOtp) {
        sessionStorage.setItem("forgotPasswordOtp", data.debugOtp);
      } else {
        sessionStorage.removeItem("forgotPasswordOtp");
      }

      router.push(`/forgot-password/otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ForgotPasswordShell
      title="Quên mật khẩu / パスワードをお忘れですか"
      description="Nhập email để nhận hướng dẫn. / メールを入力して案内を受け取ってください。"
    >
      <form onSubmit={handleContinue} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 px-4 py-3 text-blue-700">
          <Mail size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6 text-blue-700/90">
            Mã OTP sẽ được gửi tới email đã dùng để đăng ký tài khoản.
          </p>
        </div>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="メール / Email"
          required
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy / キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {loading ? "Đang gửi..." : "Tiếp tục / 続行"}
          </button>
        </div>
      </form>
    </ForgotPasswordShell>
  );
}