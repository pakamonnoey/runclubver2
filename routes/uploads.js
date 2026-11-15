// GET /uploads/:id — ส่งรูปจากตาราง images ให้ browser (ใช้ใน <img src="/uploads/12">)
// ไม่ต้อง login เพราะหน้า Home (สาธารณะ) ก็แสดงรูปกิจกรรม
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(); // → 404

  const [rows] = await pool.query("SELECT mime_type, data FROM images WHERE id = ?", [id]);
  if (rows.length === 0) return next();

  res.set({
    "Content-Type": rows[0].mime_type, // image/jpeg | image/png | image/webp เท่านั้น (ตรวจตอนอัปโหลด)
    "X-Content-Type-Options": "nosniff", // ห้าม browser เดาชนิดไฟล์เอง
    // รูป id เดิมไม่มีวันเปลี่ยนเนื้อหา (เปลี่ยนรูป = ได้ id ใหม่) → ให้ browser cache ได้ 1 ปี ไม่ต้องโหลดซ้ำ
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  res.send(rows[0].data);
});

module.exports = router;
