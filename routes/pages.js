// หน้าสาธารณะ (ไม่ต้อง login): Home, FAQ
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// Home: แสดง 3 กิจกรรมที่ใกล้ที่สุดจาก DB (กดดูรายละเอียดต้อง login)
router.get("/", async (req, res) => {
  const [events] = await pool.query(
    `SELECT rs.id, rs.title, rs.run_type, rs.start_at, rs.meeting_point, rs.image,
            c.image AS club_image
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.status = 'published' AND c.status = 'published' AND rs.start_at >= NOW()
     ORDER BY rs.start_at
     LIMIT 3`
  );
  res.render("index", { events });
});

router.get("/faq", (req, res) => res.render("faq"));

module.exports = router;
