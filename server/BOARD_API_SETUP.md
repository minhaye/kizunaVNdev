# Backend Setup - Bảng Tin Cộng Đồng (Community Board)

## 📋 Các bước triển khai

### 1. Tạo bảng `posts` trong Supabase

**Trong Supabase Dashboard:**
1. Mở https://supabase.com → chọn project `kizunavn`
2. Vào **SQL Editor**
3. Click **New query**
4. Copy-paste SQL dưới đây:

```sql
-- Create posts table for community board
-- Schema according to database.md
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(100),
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read posts
CREATE POLICY "Allow read access to all" ON posts
  FOR SELECT
  USING (true);

-- Create policy to allow inserts
CREATE POLICY "Allow insert access" ON posts
  FOR INSERT
  WITH CHECK (true);

-- Create index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Insert sample data (using existing employees)
INSERT INTO posts (topic, title, content, created_by) 
SELECT 
  'Community' as topic,
  '4/30〜5/1 休業のお知らせ' as title,
  '4/30 (木) 18:00 から 5/1 (金) 終日まで社内システムの定期停止を実施します。緊急対応が必要な場合は総務チームまでご連絡ください。' as content,
  id as created_by
FROM employees LIMIT 1;
```

5. Click **RUN** ✓

**Note:** SQL sample data sử dụng employee ID hiện có. Nếu bảng `employees` trống, hãy thêm employee trước hoặc chỉ chạy phần CREATE TABLE mà không INSERT.

### 2. Kiểm tra bảng được tạo thành công

**Trong Supabase Dashboard:**
- Vào **Table Editor**
- Bạn sẽ thấy bảng `posts` với 8 cột: `id`, `title`, `author`, `avatar`, `content`, `date`, `posted_at`, `created_at`, `updated_at`
- Có 8 dòng sample data

### 3. Chạy Backend Server

```bash
cd d:/kizunaVNdev/server
npm run dev
```

Output sẽ như:
```
Server running on port 4000
```

---

## 🧪 Test Endpoints

### Kiểm tra health (optional)
```bash
curl http://localhost:4000/health
```

### 1. Lấy danh sách bài đăng (GET /posts)
```bash
curl http://localhost:4000/posts
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-1",
      "title": "4/30〜5/1 休業のお知らせ",
      "author": "Admin",
      "avatar": "https://...",
      "content": "...",
      "date": "2026-04-20",
      "posted_at": "09:15",
      "created_at": "2026-05-10T...",
      "updated_at": "2026-05-10T..."
    },
    ...
  ]
}
```

### 2. Lấy chi tiết bài đăng (GET /posts/:id)

Trước tiên, lấy ID từ danh sách ở trên, ví dụ: `a1b2c3d4-e5f6-4789-0abc-def123456789`

```bash
curl http://localhost:4000/posts/a1b2c3d4-e5f6-4789-0abc-def123456789
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4789-0abc-def123456789",
    "title": "4/30〜5/1 休業のお知らせ",
    "author": "Admin",
    ...
  }
}
```

---

## 📝 File được tạo/cập nhật

- ✅ `server/src/routes/posts.ts` - Route handlers cho GET /posts và GET /posts/:id
- ✅ `server/src/routes/index.ts` - Đăng ký routes
- ✅ `server/src/types.ts` - Thêm type `Post`
- ✅ `server/migrations/001_create_posts_table.sql` - SQL migration + sample data

---

## 🔗 Endpoints API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/posts` | Lấy danh sách bài đăng (sắp xếp mới nhất trước) |
| GET | `/posts/:id` | Lấy chi tiết bài đăng theo ID |

---

## ⚙️ Kiến trúc

- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Service Role Key (backend)
- **Sorting:** `created_at DESC` (bài mới nhất lên đầu)
- **Error Handling:** Try-catch + custom error responses

---

## 🚀 Tiếp theo

Sau khi backend chạy được, bạn cần:
1. Tạo `.env.local` ở frontend với `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Update `app/(workspace)/board/page.tsx` để gọi API thay vì dữ liệu cứng
3. Test frontend integration

