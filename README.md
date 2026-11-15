# RUN BKK

เว็บไซต์รวมชมรมวิ่ง (Running Clubs) และกิจกรรมวิ่งในกรุงเทพฯ เช่น Morning Run, Social Run, Night Run และ Beginner Friendly Run
ผู้ใช้ค้นหาคลับ/กิจกรรม ดูสถานที่ วัน เวลา ระยะทาง ค่าใช้จ่าย กดไปสมัครกับผู้จัด และกด "สนใจ" เก็บกิจกรรมไว้ในลิสต์ของตัวเองได้ (ไม่ใช่เว็บขายบัตรงานวิ่ง และไม่รับสมัครเอง)

## Features

| ผู้ใช้ | ทำอะไรได้ |
|---|---|
| ทุกคน | Home, FAQ, Register, Login, ลืมรหัสผ่าน (ส่งลิงก์ตั้งรหัสใหม่ทางอีเมล) |
| Member (login แล้ว) | ดูคลับ/กิจกรรม + รายละเอียด, Search / Filter / Sort, สนใจ / เอาออกจากลิสต์, My Runs, แก้ Profile / เปลี่ยนรหัสผ่าน |
| Admin | ทุกอย่างของ Member + เพิ่ม/แก้/ลบคลับ, เพิ่ม/แก้/ยกเลิก/ลบกิจกรรม (อัปโหลดรูปได้), ดูรายชื่อผู้เข้าร่วม, จัดการผู้ใช้ |

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5, EJS (server-side rendering)
- **Backend:** Node.js, Express 5
- **Database:** MySQL (mysql2) — พัฒนาบน MariaDB, deploy บน TiDB Cloud (MySQL-compatible)
- **Auth:** express-session + express-mysql-session (เก็บ session ใน DB), bcrypt
- **Upload:** multer — รูปเก็บใน DB (ตาราง `images`) เพราะ server ฟรีไม่เก็บไฟล์ถาวร

## โครงสร้างโปรเจกต์

```
app.js              จุดเริ่มเซิร์ฟเวอร์: EJS, static, session, routes, error handler
config/db.js        connection pool ของ MySQL
middleware/auth.js  requireLogin / requireRole / requireGuest
routes/             pages, auth, password (ลืมรหัสผ่าน), clubs, events, member, admin, uploads (ส่งรูปจาก DB)
utils/              format.js (วันที่/ระยะ), validators.js (ตรวจฟอร์ม), upload.js (รับ/ตรวจ/เก็บรูป), mailer.js (ส่งอีเมลผ่าน Brevo)
views/              หน้า EJS + partials (head, navbar, footer, flash)
public/             CSS, รูป, Bootstrap, validate.js (ตรวจฟอร์มฝั่ง client)
database/           runbkk.sql (ตาราง), seed.sql (ข้อมูลเริ่มต้น), migrations/, setup.js, migrate.js, pull.js, make-admin.js, README.md (ER Diagram)
```

## รันในเครื่อง

ต้องมี Node.js 20+ และ MySQL/MariaDB

```bash
npm install
cp .env.example .env        # แล้วใส่รหัส DB และ SESSION_SECRET
npm run db:setup            # สร้างตาราง + ข้อมูลเริ่มต้น
npm run dev                 # http://localhost:3000
```

สร้าง admin: สมัครผ่านหน้า `/register` แล้วรัน

```bash
npm run make-admin -- your@email.com
```

## Deploy (ฟรี)

| ส่วน | บริการ |
|---|---|
| Web (Node.js) | [Render](https://render.com) — Free Web Service |
| Database (MySQL) | [TiDB Cloud](https://tidbcloud.com) — Starter (free) |

1. **TiDB Cloud:** สร้าง Starter cluster → SQL Editor รัน `CREATE DATABASE runbkk;` → Connect → เลือก General / Node.js เพื่อดู host, port, user, password
2. **สร้าง DB บน cloud จากเครื่องตัวเอง:** สร้างไฟล์ `.env.production` (ไม่ขึ้น Git) ใส่ค่า DB ของ TiDB และ `DB_SSL=true` แล้วรัน
   ```bash
   ENV_FILE=.env.production npm run db:setup
   ```
3. **Render:** New → Web Service → เชื่อม GitHub repo
   - Build Command: `npm install` · Start Command: `npm start` · Instance: Free
   - Environment Variables: `NODE_ENV=production`, `SESSION_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `APP_URL` (URL ของเว็บ), `BREVO_API_KEY`, `MAIL_FROM` (ส่งอีเมลลืมรหัสผ่าน)
4. สมัครบัญชีบนเว็บจริง แล้วรัน `ENV_FILE=.env.production npm run make-admin -- your@email.com`

หมายเหตุ: Render แบบฟรีจะหลับเมื่อไม่มีผู้ใช้ 15 นาที การเปิดครั้งแรกหลังจากนั้นใช้เวลาประมาณ 1 นาที

## Security

- รหัสผ่าน hash ด้วย bcrypt / Session ID เปลี่ยนใหม่หลัง login / ทำลาย session เมื่อ logout
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` (production)
- ทุก query ใช้ parameterized (`?`) กัน SQL Injection / ORDER BY ใช้ whitelist
- ตรวจข้อมูลทั้งฝั่ง client และ server / EJS escape ข้อมูล (`<%= %>`) กัน XSS / รับเฉพาะลิงก์ http(s)
- อัปโหลดรูป: admin เท่านั้น, ≤ 2 MB, ตรวจชนิดจากเนื้อไฟล์จริง (JPG/PNG/WEBP — ไม่รับ SVG), ส่งรูปพร้อม `nosniff`
- ตรวจสิทธิ์ฝั่ง server ทุก route (login + role) / role อ่านจาก DB ทุก request
- บันทึกลงลิสต์: server ตรวจว่ากิจกรรม published + ยังไม่ถึงเวลา / `UNIQUE(user_id, run_session_id)` + `INSERT IGNORE` กันบันทึกซ้ำ / เอาออกได้เฉพาะของตัวเอง (`WHERE user_id = session`)
- ลืมรหัสผ่าน: ตอบข้อความเดียวกันไม่ว่ามีอีเมลในระบบหรือไม่ / token สุ่มด้วย `crypto` เก็บใน DB เป็น SHA-256 / ใช้ได้ 30 นาที ครั้งเดียว / ขอซ้ำได้ทุก 1 นาที / ลิงก์ใช้ `APP_URL` ไม่ใช้ Host header
- ค่าลับเก็บใน environment variables (`.env` ไม่ขึ้น Git)
