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

  // โลโก้คลับทั้งหมด — แสดงเป็นรูปอย่างเดียว ให้คนที่เข้ามาเห็นว่าเว็บมีคลับอะไรบ้าง
  // ดึงแค่ชื่อกับรูป (ข้อมูลเต็มของคลับอยู่ที่หน้า /clubs)
  const [clubs] = await pool.query(
    `SELECT name, image
     FROM clubs
     WHERE status = 'published' AND image IS NOT NULL
     ORDER BY id`
  );

  res.render("index", { events, clubs });
});

router.get("/faq", (req, res) => res.render("faq"));

module.exports = router;
