// RUN BKK — จุดเริ่มต้นของเซิร์ฟเวอร์
require("dotenv").config({ quiet: true }); // โหลดค่าจากไฟล์ .env เข้า process.env

const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const pool = require("./config/db");
const pageRoutes = require("./routes/pages");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  console.error("Missing SESSION_SECRET in .env");
  process.exit(1);
}

// 1) ตั้งค่า EJS เป็น template engine และบอกว่าไฟล์ view อยู่ที่ไหน
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// บน Render แอปอยู่หลัง proxy (HTTPS) → ต้องบอก Express ให้เชื่อ proxy ไม่งั้น secure cookie จะไม่ถูกส่ง
if (isProduction) app.set("trust proxy", 1);

// 2) ไฟล์ static (CSS, รูป, Bootstrap) ส่งให้ browser ตรงๆ จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

// 3) อ่านข้อมูลจาก <form method="POST"> ให้อยู่ใน req.body
app.use(express.urlencoded({ extended: false }));

// 4) Session: เก็บข้อมูล session ในตาราง sessions (ไม่หายเมื่อรีสตาร์ทเซิร์ฟเวอร์)
//    browser เก็บแค่ cookie ที่มี session id (ที่ถูก sign ด้วย SESSION_SECRET)
app.use(
  session({
    name: "runbkk.sid",
    secret: process.env.SESSION_SECRET,
    store: new MySQLStore({ createDatabaseTable: true }, pool),
    resave: false, // ไม่ต้องบันทึกซ้ำถ้า session ไม่เปลี่ยน
    saveUninitialized: false, // ไม่สร้าง session ให้คนที่ยังไม่มีข้อมูลอะไรเลย
    cookie: {
      httpOnly: true, // JavaScript ในหน้าเว็บอ่าน cookie ไม่ได้ (กัน XSS ขโมย session)
      sameSite: "lax", // ไม่ส่ง cookie ไปกับ POST จากเว็บอื่น (ช่วยกัน CSRF)
      secure: isProduction, // production ส่ง cookie ผ่าน HTTPS เท่านั้น
      maxAge: 1000 * 60 * 60 * 24, // 1 วัน
    },
  })
);

// 5) ส่งข้อมูลที่ทุกหน้าต้องใช้ไปให้ view (navbar ต้องรู้ว่าใคร login อยู่)
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  // flash = ข้อความแจ้งเตือนครั้งเดียว: แสดงแล้วลบทิ้ง
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// 6) Routes
app.use("/", pageRoutes);
app.use("/", authRoutes);

// 7) ไม่เจอ route ไหนเลย → หน้า 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found - RUN BKK",
    status: 404,
    message: "ไม่พบหน้าที่คุณต้องการ",
  });
});

// 8) Error handler กลาง (Express รู้ว่าเป็น error handler เพราะมี 4 parameters)
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
