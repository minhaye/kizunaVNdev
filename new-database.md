| Tên bảng | Tên trường | Dữ liệu | Mô tả bảng và các trường | unique? | not null? | Khác |
|---|---|---|---|---|---|---|
| employees | id | UUID | Lưu thông tin nhân viên | UNIQUE | NOT NULL | PRIMARY KEY |
| employees | name | VARCHAR(100) | Tên nhân viên |  | NOT NULL |  |
| employees | nationality | VARCHAR(10) | Quốc tịch nhân viên |  | NOT NULL | CHECK (vn, jp) |
| employees | email | VARCHAR(100) | Email dùng để đăng nhập | UNIQUE | NOT NULL |  |
| employees | password | VARCHAR(100) | Mật khẩu đăng nhập |  | NOT NULL | Demo nên chưa hash |
| employees | avatar_url | TEXT | Link ảnh đại diện |  |  |  |
| employees | role | VARCHAR(20) | Vai trò nhân viên |  | NOT NULL | CHECK (employee, leader) |
| employees | status | VARCHAR(20) | Trạng thái tài khoản |  | NOT NULL | CHECK (active, inactive), DEFAULT active |
| employees | last_online | TIMESTAMP | Thời gian online gần nhất để hiển thị trạng thái |  |  |  |
| feedbacks | id | UUID | Lưu feedback giữa nhân viên | UNIQUE | NOT NULL | PRIMARY KEY |
| feedbacks | receiver_id | UUID | ID người được feedback |  | NOT NULL | FK → employees.id |
| feedbacks | sender_id | UUID | ID người gửi feedback |  | NOT NULL | FK → employees.id |
| feedbacks | content | TEXT | Nội dung feedback |  | NOT NULL |  |
| admins | id | UUID | Lưu tài khoản quản trị viên | UNIQUE | NOT NULL | PRIMARY KEY |
| admins | email | VARCHAR(100) | Email quản trị viên | UNIQUE | NOT NULL |  |
| admins | password | VARCHAR(100) | Mật khẩu quản trị viên |  | NOT NULL | Demo nên chưa hash |
| chat_rooms | id | UUID | Lưu thông tin đoạn chat | UNIQUE | NOT NULL | PRIMARY KEY |
| chat_rooms | room_type | VARCHAR(20) | Loại đoạn chat |  | NOT NULL | CHECK (direct, group), DEFAULT group |
| chat_rooms | name | VARCHAR(100) | Tên đoạn chat, dùng cho group chat |  |  | Có thể NULL với direct chat |
| chat_rooms | topic | VARCHAR(100) | Chủ đề đoạn chat |  |  |  |
| chat_rooms | created_at | TIMESTAMP | Thời gian tạo đoạn chat |  | NOT NULL | DEFAULT now() |
| chat_rooms | updated_at | TIMESTAMP | Thời gian cập nhật đoạn chat |  | NOT NULL | DEFAULT now() |
| chat_rooms | created_by | UUID | ID người tạo đoạn chat |  | NOT NULL | FK → employees.id |
| chat_rooms | last_message_at | TIMESTAMP | Thời gian tin nhắn mới nhất |  |  | Dùng để sort danh sách chat |
| pinned_chats | id | UUID | Lưu đoạn chat được pin | UNIQUE | NOT NULL | PRIMARY KEY |
| pinned_chats | chat_room_id | UUID | ID đoạn chat được pin |  | NOT NULL | FK → chat_rooms.id |
| pinned_chats | pinned_by | UUID | ID người pin đoạn chat |  | NOT NULL | FK → employees.id |
| pinned_chats | pinned_at | TIMESTAMP | Thời gian pin đoạn chat |  | NOT NULL | DEFAULT now() |
| pinned_chats | chat_room_id, pinned_by | — | Chống pin trùng | UNIQUE |  | UNIQUE (chat_room_id, pinned_by) |
| messages | id | UUID | Lưu tin nhắn | UNIQUE | NOT NULL | PRIMARY KEY |
| messages | chat_room_id | UUID | ID đoạn chat |  | NOT NULL | FK → chat_rooms.id |
| messages | sender_id | UUID | ID người gửi |  | NOT NULL | FK → employees.id |
| messages | content | TEXT | Nội dung tin nhắn |  | NOT NULL | Giữ NOT NULL để tương thích dữ liệu hiện tại |
| messages | message_type | VARCHAR(20) | Loại tin nhắn |  | NOT NULL | CHECK (text, image, file, system), DEFAULT text |
| messages | reply_to_message_id | UUID | ID tin nhắn được reply |  |  | FK → messages.id |
| messages | sent_at | TIMESTAMP | Thời gian gửi tin nhắn |  | NOT NULL | DEFAULT now() |
| messages | edited_at | TIMESTAMP | Thời gian sửa tin nhắn |  |  | NULL nếu chưa sửa |
| messages | deleted_at | TIMESTAMP | Thời gian xóa mềm tin nhắn |  |  | NULL nếu chưa xóa |
| chat_members | employee_id | UUID | ID nhân viên trong đoạn chat |  | NOT NULL | FK → employees.id, PRIMARY KEY (employee_id, chat_room_id) |
| chat_members | chat_room_id | UUID | ID đoạn chat |  | NOT NULL | FK → chat_rooms.id, PRIMARY KEY (employee_id, chat_room_id) |
| chat_members | role | VARCHAR(20) | Vai trò trong đoạn chat |  | NOT NULL | CHECK (member, chat_admin) |
| chat_members | joined_at | TIMESTAMP | Thời gian tham gia đoạn chat |  | NOT NULL | DEFAULT now() |
| chat_members | last_read_at | TIMESTAMP | Thời gian đọc tin nhắn gần nhất | | | Có thể dùng để lưu thời điểm đọc cuối cùng, hiện tại unread chủ yếu dựa vào is_read
| chat_members | is_read    | BOOLEAN | Trạng thái đã đọc của thành viên trong đoạn chat |         | NOT NULL  | DEFAULT false; true = đã xem, false = chưa xem |
| tasks | id | UUID | Lưu task được giao | UNIQUE | NOT NULL | PRIMARY KEY |
| tasks | assigner_id | UUID | ID người giao task |  | NOT NULL | FK → employees.id |
| tasks | assignee_id | UUID | ID người nhận task |  | NOT NULL | FK → employees.id |
| tasks | topic | VARCHAR(100) | Chủ đề task |  |  |  |
| tasks | title | VARCHAR(100) | Tên task |  | NOT NULL |  |
| tasks | content | TEXT | Nội dung task |  |  |  |
| tasks | status | VARCHAR(20) | Trạng thái task |  | NOT NULL | CHECK (pending, in_progress, completed), DEFAULT pending |
| tasks | created_at | TIMESTAMP | Thời gian tạo task |  | NOT NULL | DEFAULT now() |
| tasks | deadline | TIMESTAMP | Thời gian deadline |  |  |  |
| notifications | id | UUID | Lưu thông báo hệ thống | UNIQUE | NOT NULL | PRIMARY KEY |
| notifications | created_at | TIMESTAMP | Thời gian tạo thông báo |  | NOT NULL | DEFAULT now() |
| notifications | topic | VARCHAR(100) | Chủ đề thông báo |  |  |  |
| notifications | title | VARCHAR(100) | Tên thông báo |  | NOT NULL |  |
| notifications | content | TEXT | Nội dung thông báo |  | NOT NULL |  |
| posts | id | UUID | Lưu bài viết bảng tin | UNIQUE | NOT NULL | PRIMARY KEY |
| posts | topic | VARCHAR(100) | Chủ đề bài viết |  |  |  |
| posts | title | VARCHAR(100) | Tên bài viết |  | NOT NULL |  |
| posts | content | TEXT | Nội dung bài viết |  | NOT NULL |  |
| posts | created_by | UUID | Người tạo bài viết |  | NOT NULL | FK → employees.id |
| posts | created_at | TIMESTAMP | Thời gian tạo bài viết |  | NOT NULL | DEFAULT now() |
| post_reactions | id | UUID | Lưu cảm xúc bài viết | UNIQUE | NOT NULL | PRIMARY KEY |
| post_reactions | employee_id | UUID | ID người thả cảm xúc |  | NOT NULL | FK → employees.id, UNIQUE(employee_id, post_id) |
| post_reactions | post_id | UUID | ID bài viết |  | NOT NULL | FK → posts.id |
| post_reactions | reaction_type | VARCHAR(20) | Loại cảm xúc |  | NOT NULL | CHECK (like, heart, useful) |
| wiki_articles | id | UUID | Lưu bài viết wiki | UNIQUE | NOT NULL | PRIMARY KEY |
| wiki_articles | topic | VARCHAR(100) | Chủ đề bài viết wiki |  |  |  |
| wiki_articles | title | VARCHAR(100) | Tên bài viết wiki |  | NOT NULL |  |
| wiki_articles | content | TEXT | Nội dung bài viết wiki |  | NOT NULL |  |
| wiki_articles | created_by | UUID | Người tạo bài viết wiki |  | NOT NULL | FK → employees.id |
| wiki_articles | created_at | TIMESTAMP | Thời gian tạo bài viết wiki |  | NOT NULL | DEFAULT now() |
| wiki_articles | updated_at | TIMESTAMP | Thời gian cập nhật bài viết wiki |  |  |  |
| password_reset_otps | id | UUID | Lưu OTP đặt lại mật khẩu | UNIQUE | NOT NULL | PRIMARY KEY |
| password_reset_otps | email | VARCHAR(100) | Email yêu cầu đặt lại mật khẩu | UNIQUE | NOT NULL |  |
| password_reset_otps | source | VARCHAR(20) | Nguồn tài khoản |  | NOT NULL | CHECK (employees, admins) |
| password_reset_otps | otp_hash | TEXT | Mã OTP đã băm |  | NOT NULL |  |
| password_reset_otps | otp_expires_at | TIMESTAMPTZ | Hạn OTP (3 phút) |  | NOT NULL |  |
| password_reset_otps | reset_token | TEXT | Token đặt lại mật khẩu |  |  | UNIQUE index |
| password_reset_otps | reset_expires_at | TIMESTAMPTZ | Hạn reset token |  |  |  |
| password_reset_otps | used_at | TIMESTAMPTZ | Thời điểm đã dùng token |  |  |  |
| password_reset_otps | created_at | TIMESTAMPTZ | Thời gian tạo |  | NOT NULL | DEFAULT now() |
| password_reset_otps | updated_at | TIMESTAMPTZ | Thời gian cập nhật |  | NOT NULL | DEFAULT now() |