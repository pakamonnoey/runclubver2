// GET /uploads/:id ส่งรูปจากตาราง images เช่น <img src="/uploads/12">
// ไม่ต้อง login เพราะหน้า Home ก็ใช้รูปพวกนี้
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next();

  const [rows] = await pool.query("SELECT mime_type, data FROM images WHERE id = ?", [id]);
  if (rows.length === 0) return next();

  res.set({
    "Content-Type": rows[0].mime_type,
    "X-Content-Type-Options": "nosniff", // ห้าม browser เดาชนิดไฟล์เอง
    // เปลี่ยนรูปจะได้ id ใหม่ เลย cache ได้นาน
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  res.send(rows[0].data);
});

module.exports = router;
