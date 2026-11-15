-- เว็บไม่รับสมัครเองแล้ว (สมัครจริงที่ลิงก์ของผู้จัด / สมาชิกแค่กด "สนใจ" เก็บลงลิสต์)
-- → ไม่ต้องมี pace, จำนวนรับสูงสุด และวิธีสมัคร อีกต่อไป
-- รันซ้ำได้: ถ้าคอลัมน์ถูกลบไปแล้ว migrate.js จะข้าม (ER_CANT_DROP_FIELD_OR_KEY)
ALTER TABLE run_sessions DROP COLUMN pace;
ALTER TABLE run_sessions DROP COLUMN max_participants;
ALTER TABLE run_sessions DROP COLUMN registration_type;
