// Routes ของหน้าหลัก
const express = require("express");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

// ---- หน้าสาธารณะ (ไม่ต้อง login) ----
// res.render("index") = เอา views/index.ejs มาแปลงเป็น HTML แล้วส่งกลับ
router.get("/", (req, res) => res.render("index"));
router.get("/faq", (req, res) => res.render("faq"));

// ---- ต้อง login ก่อน (requireLogin ทำงานก่อน handler) ----

// Clubs: ดึงจาก DB เฉพาะคลับที่ published (ข้อมูลที่ยืนยันแล้ว)
// async route ใน Express 5: ถ้า query error จะถูกส่งไป error handler ใน app.js ให้เอง
router.get("/clubs", requireLogin, async (req, res) => {
  const [clubs] = await pool.query(
    `SELECT id, name, description, location, instagram_url, image
     FROM clubs
     WHERE status = 'published'
     ORDER BY id`
  );
  res.render("clubs", { clubs });
});

// Events: ยังเป็น hardcode — จะเปลี่ยนเป็นข้อมูลจาก run_sessions ใน Phase 5
router.get("/events", requireLogin, (req, res) => res.render("events"));

module.exports = router;
