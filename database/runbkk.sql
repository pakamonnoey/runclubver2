-- =====================================================================
-- RUN BKK — Database schema (MySQL 8 / MariaDB 10.5+)
-- รันด้วย:  npm run db:setup     (สคริปต์จะรันไฟล์นี้ แล้วตามด้วย seed.sql)
--
-- ⚠️ ไฟล์นี้ DROP ตารางเดิมทิ้งก่อนสร้างใหม่ = ข้อมูลทั้งหมดจะหาย
--    ใช้ตอนเริ่มโปรเจกต์ / รีเซ็ต DB เท่านั้น
-- =====================================================================

SET NAMES utf8mb4;

-- ลบจากตารางลูก → ตารางแม่ (ตารางที่มี FK ชี้ไปหาคนอื่นต้องลบก่อน)
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS run_sessions;
DROP TABLE IF EXISTS club_owner_requests;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;

-- ---------------------------------------------------------------------
-- 1) users : สมาชิกทุกคน + role
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,              -- เก็บ hash จาก bcrypt ไม่เก็บรหัสจริง
  role          ENUM('member', 'owner', 'admin') NOT NULL DEFAULT 'member',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)                -- 1 อีเมล สมัครได้ 1 บัญชี
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2) clubs : ชมรมวิ่ง (owner_id = NULL แปลว่ายังไม่มีเจ้าของมาดูแล)
-- ---------------------------------------------------------------------
CREATE TABLE clubs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id      INT UNSIGNED NULL,
  name          VARCHAR(150) NOT NULL,
  description   TEXT NULL,
  location      VARCHAR(255) NULL,
  instagram_url VARCHAR(500) NULL,
  image         VARCHAR(255) NULL,                  -- path รูป เช่น /image/club1.png
  status        ENUM('pending', 'published') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clubs_name (name),
  KEY idx_clubs_status (status),
  CONSTRAINT fk_clubs_owner FOREIGN KEY (owner_id) REFERENCES users (id)
    ON DELETE SET NULL                              -- ลบ user แล้วคลับยังอยู่ แค่ไม่มีเจ้าของ
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3) run_sessions : กิจกรรมวิ่ง 1 แถว = 1 ครั้ง (วัน/เวลาเดียว)
-- ---------------------------------------------------------------------
CREATE TABLE run_sessions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id           INT UNSIGNED NOT NULL,
  title             VARCHAR(150) NOT NULL,
  run_type          ENUM('morning', 'social', 'night', 'beginner') NOT NULL,
  description       TEXT NULL,
  start_at          DATETIME NOT NULL,              -- เวลาไทย (Asia/Bangkok)
  meeting_point     VARCHAR(255) NOT NULL,
  distance_km       DECIMAL(4,1) NULL,              -- เช่น 5.0, 10.5
  pace              VARCHAR(50) NULL,               -- เช่น '6:30–7:30 min/km'
  max_participants  INT UNSIGNED NULL,              -- NULL = ไม่จำกัดจำนวน
  registration_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
  external_url      VARCHAR(500) NULL,              -- ใช้เมื่อ registration_type = 'external'
  image             VARCHAR(255) NULL,
  status            ENUM('draft', 'published', 'cancelled') NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sessions_status_start (status, start_at), -- หน้า Events: WHERE status='published' AND start_at >= NOW()
  CONSTRAINT fk_sessions_club FOREIGN KEY (club_id) REFERENCES clubs (id)
    ON DELETE CASCADE                               -- ลบคลับ → กิจกรรมของคลับหายตาม
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4) registrations : ใครเข้าร่วมกิจกรรมไหน (ตารางกลางของ Many-to-Many)
-- ---------------------------------------------------------------------
CREATE TABLE registrations (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  run_session_id INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_registration (user_id, run_session_id),   -- กันสมัครซ้ำ
  KEY idx_registrations_session (run_session_id),         -- นับจำนวนคน/ดูรายชื่อ
  CONSTRAINT fk_reg_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reg_session FOREIGN KEY (run_session_id) REFERENCES run_sessions (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5) club_owner_requests : คำขอเป็น Club Owner (Admin เป็นคนอนุมัติ)
--    club_id = ขอดูแลคลับที่มีอยู่แล้ว / NULL = ขอเพิ่มคลับใหม่ชื่อ club_name
-- ---------------------------------------------------------------------
CREATE TABLE club_owner_requests (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  club_id     INT UNSIGNED NULL,
  club_name   VARCHAR(150) NOT NULL,
  message     TEXT NULL,                            -- เช่น ลิงก์ IG / หลักฐานว่าเป็นผู้ดูแลจริง
  status      ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  KEY idx_requests_status (status),
  CONSTRAINT fk_req_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_req_club FOREIGN KEY (club_id) REFERENCES clubs (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6) sessions : ที่เก็บ login session (ใช้โดย express-mysql-session ใน Phase 4)
--    โครงสร้างตรงตามที่ library กำหนด
-- ---------------------------------------------------------------------
CREATE TABLE sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
