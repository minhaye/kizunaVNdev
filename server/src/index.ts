import app from './app.js';
import { env } from './env.js';
import { supabase } from './supabase.js';
import type { Server } from 'node:http';

async function checkDatabase() {
  console.log("--- Đang kiểm tra kết nối Supabase... ---");
  
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Kết nối Supabase: THẤT BẠI. Lỗi:", error.message);
    } else {
      console.log("✅ Kết nối Supabase: THÀNH CÔNG!");
      console.log("📊 Server sẵn sàng hoạt động.");
    }
  } catch (err) {
    console.error("❌ Lỗi không mong muốn:", err);
  }
}

async function startServer() {
  await checkDatabase();

  const server = app.listen(env.port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${env.port}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/login`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/signup`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/logout`);
    console.log(`   GET    http://localhost:${env.port}/api/auth/me`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal}, đang dừng server...`);

    server.close(() => {
      console.log("✅ Server đã dừng an toàn.");
      process.exit(0);
    });

    setTimeout(() => {
      console.warn("⚠️ Dừng server chậm, buộc thoát tiến trình.");
      process.exit(1);
    }, 5000).unref();
  };

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Cổng ${env.port} đang bị tiến trình khác chiếm. Hãy dừng server cũ rồi chạy lại.`);
      process.exit(1);
    }

    console.error("❌ Lỗi không mong muốn khi khởi động server:", error);
    process.exit(1);
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();