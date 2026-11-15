// Register / Login / Logout
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireGuest } = require("../middleware/auth");
const { checkNewPassword } = require("../utils/validators");

const router = express.Router();

const SALT_ROUNDS = 10; // ยิ่งมากยิ่งปลอดภัยแต่ช้าลง 10 เป็นค่ามาตรฐาน
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------
// Validation ฝั่ง server (ต้องมีเสมอ เพราะ client ปิด JS / ยิง request ตรงได้)
// คืนค่าเป็น object { ชื่อช่อง: "ข้อความ error" } — ว่าง = ผ่าน
// ---------------------------------------------------------------
function validateRegister({ name, email, password, confirmPassword }) {
  const errors = checkNewPassword(password, confirmPassword); // กฎรหัสผ่าน (utils/validators.js)

  if (name.length < 2 || name.length > 100) {
    errors.name = "ชื่อต้องมี 2–100 ตัวอักษร";
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return errors;
}

// express-session ใช้ callback → แปลงเป็น Promise เพื่อใช้กับ await ได้
const regenerateSession = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
const saveSession = (req) =>
  new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

// ป้องกัน open redirect: ยอมพากลับเฉพาะ path ภายในเว็บเรา เช่น "/clubs" (ไม่ใช่ "//evil.com")
function safeReturnTo(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

// ===============================================================
// REGISTER
// ===============================================================
router.get("/register", requireGuest, (req, res) => {
  res.render("auth/register", { title: "Register - RUN BKK", values: {}, errors: {} });
});

router.post("/register", requireGuest, async (req, res) => {
  // trim ช่องว่างหัวท้าย / อีเมลเป็นตัวเล็กทั้งหมด (กัน A@x.com กับ a@x.com เป็นคนละบัญชี)
  const values = {
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim().toLowerCase(),
    password: String(req.body.password || ""),
    confirmPassword: String(req.body.confirmPassword || ""),
  };

  const errors = validateRegister(values);

  // เช็กอีเมลซ้ำ (parameterized query: ใช้ ? แทนการต่อ string → กัน SQL Injection)
  if (!errors.email) {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [values.email]);
    if (rows.length > 0) errors.email = "อีเมลนี้ถูกใช้สมัครแล้ว";
  }

  if (Object.keys(errors).length > 0) {
    // ส่งค่าเดิมกลับไปให้ผู้ใช้ไม่ต้องพิมพ์ใหม่ (ยกเว้นรหัสผ่าน)
    return res.status(400).render("auth/register", {
      title: "Register - RUN BKK",
      values: { name: values.name, email: values.email },
      errors,
    });
  }

  const passwordHash = await bcrypt.hash(values.password, SALT_ROUNDS);

  try {
    await pool.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
      values.name,
      values.email,
      passwordHash,
    ]);
  } catch (err) {
    // กันกรณีกดสมัคร 2 ครั้งพร้อมกัน: SELECT ผ่านทั้งคู่ แต่ UNIQUE ใน DB บล็อกครั้งที่ 2
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).render("auth/register", {
        title: "Register - RUN BKK",
        values: { name: values.name, email: values.email },
        errors: { email: "อีเมลนี้ถูกใช้สมัครแล้ว" },
      });
    }
    throw err; // error อื่น → ส่งให้ error handler กลาง
  }

  req.session.flash = { type: "success", message: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ" };
  res.redirect("/login");
});

// ===============================================================
// LOGIN
// ===============================================================
router.get("/login", requireGuest, (req, res) => {
  res.render("auth/login", { title: "Login - RUN BKK", values: {}, error: null });
});

router.post("/login", requireGuest, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const renderError = (message) =>
    res.status(400).render("auth/login", { title: "Login - RUN BKK", values: { email }, error: message });

  if (!email || !password) {
    return renderError("กรุณากรอกอีเมลและรหัสผ่าน");
  }

  const [rows] = await pool.query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];

  // bcrypt.compare: hash รหัสที่พิมพ์มาแล้วเทียบกับ hash ใน DB
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

  // ใช้ข้อความเดียวกันทั้ง "ไม่มีอีเมลนี้" และ "รหัสผิด" → คนร้ายเดาไม่ได้ว่าอีเมลไหนมีบัญชี
  if (!passwordOk) {
    return renderError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  const returnTo = safeReturnTo(req.session.returnTo);

  // สร้าง session id ใหม่หลัง login (กัน Session Fixation)
  await regenerateSession(req);

  // เก็บเฉพาะข้อมูลที่จำเป็น ห้ามเก็บรหัสผ่าน/hash ลง session
  req.session.user = { id: user.id, name: user.name, role: user.role };
  req.session.flash = { type: "success", message: `ยินดีต้อนรับ ${user.name}` };
  await saveSession(req);

  res.redirect(returnTo);
});

// ===============================================================
// LOGOUT (ใช้ POST ไม่ใช่ GET — กันเว็บอื่นแอบใส่ลิงก์ /logout ให้เรา logout)
// ===============================================================
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("runbkk.sid");
    res.redirect("/");
  });
});

module.exports = router;
