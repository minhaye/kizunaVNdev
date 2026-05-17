# Database Specification

## Table: `employees`

| Field       | Data Type    | Description           | Unique | Not Null | Others                       |
| ----------- | ------------ | --------------------- | ------ | -------- | ---------------------------- |
| id          | UUID         | Employee ID           | ✅      | ✅        | PRIMARY KEY                  |
| name        | VARCHAR(100) | Employee name         | ❌      | ✅        |                              |
| nationality | VARCHAR(10)  | Employee nationality  | ❌      | ✅        | CHECK (`vn`, `jp`)           |
| email       | VARCHAR(100) | Login email           | ✅      | ✅        |                              |
| password    | VARCHAR(100) | Login password        | ❌      | ✅        | Demo only, not hashed        |
| avatar_url  | TEXT         | Avatar image URL      | ❌      | ❌        |                              |
| role        | VARCHAR(20)  | Employee role         | ❌      | ✅        | CHECK (`employee`, `leader`) |
| last_online | TIMESTAMP    | Last online timestamp | ❌      | ❌        |                              |

---

## Table: `feedbacks`

| Field       | Data Type | Description                 | Unique | Not Null | Others              |
| ----------- | --------- | --------------------------- | ------ | -------- | ------------------- |
| id          | UUID      | Feedback ID                 | ✅      | ✅        | PRIMARY KEY         |
| receiver_id | UUID      | Employee receiving feedback | ❌      | ✅        | FK → `employees.id` |
| sender_id   | UUID      | Employee sending feedback   | ❌      | ✅        | FK → `employees.id` |
| content     | TEXT      | Feedback content            | ❌      | ✅        |                     |

---

## Table: `admins`

| Field    | Data Type    | Description    | Unique | Not Null | Others                |
| -------- | ------------ | -------------- | ------ | -------- | --------------------- |
| id       | UUID         | Admin ID       | ✅      | ✅        | PRIMARY KEY           |
| email    | VARCHAR(100) | Admin email    | ✅      | ✅        |                       |
| password | VARCHAR(100) | Admin password | ❌      | ✅        | Demo only, not hashed |

---

## Table: `chat_rooms`

| Field      | Data Type | Description             | Unique | Not Null | Others              |
| ---------- | --------- | ----------------------- | ------ | -------- | ------------------- |
| id         | UUID      | Chat room ID            | ✅      | ✅        | PRIMARY KEY         |
| created_at | TIMESTAMP | Chat room creation time | ❌      | ✅        | DEFAULT `now()`     |
| created_by | UUID      | Creator employee ID     | ❌      | ✅        | FK → `employees.id` |

---

## Table: `pinned_chats`

| Field                     | Data Type | Description                  | Unique | Not Null | Others               |
| ------------------------- | --------- | ---------------------------- | ------ | -------- | -------------------- |
| id                        | UUID      | Pinned chat ID               | ✅      | ✅        | PRIMARY KEY          |
| chat_room_id              | UUID      | Pinned chat room ID          | ❌      | ✅        | FK → `chat_rooms.id` |
| pinned_by                 | UUID      | Employee who pinned the chat | ❌      | ✅        | FK → `employees.id`  |
| (chat_room_id, pinned_by) | —         | Prevent duplicate pin        | ✅      | —        | UNIQUE constraint    |

---

## Table: `chat_members`

| Field        | Data Type   | Description           | Unique | Not Null | Others                         |
| ------------ | ----------- | --------------------- | ------ | -------- | ------------------------------ |
| employee_id  | UUID        | Employee ID           | ❌      | ✅        | FK → `employees.id`            |
| chat_room_id | UUID        | Chat room ID          | ❌      | ✅        | FK → `chat_rooms.id`           |
| role         | VARCHAR(20) | Role inside chat room | ❌      | ✅        | CHECK (`member`, `chat_admin`) |

### Composite Primary Key

* PRIMARY KEY (`employee_id`, `chat_room_id`)

---

## Table: `messages`

| Field        | Data Type | Description        | Unique | Not Null | Others               |
| ------------ | --------- | ------------------ | ------ | -------- | -------------------- |
| id           | UUID      | Message ID         | ✅      | ✅        | PRIMARY KEY          |
| chat_room_id | UUID      | Chat room ID       | ❌      | ✅        | FK → `chat_rooms.id` |
| sender_id    | UUID      | Sender employee ID | ❌      | ✅        | FK → `employees.id`  |
| content      | TEXT      | Message content    | ❌      | ✅        |                      |
| sent_at      | TIMESTAMP | Message sent time  | ❌      | ✅        | DEFAULT `now()`      |

---

## Table: `tasks`

| Field       | Data Type    | Description             | Unique | Not Null | Others                                                           |
| ----------- | ------------ | ----------------------- | ------ | -------- | ---------------------------------------------------------------- |
| id          | UUID         | Task ID                 | ✅      | ✅        | PRIMARY KEY                                                      |
| assigner_id | UUID         | Employee assigning task | ❌      | ✅        | FK → `employees.id`                                              |
| assignee_id | UUID         | Employee receiving task | ❌      | ✅        | FK → `employees.id`                                              |
| topic       | VARCHAR(100) | Task topic              | ❌      | ❌        |                                                                  |
| title       | VARCHAR(100) | Task title              | ❌      | ✅        |                                                                  |
| content     | TEXT         | Task content            | ❌      | ❌        |                                                                  |
| status      | VARCHAR(20)  | Task status             | ❌      | ✅        | CHECK (`pending`, `in_progress`, `completed`), DEFAULT `pending` |
| created_at  | TIMESTAMP    | Task creation time      | ❌      | ✅        | DEFAULT `now()`                                                  |
| deadline    | TIMESTAMP    | Task deadline           | ❌      | ❌        |                                                                  |

---

## Table: `notifications`

| Field      | Data Type    | Description                | Unique | Not Null | Others          |
| ---------- | ------------ | -------------------------- | ------ | -------- | --------------- |
| id         | UUID         | Notification ID            | ✅      | ✅        | PRIMARY KEY     |
| created_at | TIMESTAMP    | Notification creation time | ❌      | ✅        | DEFAULT `now()` |
| topic      | VARCHAR(100) | Notification topic         | ❌      | ❌        |                 |
| title      | VARCHAR(100) | Notification title         | ❌      | ✅        |                 |
| content    | TEXT         | Notification content       | ❌      | ✅        |                 |

---

## Table: `posts`

| Field      | Data Type    | Description         | Unique | Not Null | Others              |
| ---------- | ------------ | ------------------- | ------ | -------- | ------------------- |
| id         | UUID         | Post ID             | ✅      | ✅        | PRIMARY KEY         |
| topic      | VARCHAR(100) | Post topic          | ❌      | ❌        |                     |
| title      | VARCHAR(100) | Post title          | ❌      | ✅        |                     |
| content    | TEXT         | Post content        | ❌      | ✅        |                     |
| created_by | UUID         | Creator employee ID | ❌      | ✅        | FK → `employees.id` |
| created_at | TIMESTAMP    | Post creation time  | ❌      | ✅        | DEFAULT `now()`     |

---

## Table: `post_reactions`

| Field         | Data Type   | Description               | Unique | Not Null | Others                            |
| ------------- | ----------- | ------------------------- | ------ | -------- | --------------------------------- |
| id            | UUID        | Reaction ID               | ✅      | ✅        | PRIMARY KEY                       |
| employee_id   | UUID        | Employee reacting to post | ❌      | ✅        | FK → `employees.id`               |
| post_id       | UUID        | Post ID                   | ❌      | ✅        | FK → `posts.id`                   |
| reaction_type | VARCHAR(20) | Reaction type             | ❌      | ✅        | CHECK (`like`, `heart`, `useful`) |

### Additional Constraints

* UNIQUE (`employee_id`, `post_id`)
  → One employee can react only once per post.

---

### wiki_articles

Bảng lưu các bài viết wiki nội bộ, dùng để chia sẻ kiến thức, quy trình hoặc tài liệu hướng dẫn trong hệ thống.

| Field | Type | Description |
|---|---|---|
| id | UUID | ID bài viết wiki |
| topic | VARCHAR(100) | Chủ đề bài viết |
| title | VARCHAR(100) | Tên bài viết |
| content | TEXT | Nội dung bài viết |
| created_by | UUID | ID nhân viên tạo bài viết |
| created_at | TIMESTAMP | Thời gian tạo |
| updated_at | TIMESTAMP | Thời gian cập nhật |