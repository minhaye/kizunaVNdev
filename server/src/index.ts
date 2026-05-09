import app from './app.js';
import { env } from './env.js';
import { supabase } from './supabase.js';

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
  
  app.listen(env.port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${env.port}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/login`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/signup`);
    console.log(`   POST   http://localhost:${env.port}/api/auth/logout`);
    console.log(`   GET    http://localhost:${env.port}/api/auth/me`);
  });
}

startServer();