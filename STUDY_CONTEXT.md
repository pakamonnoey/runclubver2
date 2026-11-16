# RUN BKK — สรุปโปรเจกต์สำหรับเตรียม Oral Test

> เอกสารนี้ใช้เป็นบริบทเริ่มต้นในแชทใหม่ สรุปสถานะ ณ 16 พ.ย. 2569 (commit `a0c5874` บน branch `feature/fullstack`)

## 0. ภาพรวม

- **RUN BKK** = เว็บรวมคลับวิ่ง (Running Clubs) และกิจกรรมวิ่งทั่วไปในกรุงเทพฯ สำหรับนักศึกษา
- **ไม่ใช่** เว็บขายบัตรหรือรับสมัครงานวิ่ง การสมัครจริงอยู่ที่ลิงก์ของผู้จัด เว็บเราให้สมาชิกกด "สนใจ" เก็บกิจกรรมไว้ดูใน My Runs
- เว็บจริง: https://runbkk.onrender.com (Render ฟรี + TiDB Cloud ฟรี)
- โจทย์อาจารย์:
  1. มีระบบสมัครสมาชิก / login พร้อม validation
  2. ทุกหน้า (ยกเว้นหน้าสาธารณะ) ต้อง login ก่อน ตรวจผ่าน session
  3. ข้อมูลที่แสดงต้องมาจาก database
  4. วันสอบ Oral Test จะได้โจทย์ให้เพิ่มฟีเจอร์สด และต้องอธิบายโค้ดได้ทั้งหมด

### กติกาที่ตกลงกันไว้ (ใช้ต่อในแชทใหม่)
- ห้าม commit / push โดยไม่ได้รับอนุญาต
- ห้ามสร้างข้อมูลคลับ กิจกรรม วัน เวลา สถานที่ หรือ URL ขึ้นมาเอง ข้อมูลที่ยังไม่ยืนยันต้องเป็น draft / pending
- ห้ามลบไฟล์ที่ผู้ใช้เพิ่มเองโดยไม่ถามก่อน (ถามทีละไฟล์)
- โค้ดต้องง่ายระดับนักศึกษา ไม่เพิ่ม library โดยไม่จำเป็น deploy ต้องฟรี 100%
- ขั้นตอนทำงาน: วางแผน → ผู้ใช้อนุมัติ → แก้ → ทดสอบ (`npm test`)
- อธิบายเป็นภาษาไทยแบบง่าย ทีละขั้น

### การตัดสินใจที่ยืนยันแล้ว
- หน้าสาธารณะมีแค่ Home, FAQ, Login, Register, ลืมรหัสผ่าน ที่เหลือต้อง login (/events และ /clubs ก็ต้อง login)
- Role มีแค่ `member` กับ `admin` (เคยมี Club Owner แต่ตัดออกแล้ว) admin คนเดียวกรอกข้อมูลคลับ/กิจกรรม
- Running Spots (Lumpini, Benjakitti, Chatuchak) เขียนตายตัวใน `views/index.ejs` ไม่ได้อยู่ใน DB (ตั้งใจ เพราะเป็นข้อมูลแสดงผลที่ไม่เปลี่ยน)
- หน้า /clubs ไม่มีช่องค้นหา (มีแค่ 6 คลับ)
- ภาษาไทย/อังกฤษปนกันตามที่เป็นอยู่ ผู้ใช้ตัดสินใจไม่ปรับ
- หัวข้อ About "WHO WE ARE / Running is better together." ตั้งใจให้เป็นอังกฤษ

---

## 1. Technology Stack

| ส่วน | ใช้อะไร | หมายเหตุ |
|---|---|---|
| Runtime | Node.js 20+ | |
| Web framework | Express 5 | |
| Template | EJS | `<%= %>` escape ข้อความ, `<%- %>` ใช้กับ include เท่านั้น |
| Database | MySQL / MariaDB (ในเครื่อง), TiDB Cloud (เว็บจริง) | library `mysql2/promise` |
| Session | `express-session` + `express-mysql-session` | เก็บ session ในตาราง `sessions` |
| รหัสผ่าน | `bcrypt` (salt rounds 10) | |
| อัปโหลดรูป | `multer` (memoryStorage) | รูปเก็บในตาราง `images` |
| ส่งอีเมล | Brevo HTTP API ผ่าน `fetch` | ไม่ใช้ SMTP เพราะ Render ฟรีบล็อกพอร์ต SMTP |
| CSS | Bootstrap (ไฟล์ใน `public/vendor`) + `public/style.css` | |
| ทดสอบ | `node:test` + `fetch` (มีใน Node อยู่แล้ว) | `npm test` |
| Dev | `nodemon` | `npm run dev` |
| Deploy | Render (web) + TiDB Cloud (DB) | ฟรีทั้งคู่ |

สีหลักของเว็บ: พื้นครีม `#f7f5ef`, สีส้ม `#ff6b35` (ใช้เน้นเท่านั้น), สีกรมเข้ม `#17202a` (ตัวหนังสือ/footer)

---

## 2. โครงสร้างโปรเจกต์

```
app.js                 จุดเริ่มเซิร์ฟเวอร์: ตั้งค่า EJS, static, body, session, ข้อมูลกลาง, routes, 404, error handler
config/db.js           connection pool ของ MySQL (ใช้ตัวเดียวทั้งโปรเจกต์) + ตั้ง time_zone เป็น +07:00
middleware/auth.js     requireLogin / requireRole / requireGuest / forbidden
routes/
  pages.js             GET /  (Home), GET /faq
  auth.js              /register, /login, /logout
  password.js          /forgot-password, /reset-password/:token
  clubs.js             /clubs, /clubs/:id
  events.js            /events, /events/:id, POST save / unsave
  member.js            /my-runs, /profile (+ เปลี่ยนชื่อ / เปลี่ยนรหัส)
  admin.js             /admin/* (dashboard, users, clubs, events, participants)
  uploads.js           GET /uploads/:id ส่งรูปจากตาราง images
utils/
  format.js            ฟังก์ชันจัดรูปแบบที่ view ใช้ผ่าน `fmt` (วันที่, ระยะทาง, รูปสำรอง, ชื่อ IG)
  validators.js        ตรวจฟอร์มคลับ / กิจกรรม / กฎรหัสผ่าน
  upload.js            รับไฟล์รูป, ตรวจชนิดไฟล์จากเนื้อไฟล์, บันทึก/ลบรูปใน DB
  mailer.js            ส่งอีเมลผ่าน Brevo (ในเครื่องไม่มี key จะพิมพ์ลิงก์ออก Terminal)
views/
  index.ejs, faq.ejs, events.ejs, event-detail.ejs, clubs.ejs, club-detail.ejs, error.ejs
  auth/                login, register, forgot-password, reset-password
  member/              my-runs, profile
  admin/               dashboard, users, clubs, club-form, events, event-form, participants
  partials/            head, navbar, footer, flash, icon (SVG), event-row (การ์ดกิจกรรม), image-field, admin-nav
public/
  style.css            CSS ทั้งเว็บ
  js/validate.js       ตรวจฟอร์มฝั่ง browser (server ตรวจซ้ำเสมอ)
  js/image-field.js    แสดงตัวอย่างรูปก่อนอัปโหลด
  js/flash.js          ข้อความสำเร็จหายเองใน 5 วินาที
  image/               รูปโลโก้คลับ, hero, spots
database/
  runbkk.sql           สร้างตารางทั้งหมด (DROP ก่อน — ใช้ตอนเริ่มใหม่เท่านั้น)
  seed.sql             ข้อมูลเริ่มต้น (6 คลับ)
  migrations/          001–004 อัปเดตโครงสร้างโดยไม่ลบข้อมูล
  setup.js, migrate.js, pull.js, make-admin.js   สคริปต์ npm
  README.md            ER Diagram
tests/                 ชุดทดสอบอัตโนมัติ (helpers + 5 ไฟล์)
```

### คำสั่ง npm

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันเว็บในเครื่อง (nodemon) ที่ http://localhost:3000 |
| `npm start` | รันแบบ production (Render ใช้) |
| `npm test` | รันชุดทดสอบ (ต้องเปิด `npm run dev` ไว้ก่อน) |
| `npm run db:setup` | สร้างตาราง + ข้อมูลเริ่มต้น (หยุดเองถ้ามีข้อมูลอยู่แล้ว) |
| `npm run db:migrate` | รัน migrations ที่ยังไม่ได้รัน (รันซ้ำได้) |
| `npm run db:pull` | ดึงคลับ/กิจกรรมจากเว็บจริงลง DB ในเครื่อง (ไม่ดึง users) |
| `npm run make-admin -- email` | ทำให้บัญชีเป็น admin |

ใส่ `ENV_FILE=.env.production` หน้าคำสั่ง db เพื่อทำกับ DB บน cloud

---

## 3. Database (7 ตาราง)

```
users 1 ──< registrations >── 1 run_sessions >── 1 clubs
users 1 ──< password_resets
images   (clubs.image / run_sessions.image เก็บ path "/uploads/<id>")
sessions (ของ express-mysql-session)
```

| ตาราง | หน้าที่ | คอลัมน์สำคัญ |
|---|---|---|
| `users` | สมาชิก | `email` UNIQUE, `password_hash` (bcrypt), `role` ENUM('member','admin') |
| `clubs` | คลับวิ่ง | `name` UNIQUE, `description`, `location`, `regular_schedule`, `instagram_url`, `image`, `status` ENUM('pending','published') |
| `run_sessions` | กิจกรรมวิ่ง 1 แถว = 1 ครั้ง | `club_id` FK, `title`, `run_type` ENUM('morning','social','night','beginner'), `start_at` DATETIME (เวลาไทย), `meeting_point`, `distance_km` DECIMAL(4,1), `fee` (NULL = ฟรี), `external_url` (ลิงก์สมัครของผู้จัด), `source_url` (แหล่งที่มา), `image`, `status` ENUM('draft','published','cancelled') |
| `registrations` | ใครกด "สนใจ" กิจกรรมไหน (ตารางกลาง Many-to-Many) | `user_id`, `run_session_id`, UNIQUE(user_id, run_session_id) |
| `images` | รูปที่ admin อัปโหลด | `mime_type`, `data` MEDIUMBLOB, `size` |
| `password_resets` | ลิงก์ลืมรหัสผ่าน | `token_hash` CHAR(64) (SHA-256), `expires_at` |
| `sessions` | login session | `session_id`, `expires`, `data` |

- **ON DELETE CASCADE:** ลบคลับ → กิจกรรมหาย, ลบกิจกรรม/ผู้ใช้ → registrations หาย, ลบผู้ใช้ → password_resets หาย
- **ทำไมรูปอยู่ใน DB:** Render ฟรีลบไฟล์ที่เขียนลงดิสก์ทุกครั้งที่ server เริ่มใหม่
- **Migrations:**
  - 001 ตาราง images
  - 002 เพิ่ม regular_schedule, fee, source_url
  - 003 ลบคอลัมน์ pace / capacity ที่เลิกใช้
  - 004 ตาราง password_resets
- **เขตเวลา:** pool ตั้ง `SET time_zone = '+07:00'` ทุก connection เพราะ TiDB ใช้ UTC ถ้าไม่ตั้ง `NOW()` จะช้ากว่าเวลาไทย 7 ชม.

---

## 4. Backend, Routing และ Session

### ลำดับใน `app.js` (request ผ่านจากบนลงล่าง)
1. ตั้งค่า EJS และ `app.locals.fmt` (ทุก view เรียก `fmt.thaiDate(...)` ได้)
2. `express.static("public")` ส่งไฟล์ CSS/รูป/JS
3. `express.urlencoded` อ่านฟอร์มเข้า `req.body`
4. `express-session` เก็บ session ในตาราง `sessions` cookie ชื่อ `runbkk.sid`
   - `httpOnly` (JS อ่าน cookie ไม่ได้), `sameSite: "lax"` (กัน CSRF), `secure` บน production, อายุ 1 วัน
5. Middleware ข้อมูลกลาง:
   - ถ้า login อยู่ อ่านชื่อ/role ล่าสุดจาก DB ทุก request (admin เปลี่ยน role หรือลบ user มีผลทันที)
   - ตั้ง `res.locals.currentUser`, `currentPath` (ไฮไลต์เมนูสีส้ม), `flash` (ข้อความครั้งเดียวแล้วลบ)
6. Routes
7. 404
8. Error handler (มี 4 parameter `(err, req, res, next)`)

### Middleware ตรวจสิทธิ์ (`middleware/auth.js`)
- `requireLogin` — ยังไม่ login → จำหน้าไว้ใน `req.session.returnTo` → redirect `/login` (login เสร็จพากลับมาหน้าเดิม)
- `requireRole("admin")` — ยังไม่ login → เหมือนข้างบน, login แล้วแต่ไม่ใช่ admin → 403
- `requireGuest` — login แล้วเข้าหน้า login/register ไม่ได้ → กลับหน้าแรก
- วิธีใช้: `router.use(requireLogin)` (ทั้งไฟล์ เช่น clubs.js, events.js) หรือใส่ทีละ route (member.js เพราะ mount ที่ "/")

### ตาราง Route

| Method | Path | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| GET | `/` | ทุกคน | Home: 3 กิจกรรมที่ใกล้ที่สุด + โลโก้คลับจาก DB |
| GET | `/faq` | ทุกคน | FAQ |
| GET/POST | `/register` | guest | สมัครสมาชิก |
| GET/POST | `/login` | guest | login |
| POST | `/logout` | ทุกคน | ลบ session (ใช้ POST กันเว็บอื่นแอบ logout เรา) |
| GET/POST | `/forgot-password` | guest | ขอลิงก์ตั้งรหัสใหม่ทางอีเมล |
| GET/POST | `/reset-password/:token` | guest | ตั้งรหัสใหม่จากลิงก์ |
| GET | `/events` | login | รายการ + ค้นหา (`q`, `location`) + กรอง (`type`, `distance`) + เรียง (`sort`) |
| GET | `/events/:id` | login | รายละเอียด (`?from=club` / `?from=my-runs` เปลี่ยนปุ่มย้อนกลับ) |
| POST | `/events/:id/save` | login | กดสนใจ (INSERT IGNORE) |
| POST | `/events/:id/unsave` | login | เอาออกจากลิสต์ (ลบได้แค่ของตัวเอง) |
| GET | `/clubs` | login | รายการคลับ published + จำนวนกิจกรรมที่จะมาถึง |
| GET | `/clubs/:id` | login | ข้อมูลคลับ + กิจกรรมที่กำลังจะมาถึง |
| GET | `/my-runs` | login | ลิสต์ที่กดสนใจ แยก "กำลังจะมาถึง" / "ที่ผ่านมา" |
| GET/POST | `/profile`, `/profile/password` | login | แก้ชื่อ, เปลี่ยนรหัส (ต้องใส่รหัสเดิม) |
| GET | `/admin` | admin | Dashboard ตัวเลขสรุป |
| GET/POST | `/admin/users...` | admin | เปลี่ยน role, ลบผู้ใช้ |
| GET/POST | `/admin/clubs...` | admin | เพิ่ม / แก้ / ลบคลับ (อัปโหลดรูปได้) |
| GET/POST | `/admin/events...` | admin | เพิ่ม / แก้ / ยกเลิก / ลบกิจกรรม, ดูรายชื่อผู้สนใจ |
| GET | `/uploads/:id` | ทุกคน | ส่งรูปจากตาราง images |

### ตัวอย่างการไหลของข้อมูล (ใช้ตอบอาจารย์): เปิดหน้า `/clubs`
1. Browser ส่ง `GET /clubs` พร้อม cookie `runbkk.sid`
2. express-session อ่าน session จากตาราง `sessions` → ได้ `req.session.user`
3. `app.js` → `app.use("/clubs", clubRoutes)`
4. `routes/clubs.js` → `router.use(requireLogin)` ผ่าน (ถ้าไม่ login → redirect `/login`)
5. `router.get("/")` → `pool.query("SELECT ... FROM clubs WHERE status = 'published'")`
6. `res.render("clubs", { clubs })` → `views/clubs.ejs` วน `clubs.forEach` สร้างการ์ด
7. ส่ง HTML กลับ browser

---

## 5. Features ที่เสร็จแล้ว

### สมาชิก / ความปลอดภัย
- สมัครสมาชิก: ตรวจทั้งฝั่ง browser (`validate.js`) และ server (`validateRegister` + `checkNewPassword`)
  - ชื่อ 2–100 ตัว, อีเมลถูกรูปแบบ, รหัส ≥ 8 ตัว มีทั้งตัวอักษรอังกฤษและตัวเลข, ยืนยันรหัสตรงกัน
  - อีเมลแปลงเป็นตัวเล็ก กันสมัครซ้ำด้วย SELECT + UNIQUE ใน DB
- Login: `bcrypt.compare`, ข้อความ error เดียวกันทั้งอีเมลไม่มีและรหัสผิด, `req.session.regenerate` หลัง login (กัน session fixation), returnTo กลับหน้าเดิม (รับเฉพาะ path ในเว็บ กัน open redirect)
- ลืมรหัสผ่าน:
  - token สุ่ม `crypto.randomBytes(32)`, DB เก็บแค่ SHA-256
  - ใช้ได้ 30 นาที ครั้งเดียว ขอซ้ำใน 1 นาทีไม่ส่งใหม่
  - ตอบข้อความเดียวกันทุกกรณี, ลิงก์สร้างจาก `APP_URL`, `Referrer-Policy: no-referrer`
  - ใช้งานจริงบนเว็บแล้ว (ผู้ใช้ทดสอบแล้วได้รับอีเมลและเปลี่ยนรหัสได้)
- Profile: แก้ชื่อ, เปลี่ยนรหัส (ต้องใส่รหัสเดิมถูก)
- SQL ทุกที่ใช้ `?` (parameterized) กัน SQL injection; ค่า filter/sort ใช้ whitelist
- EJS `<%= %>` escape ทุกข้อความ กัน XSS; ลิงก์ที่ admin กรอกรับเฉพาะ http/https

### ฝั่งผู้ใช้
- **Home:** Hero, About, โลโก้คลับ (จาก DB), 3 กิจกรรมที่ใกล้ที่สุด (โปสเตอร์เต็มรูปบนพื้นหลังเบลอ), Running Spots
- **Events:** ค้นหา/กรอง/เรียง, การ์ดกิจกรรม (partial `event-row.ejs`), กดได้ทั้งการ์ด (stretched link)
- **Event detail:** โปสเตอร์, ข้อมูลวัน เวลา จุดนัดพบ ระยะ ค่าใช้จ่าย จำนวนคนสนใจ, ปุ่ม "สมัครกับผู้จัด ↗", ปุ่มสนใจ/เอาออก, ลิงก์โพสต์ต้นทาง, ปุ่มย้อนกลับไปหน้าที่เปิดมา
- **Clubs:** การ์ดโลโก้สี่เหลี่ยม + คำอธิบายเต็ม + สถานที่/ตารางวิ่ง/@IG + ปุ่ม "ดูกิจกรรมของคลับ (N)"
- **Club detail:** การ์ดข้อมูลคลับด้านบน, รายการ "กิจกรรมที่กำลังจะมาถึง" เป็นส่วนหลัก
- **My Runs:** ลิสต์ที่กดสนใจ แยกกำลังจะมาถึง/ที่ผ่านมา, กดเอาออกได้, กิจกรรมที่ถูกยกเลิกแสดงข้อความแดง
- **Navbar:** เมนูหน้าปัจจุบันเป็นสีส้ม (`aria-current="page"`), เมนูมือถือแบบปุ่ม
- **Responsive:** ทดสอบที่ 375 / 768 / 1280px ไม่มีหน้าไหนเลื่อนด้านข้าง

### ฝั่ง Admin
- Dashboard: กิจกรรม draft, คลับรอ publish, จำนวนผู้ใช้/คลับ/กิจกรรม/การบันทึก
- จัดการผู้ใช้ (เปลี่ยน role, ลบ — ทำกับตัวเองไม่ได้)
- จัดการคลับ/กิจกรรม: ฟอร์มพร้อม validation, อัปโหลดรูป (≤ 2 MB, JPG/PNG/WEBP ตรวจจากเนื้อไฟล์), ลบรูปที่ไม่มีใครใช้อัตโนมัติ
- ยกเลิกกิจกรรม (เปลี่ยน status เป็น cancelled — คนที่บันทึกไว้เห็นใน My Runs) หรือลบถาวร
- ดูรายชื่อผู้ที่กดสนใจกิจกรรม
- บนมือถือ: ตารางแสดงเป็นการ์ด (`data-label` + CSS)

### ชุดทดสอบ (`npm test`)
- 35 ข้อ: ผ่าน 34, ข้าม 1 (ข้อ "บันทึกกิจกรรมที่ผ่านไปแล้วไม่ได้" รอให้มีกิจกรรมที่ผ่านไปแล้วใน DB)
- ไฟล์: `auth`, `admin`, `clubs`, `events`, `password` + `helpers.js` (Client จำ cookie)
- ผู้ใช้ทดสอบใช้ `@example.test` ลบเองเมื่อจบ; รันได้เฉพาะ localhost
- ต้องเปิด `npm run dev` ไว้ก่อน (ถ้าเพิ่งแก้ไฟล์ .js ให้รอ nodemon รีสตาร์ตเสร็จก่อน)

---

## 6. ไฟล์สำคัญที่ควรอ่านให้เข้าใจก่อนสอบ (เรียงตามความสำคัญ)

1. `app.js` — ภาพรวมการทำงานทั้งระบบ
2. `middleware/auth.js` — โจทย์ข้อ "ต้อง login ผ่าน session"
3. `routes/auth.js` — register / login / logout (validation, bcrypt, session)
4. `routes/events.js` — query แบบมี WHERE หลายเงื่อนไข, save/unsave, `?from=`
5. `routes/clubs.js` + `views/clubs.ejs` — ตัวอย่าง route → SQL → EJS ที่สั้นที่สุด
6. `config/db.js` — pool และเขตเวลา
7. `database/runbkk.sql` — ตารางและความสัมพันธ์
8. `views/partials/navbar.ejs`, `event-row.ejs` — การใช้ partial และ `locals`
9. `routes/admin.js` + `utils/validators.js` — CRUD ฝั่ง admin
10. `routes/password.js` — ลืมรหัสผ่าน (ถ้าอาจารย์ถามเรื่องความปลอดภัย)

---

## 7. ปัญหา / ส่วนที่ยังไม่สมบูรณ์

**ข้อมูล**
- ข้อมูลกิจกรรมจริงยังมีน้อย (published ที่กำลังจะมาถึง 3 รายการ + draft 1 รายการ) ผู้ใช้พักการเพิ่มข้อมูลไว้ก่อน
- หลายคลับยังไม่มีกิจกรรม หน้าคลับเหล่านั้นจะขึ้น "ยังไม่มีกิจกรรมที่กำลังจะมาถึง"

**ข้อจำกัดที่รู้อยู่ (ตั้งใจไม่ทำ หรือยังไม่ทำ)**
- ไม่มีการจำกัดจำนวนครั้ง login ผิด (rate limit) — เคยเสนอเป็น optional
- ไม่มี CSRF token ในฟอร์ม พึ่ง `sameSite: "lax"` ของ cookie + ใช้ POST สำหรับการเปลี่ยนข้อมูล
- Running Spots เขียนตายตัวใน template (ถ้าอาจารย์สั่งย้ายลง DB = โจทย์ฝึกที่ดี: สร้างตาราง → route → loop ใน EJS)
- อีเมลลืมรหัสผ่านส่งจาก Gmail ผ่าน Brevo อาจเข้า Spam (หน้าเว็บบอกให้เช็ก Spam แล้ว)
- Render ฟรีจะหลับเมื่อไม่มีคนใช้ เปิดครั้งแรกอาจช้า ~30–60 วินาที
- ภาษาไทย/อังกฤษปนกัน (ตัดสินใจคงไว้)
- ชุดทดสอบต้องเปิดเว็บไว้ก่อน ไม่ได้รันอัตโนมัติตอน deploy

**ไอเดียต่อยอด (ถ้ามีเวลา / ใช้ฝึกก่อนสอบ)**
- ช่องทางติดต่อคลับเพิ่ม (Facebook, LINE)
- จำกัดจำนวนครั้ง login
- ย้าย Spots ลง DB

---

## 8. แนวการเตรียม Oral Test ที่วางไว้

ทำทีละเรื่องสั้นๆ: ถาม 1 ข้อ → ผู้ใช้ลองตอบ → อธิบายเพิ่มเฉพาะที่ยังไม่ชัด (เคยลองอธิบายยาวรวดเดียวแล้วงง ให้ใช้ตัวอย่างใกล้ตัวและทีละขั้น)

หัวข้อที่ควรซ้อม:
1. request หนึ่งครั้งเดินทางผ่านไฟล์ไหนบ้าง (ใช้ตัวอย่าง `/clubs` ในข้อ 4)
2. login ทำงานยังไง / session เก็บที่ไหน / cookie มีอะไร
3. guest เปิด `/clubs` แล้วเกิดอะไรขึ้น บรรทัดไหนทำให้เกิด (คำถามที่ค้างไว้ — คำตอบ: `router.use(requireLogin)` ใน `routes/clubs.js` → `requireLogin` ใน `middleware/auth.js` redirect ไป `/login`)
4. ทำไมต้อง validate ทั้งฝั่ง browser และ server
5. ทำไมเก็บรหัสผ่านเป็น hash / ทำไม token ลืมรหัสเก็บแค่ hash
6. `?` ใน SQL กัน SQL injection ยังไง / ทำไม sort ต้องใช้ whitelist
7. ความสัมพันธ์ตาราง และ ON DELETE CASCADE
8. partial (`event-row.ejs`) คืออะไร ทำไมใช้
9. ซ้อมโจทย์สด เช่น "เพิ่มช่องข้อมูลใหม่ให้คลับ" (migration → validators → form → view) แล้วรัน `npm test`
