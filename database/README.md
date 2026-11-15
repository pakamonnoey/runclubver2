# RUN BKK — Database

## ER Diagram

(เปิดดูเป็นภาพได้ใน GitHub หรือ VS Code Markdown Preview ที่รองรับ Mermaid)

```mermaid
erDiagram
    users ||--o{ clubs : "owns (owner_id)"
    users ||--o{ registrations : "joins"
    users ||--o{ club_owner_requests : "submits"
    clubs ||--o{ run_sessions : "hosts"
    clubs |o--o{ club_owner_requests : "requested for"
    run_sessions ||--o{ registrations : "has"

    users {
        INT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        ENUM role "member | owner | admin"
    }
    clubs {
        INT id PK
        INT owner_id FK "NULL = no owner yet"
        VARCHAR name UK
        TEXT description
        VARCHAR location
        VARCHAR instagram_url
        VARCHAR image
        ENUM status "pending | published"
    }
    run_sessions {
        INT id PK
        INT club_id FK
        VARCHAR title
        ENUM run_type "morning | social | night | beginner"
        DATETIME start_at
        VARCHAR meeting_point
        DECIMAL distance_km
        VARCHAR pace
        INT max_participants "NULL = unlimited"
        ENUM registration_type "internal | external"
        VARCHAR external_url
        ENUM status "draft | published | cancelled"
    }
    registrations {
        INT id PK
        INT user_id FK
        INT run_session_id FK
        TIMESTAMP created_at
    }
    club_owner_requests {
        INT id PK
        INT user_id FK
        INT club_id FK "NULL = new club"
        VARCHAR club_name
        TEXT message
        ENUM status "pending | approved | rejected"
    }
    sessions {
        VARCHAR session_id PK
        INT expires
        MEDIUMTEXT data
    }
```

`sessions` ไม่มีความสัมพันธ์กับตารางอื่น — เป็นที่เก็บ login session ของ express-mysql-session

## ความสัมพันธ์ (Relationships)

| ความสัมพันธ์ | แบบ | อธิบาย |
|---|---|---|
| users → clubs | 1 : N | 1 owner ดูแลได้หลายคลับ / คลับอาจยังไม่มี owner (NULL) |
| clubs → run_sessions | 1 : N | 1 คลับมีหลายกิจกรรม |
| users ↔ run_sessions | M : N | ผ่านตารางกลาง `registrations` |
| users → club_owner_requests | 1 : N | 1 user ส่งคำขอได้หลายครั้ง |

## Constraint สำคัญ

- `users.email` **UNIQUE** → สมัครอีเมลซ้ำไม่ได้
- `registrations (user_id, run_session_id)` **UNIQUE** → Join กิจกรรมเดิมซ้ำไม่ได้
- `ON DELETE CASCADE` → ลบคลับแล้วกิจกรรม/การลงทะเบียนหายตาม
- `ON DELETE SET NULL` → ลบ user ที่เป็น owner แล้วคลับยังอยู่
- `status` → หน้าเว็บแสดงเฉพาะ `published` ข้อมูลที่ยังไม่ยืนยันเป็น `pending` / `draft`

## วิธีติดตั้ง DB

1. สร้างฐานข้อมูลและ user (ทำครั้งเดียว ด้วยบัญชี admin ของ MariaDB/MySQL)
   ```sql
   CREATE DATABASE runbkk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'runbkk_app'@'localhost' IDENTIFIED BY 'รหัสผ่าน';
   GRANT ALL PRIVILEGES ON runbkk.* TO 'runbkk_app'@'localhost';
   ```
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่รหัสผ่าน
3. สร้างตาราง + ข้อมูลเริ่มต้น
   ```bash
   npm run db:setup
   ```
   ถ้าใน DB มีตารางอยู่แล้ว สคริปต์จะ**หยุด**และแสดงจำนวนข้อมูลที่จะหาย
   ถ้าต้องการล้างแล้วสร้างใหม่จริงๆ (⚠️ ข้อมูลเดิมหายทั้งหมด):
   ```bash
   npm run db:setup -- --force
   ```

## กรอก / แก้ข้อมูลด้วย DBeaver

เชื่อมต่อ: New Database Connection → **MariaDB** (หรือ MySQL) →
Host `127.0.0.1` · Port `3306` · Database `runbkk` · Username `runbkk_app` · Password จาก `.env`

กติกา:
- ไม่สร้าง/แก้โครงสร้างตารางใน DBeaver — แก้ที่ `runbkk.sql` แทน (โค้ดต้องแก้ตาม)
- ไม่เพิ่ม user ในตาราง `users` ด้วยมือ (รหัสต้องเป็น bcrypt) → สมัครผ่านเว็บ แล้วค่อยแก้ `role`
- `run_sessions.status` ต้องเป็น `published` ถึงจะแสดงบนเว็บ / ข้อมูลที่ยังไม่ยืนยันใช้ `draft`
- `start_at` เป็นเวลาไทย รูปแบบ `2026-11-22 06:00:00`
- กรอกเสร็จ → export ข้อมูลไปไว้ใน `seed.sql` เพื่อให้ตอน deploy มีข้อมูลเดียวกัน
