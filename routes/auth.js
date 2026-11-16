// สมัครสมาชิก / login / logout
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireGuest } = require("../middleware/auth");
const { checkNewPassword } = require("../utils/validators");

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ตรวจซ้ำฝั่ง server เสมอ เพราะฝั่ง browser ปิด JS หรือส่ง request ตรงได้
function validateRegister({ name, email, password, confirmPassword }) {
  const errors = checkNewPassword(password, confirmPassword);

  if (name.length < 2 || name.length > 100) {
    errors.name = "ชื่อต้องมี 2–100 ตัวอักษร";
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return errors;
}

// รับเฉพาะ path ในเว็บเรา เช่น "/clubs" ไม่รับ "//evil.com"
function safeReturnTo(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

// ---------- Register ----------
router.get("/register", requireGuest, (req, res) => {
  res.render("auth/register", { title: "Register - RUN BKK", values: {}, errors: {} });
});

router.post("/register", requireGuest, async (req, res) => {
  const values = {
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim().toLowerCase(), // A@x.com กับ a@x.com คือคนเดียวกัน
    password: String(req.body.password || ""),
    confirmPassword: String(req.body.confirmPassword || ""),
  };

  // ส่งฟอร์มกลับพร้อมค่าเดิม (ไม่ส่งรหัสผ่านกลับ)
  const showErrors = (errors) =>
    res.status(400).render("auth/register", {
      title: "Register - RUN BKK",
      values: { name: values.name, email: values.email },
      errors,
    });

  const errors = validateRegister(values);

  if (!errors.email) {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [values.email]);
    if (rows.length > 0) errors.email = "อีเมลนี้ถูกใช้สมัครแล้ว";
  }

  if (Object.keys(errors).length > 0) return showErrors(errors);

  const passwordHash = await bcrypt.hash(values.password, 10);

  try {
    await pool.query("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
      values.name,
      values.email,
      passwordHash,
    ]);
  } catch (err) {
    // กดสมัครซ้ำพร้อมกัน 2 ครั้ง: UNIQUE ใน DB กันไว้อีกชั้น
    if (err.code === "ER_DUP_ENTRY") return showErrors({ email: "อีเมลนี้ถูกใช้สมัครแล้ว" });
    throw err;
  }

  req.session.flash = { type: "success", message: "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ" };
  res.redirect("/login");
});

// ---------- Login ----------
router.get("/login", requireGuest, (req, res) => {
  res.render("auth/login", { title: "Login - RUN BKK", values: {}, error: null });
});

router.post("/login", requireGuest, async (req, res, next) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const showError = (message) =>
    res.status(400).render("auth/login", { title: "Login - RUN BKK", values: { email }, error: message });

  if (!email || !password) {
    return showError("กรุณากรอกอีเมลและรหัสผ่าน");
  }

  const [rows] = await pool.query("SELECT id, name, password_hash, role FROM users WHERE email = ?", [email]);
  const user = rows[0];
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

  // ข้อความเดียวกันทั้งไม่มีอีเมลและรหัสผิด จะได้เดาไม่ได้ว่าอีเมลไหนมีบัญชี
  if (!passwordOk) {
    return showError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  const returnTo = safeReturnTo(req.session.returnTo);

  // ขอ session id ใหม่หลัง login (กัน session fixation)
  req.session.regenerate((err) => {
    if (err) return next(err);

    req.session.user = { id: user.id, name: user.name, role: user.role }; // ไม่เก็บรหัสผ่านใน session
    req.session.flash = { type: "success", message: `ยินดีต้อนรับ ${user.name}` };
    req.session.save(() => res.redirect(returnTo));
  });
});

// ---------- Logout ----------
// ใช้ POST เว็บอื่นจะได้แอบทำให้เรา logout ผ่านลิงก์ไม่ได้
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("runbkk.sid");
    res.redirect("/");
  });
});

module.exports = router;
