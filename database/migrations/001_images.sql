-- เพิ่มตาราง images (อัปโหลดรูปจากฟอร์ม Admin) — ใช้กับ DB ที่มีข้อมูลอยู่แล้ว ไม่ลบอะไร
-- (DB ที่สร้างใหม่ด้วย runbkk.sql มีตารางนี้อยู่แล้ว → IF NOT EXISTS ทำให้รันซ้ำได้ปลอดภัย)
CREATE TABLE IF NOT EXISTS images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mime_type  VARCHAR(50) NOT NULL,
  data       MEDIUMBLOB NOT NULL,
  size       INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
