// หน้าส่วนตัวของสมาชิก: My Runs, Profile
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");
const { checkNewPassword } = require("../utils/validators");

const router = express.Router();

// หมายเหตุ: router นี้ mount ที่ "/" จึงใส่ requireLogin ทีละ route
// (ถ้าใช้ router.use จะดักทุก URL รวมถึงหน้าที่ไม่มีอยู่ → ได้หน้า login แทน 404)

// ===============================================================
// GET /my-runs — ลิสต์กิจกรรมที่ฉันบันทึกไว้ (แยก "กำลังจะมาถึง" กับ "ที่ผ่านมา")
// ===============================================================
router.get("/my-runs", requireLogin, async (req, res) => {
  const [runs] = await pool.query(
    `SELECT rs.*, c.name AS club_name, c.image AS club_image, r.created_at AS saved_at
     FROM registrations r
     JOIN run_sessions rs ON rs.id = r.run_session_id
     JOIN clubs c ON c.id = rs.club_id
     WHERE r.user_id = ?
     ORDER BY rs.start_at`,
    [req.session.user.id] // ใช้ id จาก session เท่านั้น → เห็นได้แค่ของตัวเอง
  );

  const now = new Date();
  res.render("member/my-runs", {
    upcoming: runs.filter((run) => new Date(run.start_at) >= now),
    past: runs.filter((run) => new Date(run.start_at) < now).reverse(), // ล่าสุดขึ้นก่อน
  });
});

// ===============================================================
// Profile — ดู / แก้ชื่อ / เปลี่ยนรหัสผ่าน
// ===============================================================
async function renderProfile(req, res, { errors = {}, status = 200 } = {}) {
  const [rows] = await pool.query(
    "SELECT name, email, role, created_at FROM users WHERE id = ?",
    [req.session.user.id]
  );
  res.status(status).render("member/profile", { profile: rows[0], errors });
}

router.get("/profile", requireLogin, (req, res) => renderProfile(req, res));

// แก้ชื่อ
router.post("/profile", requireLogin, async (req, res) => {
  const name = String(req.body.name || "").trim();

  if (name.length < 2 || name.length > 100) {
    return renderProfile(req, res, { errors: { name: "ชื่อต้องมี 2–100 ตัวอักษร" }, status: 400 });
  }

  await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, req.session.user.id]);
  req.session.user.name = name; // อัปเดตใน session ด้วย navbar จะได้แสดงชื่อใหม่

  req.session.flash = { type: "success", message: "บันทึกชื่อแล้ว" };
  res.redirect("/profile");
});

// เปลี่ยนรหัสผ่าน (ต้องยืนยันรหัสเดิมก่อน)
router.post("/profile/password", requireLogin, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  // กฎรหัสผ่านเดียวกับตอนสมัคร (utils/validators.js) — ฟอร์มนี้ใช้ชื่อช่อง newPassword
  const check = checkNewPassword(newPassword, confirmPassword);
  const errors = {};
  if (check.password) errors.newPassword = check.password;
  if (check.confirmPassword) errors.confirmPassword = check.confirmPassword;

  const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.session.user.id]);
  if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    errors.currentPassword = "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  }

  if (Object.keys(errors).length > 0) {
    return renderProfile(req, res, { errors, status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.session.user.id]);

  req.session.flash = { type: "success", message: "เปลี่ยนรหัสผ่านแล้ว" };
  res.redirect("/profile");
});

module.exports = router;
