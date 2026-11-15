# RUN BKK — Database

## ER Diagram

(เปิดดูเป็นภาพได้ใน GitHub หรือ VS Code Markdown Preview ที่รองรับ Mermaid)

```mermaid
erDiagram
    users ||--o{ registrations : "joins"
    clubs ||--o{ run_sessions : "hosts"
    run_sessions ||--o{ registrations : "has"

    users {
        INT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        ENUM role "member | admin"
    }
    clubs {
        INT id PK
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
    images {
        INT id PK
        VARCHAR mime_type "image/jpeg | png | webp"
        MEDIUMBLOB data
        INT size
    }
    sessions {
        VARCHAR session_id PK
        INT expires
        MEDIUMTEXT data
    }
```

`sessions` ไม่มีความสัมพันธ์กับตารางอื่น — เป็นที่เก็บ login session ของ express-mysql-session

`images` เก็บรูปที่ Admin อัปโหลด — `clubs.image` / `run_sessions.image` อ้างถึงด้วย path `/uploads/<id>` (ไม่ใช้ FK เพราะคอลัมน์ image รับลิงก์ภายนอกได้ด้วย)
เก็บใน DB แทนโฟลเดอร์ เพราะ Render แบบฟรีลบไฟล์ที่เขียนลงดิสก์ทุกครั้งที่ server เริ่มใหม่

## ผู้ใช้ 2 แบบ (role)

| role | ทำอะไรได้ |
|---|---|
| `member` | ดูคลับ/กิจกรรม, ค้นหา, Join / Cancel, My Runs, แก้ Profile |
| `admin` | ทุกอย่างของ member + กรอก/แก้ข้อมูลคลับและกิจกรรม, ดูรายชื่อผู้เข้าร่วม, จัดการผู้ใช้ |

ข้อมูลคลับและกิจกรรมมี Admin เป็นคนกรอกเพียงคนเดียว (ตรวจสอบข้อมูลจากแหล่งจริงก่อนกรอก)

## ความสัมพันธ์ (Relationships)

| ความสัมพันธ์ | แบบ | อธิบาย |
|---|---|---|
| clubs → run_sessions | 1 : N | 1 คลับมีหลายกิจกรรม |
| users ↔ run_sessions | M : N | ผ่านตารางกลาง `registrations` |

## Constraint สำคัญ

- `users.email` **UNIQUE** → สมัครอีเมลซ้ำไม่ได้
- `registrations (user_id, run_session_id)` **UNIQUE** → Join กิจกรรมเดิมซ้ำไม่ได้
- `ON DELETE CASCADE` → ลบคลับแล้วกิจกรรม/การลงทะเบียนหายตาม
- `ON DELETE CASCADE` (registrations.user_id) → ลบผู้ใช้แล้วการ Join ของเขาหายตาม
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

## อัปเดตโครงสร้าง DB ที่มีข้อมูลอยู่แล้ว (migration)

```bash
npm run db:migrate                              # ในเครื่อง
ENV_FILE=.env.production npm run db:migrate     # เว็บจริง
```

รันทุกไฟล์ใน `database/migrations/` ตามลำดับ (เช่น `001_images.sql`) — เขียนแบบรันซ้ำได้ ไม่ลบข้อมูล

## Development vs Production

| | Development (ในเครื่อง) | Production (เว็บจริง) |
|---|---|---|
| DB | MariaDB ในเครื่อง (`.env`) | TiDB Cloud (`.env.production` / Environment ของ Render) |
| ข้อมูล | ข้อมูลทดสอบ — พัง/ลบได้ | ข้อมูลจริง — กรอกผ่านหน้า Admin ของเว็บจริง |
| โครงสร้างตาราง | `runbkk.sql` ไฟล์เดียวกัน | `runbkk.sql` ไฟล์เดียวกัน |

### ดึงข้อมูลจริงลงเครื่อง

```bash
npm run db:pull
```

- copy `images` + `clubs` + `run_sessions` จากเว็บจริง → DB ในเครื่อง (ทางเดียว ไม่เขียนกลับขึ้นเว็บจริง)
- ไม่ดึง `users` / `registrations` (ข้อมูลส่วนตัว) → บัญชีในเครื่องยังเป็นของเดิม
- การ Join ในเครื่องถูกล้าง (เพราะกิจกรรมเปลี่ยนเป็นชุดจากเว็บจริง)
- ก่อนเขียน จะแสดงสิ่งที่ต่างกัน (เพิ่ม / แก้คอลัมน์ไหน / ลบ — ไม่นับ `created_at`, `updated_at`)
  และ**ถามยืนยัน (พิมพ์ `y`)** ถ้าข้อมูลในเครื่องจะถูกลบหรือทับ · ถ้ามีแค่ข้อมูลใหม่จะทำต่อเลย · ข้ามการถาม: `npm run db:pull -- --yes`

### DBeaver: เชื่อมต่อ DB เว็บจริง (TiDB)

New Database Connection → **MySQL** → Host / Port `4000` / Database `runbkk` / Username / Password จาก `.env.production`
→ แท็บ **SSL**: ติ๊ก Use SSL + Require SSL
→ **General**: ตั้งชื่อ `RUN BKK – PRODUCTION` และ Connection type = **Production** (DBeaver จะแสดงสีแดงและถามยืนยันก่อนแก้ข้อมูล)
