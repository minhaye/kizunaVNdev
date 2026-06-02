"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログイン失敗 / Đăng nhập thất bại");
        return;
      }

      setSuccess("ログイン成功！/ Đăng nhập thành công! Đang chuyển hướng...");
      
      // Lưu session token
      if (data.session) {
        localStorage.setItem("authToken", data.session.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      const targetPath = data.user?.role === "admin" ? "/admin" : "/";

      setTimeout(() => {
        router.push(targetPath);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました / Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border-4 border-red-800 shadow-lg p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KizunaVN ログイン</h1>
          <p className="text-sm text-slate-500 mt-2">
            <span className="block">ログインページへようこそ！</span>
            <span className="block">Trang đăng nhập</span>
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Email Input */}
          <div>
            <input
              type="email"
              placeholder="メール / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="w-full border-2 border-red-800 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-400/60 disabled:bg-gray-100"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="パスワード / Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="w-full border-2 border-red-800 rounded-lg px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-400/60 disabled:bg-gray-100"
            />
            <button
              type="button"
              aria-label={showPassword ? "パスワードを隠す / Ẩn mật khẩu" : "パスワードを表示 / Hiện mật khẩu"}
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={loading}
              className="absolute inset-y-0 right-3 grid place-items-center text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="text-right pt-2">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              <span className="block text-sm">パスワードを忘れた方はこちら</span>
              <span className="block text-sm">Quên mật khẩu?</span>
              <span className="block text-sm">Nhấn để đặt lại mật khẩu</span>
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-base font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="block">ログイン中... / Đang đăng nhập...</span>
            ) : (
              <span className="leading-tight">
                <span className="block">ログイン</span>
                <span className="block">Đăng nhập</span>
              </span>
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          <span className="block">まだアカウントがありませんか？</span>
          <span className="block">Chưa có tài khoản?</span>
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">
            <span className="block">登録する</span>
            <span className="block">Đăng ký ngay</span>
          </Link>
        </p>
      </div>
    </main>
  );
}
