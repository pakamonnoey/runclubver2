// อัปโหลดรูปแล้วเก็บในตาราง images
// เก็บเป็นไฟล์ไม่ได้ เพราะ Render แบบฟรีลบไฟล์ทุกครั้งที่ server เริ่มใหม่
const multer = require("multer");
const pool = require("../config/db");

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// เก็บไฟล์ไว้ใน memory (req.file.buffer) ไม่เขียนลงดิสก์
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
});

// รับไฟล์จากช่อง image_file
// ไฟล์ใหญ่เกินไม่โยน error (จะกลายเป็นหน้า 500) แต่เก็บข้อความไว้แสดงในฟอร์ม
function acceptImage(req, res, next) {
  upload.single("image_file")(req, res, (err) => {
    if (err) {
      req.body = req.body || {};
      req.uploadError =
        err.code === "LIMIT_FILE_SIZE" ? "ไฟล์รูปต้องไม่เกิน 2 MB" : "อัปโหลดไฟล์ไม่สำเร็จ";
    }
    next();
  });
}

// ดูชนิดไฟล์จากไบต์แรกๆ ของไฟล์ ไม่เชื่อนามสกุล เพราะเปลี่ยนชื่อไฟล์เป็น .jpg ได้
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null; // ไม่รับ SVG เพราะฝัง JavaScript ได้
}

// คืนข้อความ error หรือ null ถ้าผ่าน
function checkUploadedImage(req) {
  if (req.uploadError) return req.uploadError;
  if (!req.file) return null; // ไม่ได้เลือกไฟล์
  if (!detectImageType(req.file.buffer)) return "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP";
  return null;
}

// คืน path เช่น "/uploads/12"
async function saveImage(file) {
  const [result] = await pool.query("INSERT INTO images (mime_type, data, size) VALUES (?, ?, ?)", [
    detectImageType(file.buffer),
    file.buffer,
    file.size,
  ]);
  return `/uploads/${result.insertId}`;
}

// ลบรูปที่ไม่มีคลับหรือกิจกรรมไหนใช้แล้ว
async function removeImageIfUnused(imagePath) {
  const match = /^\/uploads\/(\d+)$/.exec(imagePath || "");
  if (!match) return; // ไม่ใช่รูปในตาราง images
  const [[{ used }]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM clubs WHERE image = ?) + (SELECT COUNT(*) FROM run_sessions WHERE image = ?) AS used`,
    [imagePath, imagePath]
  );
  if (used === 0) await pool.query("DELETE FROM images WHERE id = ?", [Number(match[1])]);
}

module.exports = { acceptImage, checkUploadedImage, saveImage, removeImageIfUnused, detectImageType };
