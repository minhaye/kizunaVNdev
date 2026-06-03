"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ForgotPasswordShell } from "../_components/forgot-password-shell";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function ForgotPasswordOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const maskedEmail = useMemo(() => {
    if (!email.includes("@")) return "email của bạn";
    const [name, domain] = email.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }, [email]);

  useEffect(() => {
    const devOtp = sessionStorage.getItem("forgotPasswordOtp");
    if (devOtp && !otp) {
      setOtp(devOtp);
    }
  }, [otp]);

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTP認証に失敗しました / Xác minh OTP thất bại");
        return;
      }

      setSuccess(data.message || "Xác thực thành công");
      router.push(
        `/forgot-password/new-password?email=${encodeURIComponent(email)}&resetToken=${encodeURIComponent(data.resetToken)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました / Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTPを再送信できません / Không thể gửi lại mã OTP");
        return;
      }

      if (data.debugOtp) {
        sessionStorage.setItem("forgotPasswordOtp", data.debugOtp);
      }

      setSuccess("Đã gửi lại mã OTP mới.");
      setOtp(data.debugOtp ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました / Có lỗi xảy ra");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <ForgotPasswordShell
      title="Nhập mã OTP / OTPを入力"
      description={`Mã xác nhận đã được gửi tới ${maskedEmail}.`}
    >
      <form onSubmit={handleContinue} className="space-y-4">
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
          Vui lòng nhập mã gồm 6 số để xác nhận. / 6桁の確認コードを入力してください。
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          placeholder="OTPコード / Mã OTP"
          required
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        <div className="flex items-center justify-between pt-1 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || loading}
            className="font-medium text-blue-600 hover:underline disabled:opacity-60"
          >
            {resendLoading ? "Đang gửi..." : "Gửi lại mã / 再送信"}
          </button>
          <Link href="/forgot-password" className="font-medium text-slate-500 hover:underline">
            Quay lại / 戻る
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy / キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {loading ? "Đang xác minh..." : "Tiếp tục / 続行"}
          </button>
        </div>
      </form>
    </ForgotPasswordShell>
  );
}

export default function ForgotPasswordOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50" />}>
      <ForgotPasswordOtpContent />
    </Suspense>
  );
}