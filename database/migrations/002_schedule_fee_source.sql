-- คลับ: ตารางวิ่งประจำ / กิจกรรม: ค่าใช้จ่าย + ลิงก์แหล่งที่มา (เช่น โพสต์ IG)
-- เพิ่มคอลัมน์อย่างเดียว ไม่แตะข้อมูลเดิม (รันซ้ำได้: migrate.js ข้ามคอลัมน์ที่มีอยู่แล้ว)
ALTER TABLE clubs ADD COLUMN regular_schedule VARCHAR(500) NULL AFTER location;
ALTER TABLE run_sessions ADD COLUMN fee VARCHAR(100) NULL AFTER distance_km;
ALTER TABLE run_sessions ADD COLUMN source_url VARCHAR(500) NULL AFTER external_url;
