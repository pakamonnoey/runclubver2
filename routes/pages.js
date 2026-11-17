// หน้าที่ไม่ต้อง login: Home, FAQ
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// Visitor Counter: 1 IP นับ 1 ครั้งต่อวัน
// วันที่/เวลามาจาก DB (CURDATE(), NOW()) ซึ่งตั้ง time_zone +07:00 ไว้ใน config/db.js
async function countVisit(ip) {
  // ยังไม่มีแถว IP+วันนี้ → เพิ่มแถวใหม่ (นับ +1)
  // มีแล้ว (ชน PRIMARY KEY) → แก้แค่ last_visit_at, first_visit_at คงเดิม
  await pool.query(
    `INSERT INTO visitors (ip_address, visit_date, first_visit_at, last_visit_at)
     VALUES (?, CURDATE(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE last_visit_at = NOW()`,
    [ip]
  );

  // 1 แถว = 1 unique visitor
  const [[today]] = await pool.query(
    "SELECT COUNT(*) AS n FROM visitors WHERE visit_date = CURDATE()"
  );
  const [[total]] = await pool.query("SELECT COUNT(*) AS n FROM visitors");
  return { today: today.n, total: total.n };
}

// Home: 3 กิจกรรมที่ใกล้ที่สุด + โลโก้คลับ
router.get("/", async (req, res) => {
  // IPv4 บางครั้งมาในรูป ::ffff:1.2.3.4 → ตัดให้เหลือ 1.2.3.4
  const ip = req.ip.replace(/^::ffff:/, "");

  // นับไม่สำเร็จ หน้า Home ยังต้องเปิดได้
  let visitors = null;
  try {
    visitors = await countVisit(ip);
  } catch (err) {
    console.error("Visitor counter failed:", err.message);
  }

  const [events] = await pool.query(
    `SELECT rs.id, rs.title, rs.run_type, rs.start_at, rs.meeting_point, rs.image,
            c.image AS club_image
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.status = 'published' AND c.status = 'published' AND rs.start_at >= NOW()
     ORDER BY rs.start_at
     LIMIT 3`
  );

  const [clubs] = await pool.query(
    `SELECT name, image
     FROM clubs
     WHERE status = 'published' AND image IS NOT NULL
     ORDER BY id`
  );

  res.render("index", { events, clubs, visitors });
});

router.get("/faq", (req, res) => res.render("faq"));

module.exports = router;
