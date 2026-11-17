require("dotenv").config({ quiet: true }); // อ่านค่าจาก .env

const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const pool = require("./config/db");
const pageRoutes = require("./routes/pages");
const authRoutes = require("./routes/auth");
const passwordRoutes = require("./routes/password");
const clubRoutes = require("./routes/clubs");
const eventRoutes = require("./routes/events");
const memberRoutes = require("./routes/member");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/uploads");
const format = require("./utils/format");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in .env");
  process.exit(1);
}

// 1) EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ทุก view เรียกใช้ fmt ได้ เช่น fmt.thaiDate(...)
app.locals.fmt = format;

// Render อยู่หลัง proxy หลายชั้น (IP ภายใน 10.x) ต้องเชื่อ proxy เหล่านี้
// ไม่งั้น secure cookie ใช้ไม่ได้ และ req.ip จะได้ IP ของ proxy แทน IP ผู้ใช้
if (isProduction) app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

// 2) ไฟล์ใน public (CSS, รูป, JS)
app.use(express.static(path.join(__dirname, "public")));

// 3) อ่านข้อมูลฟอร์มเข้า req.body
app.use(express.urlencoded({ extended: false }));
// Express 5: ไม่มี body จะได้ undefined
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

// 4) Session เก็บในตาราง sessions (รีสตาร์ทเซิร์ฟเวอร์แล้วไม่หลุด)
app.use(
  session({
    name: "runbkk.sid",
    secret: process.env.SESSION_SECRET,
    store: new MySQLStore({ createDatabaseTable: true }, pool),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS ในหน้าเว็บอ่าน cookie ไม่ได้
      sameSite: "lax", // กัน CSRF
      secure: isProduction, // HTTPS เท่านั้น
      maxAge: 1000 * 60 * 60 * 24, // 1 วัน
    },
  })
);

// 5) ข้อมูลที่ทุกหน้าใช้ (navbar)
app.use(async (req, res, next) => {
  // อ่าน role/ชื่อล่าสุดจาก DB ทุกครั้ง admin เปลี่ยน role หรือลบ user จะมีผลทันที
  if (req.session.user) {
    const [rows] = await pool.query("SELECT id, name, role FROM users WHERE id = ?", [
      req.session.user.id,
    ]);
    const fresh = rows[0];
    if (!fresh) {
      delete req.session.user; // user ถูกลบไปแล้ว
    } else if (fresh.role !== req.session.user.role || fresh.name !== req.session.user.name) {
      req.session.user = fresh;
    }
  }

  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path; // navbar ใช้ไฮไลต์เมนู
  // flash แสดงครั้งเดียวแล้วลบ
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// 6) Routes
app.use("/", pageRoutes); // Home, FAQ
app.use("/", authRoutes); // register, login, logout
app.use("/", passwordRoutes); // ลืมรหัสผ่าน
app.use("/clubs", clubRoutes);
app.use("/events", eventRoutes);
app.use("/", memberRoutes); // my-runs, profile
app.use("/admin", adminRoutes);
app.use("/uploads", uploadRoutes); // รูปที่เก็บใน DB

// 7) 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found - RUN BKK",
    status: 404,
    message: "ไม่พบหน้าที่คุณต้องการ",
  });
});

// 8) error handler (ต้องมี 4 parameter)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Error - RUN BKK",
    status: 500,
    message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
  });
});

app.listen(PORT, () => {
  console.log(`RUN BKK running at http://localhost:${PORT}`);
});
