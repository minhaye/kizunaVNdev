"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("パスワードが一致しません / Mật khẩu không khớp");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上必要です / Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録失敗 / Đăng ký thất bại");
        return;
      }

      setSuccess(data.message || "登録完了！/ Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました / Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KizunaVN Đăng ký / 新規登録</h1>
           <p className="text-sm text-slate-500 mt-2">
           <span className="block">Tạo tài khoản mới để bắt đầu.</span>
            <span className="block">新しいアカウントを作成します。</span>
      </p>
        </div>

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

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          {/* Name Input */}
          <div>
            <input
              type="text"
              placeholder="Họ và tên / 氏名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />
          </div>

          {/* Email Input */}
          <div>
            <input
              type="email"
              placeholder="メール / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
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
              className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={loading}
              className="absolute inset-y-0 right-3 grid place-items-center text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="パスワード確認 / Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              disabled={loading}
              className="absolute inset-y-0 right-3 grid place-items-center text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-base font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="block">登録中... / Đang đăng ký...</span>
            ) : (
              <span className="leading-tight">
                <span className="block">登録</span>
                <span className="block">Đăng ký</span>
              </span>
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          <span className="block">すでにアカウントがありますか？</span>
          <span className="block">Đã có tài khoản?</span>
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            <span className="block">ログイン</span>
            <span className="block">Đăng nhập ngay</span>
          </Link>
        </p>
      </div>
    </main>
  );
}
