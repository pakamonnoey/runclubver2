# RUN BKK

เว็บไซต์รวมชมรมวิ่ง (Running Clubs) และกิจกรรมวิ่งในกรุงเทพฯ เช่น Morning Run, Social Run, Night Run และ Beginner Friendly Run
ผู้ใช้ค้นหาคลับ/กิจกรรม ดูสถานที่ วัน เวลา ระยะทาง Pace และกด Join กิจกรรมได้ (ไม่ใช่เว็บขายบัตรงานวิ่ง)

## Features

| ผู้ใช้ | ทำอะไรได้ |
|---|---|
| ทุกคน | Home, FAQ, Register, Login |
| Member (login แล้ว) | ดูคลับ/กิจกรรม + รายละเอียด, Search / Filter / Sort, Join / Cancel, My Runs, แก้ Profile / เปลี่ยนรหัสผ่าน |
| Admin | ทุกอย่างของ Member + เพิ่ม/แก้/ลบคลับ, เพิ่ม/แก้/ยกเลิก/ลบกิจกรรม, ดูรายชื่อผู้เข้าร่วม, จัดการผู้ใช้ |

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5, EJS (server-side rendering)
- **Backend:** Node.js, Express 5
- **Database:** MySQL (mysql2) — พัฒนาบน MariaDB, deploy บน TiDB Cloud (MySQL-compatible)
- **Auth:** express-session + express-mysql-session (เก็บ session ใน DB), bcrypt

## โครงสร้างโปรเจกต์

```
app.js              จุดเริ่มเซิร์ฟเวอร์: EJS, static, session, routes, error handler
config/db.js        connection pool ของ MySQL
middleware/auth.js  requireLogin / requireRole / requireGuest
routes/             pages, auth, clubs, events, member, admin
utils/              format.js (วันที่/ระยะ), validators.js (ตรวจฟอร์ม)
views/              หน้า EJS + partials (head, navbar, footer, flash)
public/             CSS, รูป, Bootstrap, validate.js (ตรวจฟอร์มฝั่ง client)
database/           runbkk.sql (ตาราง), seed.sql (ข้อมูลเริ่มต้น), setup.js, make-admin.js, README.md (ER Diagram)
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
   - Environment Variables: `NODE_ENV=production`, `SESSION_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`
4. สมัครบัญชีบนเว็บจริง แล้วรัน `ENV_FILE=.env.production npm run make-admin -- your@email.com`

หมายเหตุ: Render แบบฟรีจะหลับเมื่อไม่มีผู้ใช้ 15 นาที การเปิดครั้งแรกหลังจากนั้นใช้เวลาประมาณ 1 นาที

## Security

- รหัสผ่าน hash ด้วย bcrypt / Session ID เปลี่ยนใหม่หลัง login / ทำลาย session เมื่อ logout
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` (production)
- ทุก query ใช้ parameterized (`?`) กัน SQL Injection / ORDER BY ใช้ whitelist
- ตรวจข้อมูลทั้งฝั่ง client และ server / EJS escape ข้อมูล (`<%= %>`) กัน XSS / รับเฉพาะลิงก์ http(s)
- ตรวจสิทธิ์ฝั่ง server ทุก route (login + role) / role อ่านจาก DB ทุก request
- Join ใช้ transaction + `SELECT ... FOR UPDATE` กันจำนวนคนเกิน / UNIQUE กันสมัครซ้ำ
- ค่าลับเก็บใน environment variables (`.env` ไม่ขึ้น Git)
