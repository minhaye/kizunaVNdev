"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen grid place-items-center bg-linear-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
        <h1 className="text-2xl font-bold text-slate-900">KizunaVN ログイン</h1>
        <p className="text-sm text-slate-500 mt-1">
          Trang đăng nhập / ログインページへようこそ！
        </p>

        <form className="mt-5 space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 grid place-items-center text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="text-right">
            <Link href="#" className="text-sm text-blue-600 hover:underline">
              Quên mật khẩu? <br />
              パスワードを忘れた方はこちら
            </Link>
          </div>
          <button
            type="button"
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ログイン / Đăng nhập
          </button>
        </form>

        <Link
          href="/"
          className="inline-block mt-4 text-sm text-blue-600 hover:underline"
        >
          Về trang chủ / ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
