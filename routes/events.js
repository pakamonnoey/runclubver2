// Events (run_sessions): รายการ + ค้นหา, รายละเอียด, บันทึกลงลิสต์ของฉัน / เอาออก
// (เว็บไม่รับสมัครเอง — การสมัครจริงอยู่ที่ลิงก์ของผู้จัด เว็บเราแค่ให้สมาชิกเก็บกิจกรรมที่สนใจไว้ดูใน My Runs)
const express = require("express");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");
const { RUN_TYPES } = require("../utils/format");

const router = express.Router();

// ทุก route ในไฟล์นี้ต้อง login ก่อน
router.use(requireLogin);

// ตัวกรองระยะทาง: ค่าใน dropdown → เงื่อนไข SQL (เขียนไว้ตายตัว ไม่เอาค่าจากผู้ใช้ไปต่อ SQL ตรงๆ)
const DISTANCES = {
  short: { label: "ไม่เกิน 5 KM", sql: "rs.distance_km <= 5" },
  mid: { label: "5–10 KM", sql: "rs.distance_km > 5 AND rs.distance_km <= 10" },
  long: { label: "มากกว่า 10 KM", sql: "rs.distance_km > 10" },
};

// ตัวเลือกเรียงลำดับ → ORDER BY (whitelist เหมือนกัน — ห้ามเอา req.query ไปใส่ ORDER BY ตรงๆ)
const SORTS = {
  soonest: { label: "วันที่ใกล้สุด", sql: "rs.start_at ASC" },
  distance_asc: { label: "ระยะสั้น → ยาว", sql: "rs.distance_km IS NULL, rs.distance_km ASC, rs.start_at ASC" },
  distance_desc: { label: "ระยะยาว → สั้น", sql: "rs.distance_km DESC, rs.start_at ASC" },
};

// ส่วน SELECT ที่ใช้ร่วมกัน: ข้อมูลกิจกรรม + ชื่อคลับ + จำนวนคนที่บันทึกไว้ (คนสนใจ)
const SESSION_SELECT = `
  SELECT rs.*, c.name AS club_name, c.image AS club_image,
         (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS saved_count
  FROM run_sessions rs
  JOIN clubs c ON c.id = rs.club_id`;

// ===============================================================
// GET /events  — รายการกิจกรรมที่ยังไม่ถึงวัน + Search / Filter / Sort
// ===============================================================
router.get("/", async (req, res) => {
  // ค่าจาก URL เช่น /events?q=social&location=lumpini&type=morning&distance=short&sort=soonest
  const filters = {
    q: String(req.query.q || "").trim(),
    location: String(req.query.location || "").trim(),
    type: RUN_TYPES[req.query.type] ? req.query.type : "",
    distance: DISTANCES[req.query.distance] ? req.query.distance : "",
    sort: SORTS[req.query.sort] ? req.query.sort : "soonest",
  };

  // สร้าง WHERE ทีละเงื่อนไข — ค่าที่ผู้ใช้พิมพ์ไปอยู่ใน params เสมอ (parameterized)
  const where = ["rs.status = 'published'", "c.status = 'published'", "rs.start_at >= NOW()"];
  const params = [];

  if (filters.q) {
    where.push("(rs.title LIKE ? OR c.name LIKE ? OR rs.description LIKE ?)");
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.location) {
    where.push("rs.meeting_point LIKE ?");
    params.push(`%${filters.location}%`);
  }
  if (filters.type) {
    where.push("rs.run_type = ?");
    params.push(filters.type);
  }
  if (filters.distance) {
    where.push(DISTANCES[filters.distance].sql);
  }

  const [events] = await pool.query(
    `${SESSION_SELECT}
     WHERE ${where.join(" AND ")}
     ORDER BY ${SORTS[filters.sort].sql}`,
    params
  );

  res.render("events", {
    events,
    filters,
    runTypes: RUN_TYPES,
    distances: DISTANCES,
    sorts: SORTS,
  });
});

// ===============================================================
// GET /events/:id  — รายละเอียดกิจกรรม
// ===============================================================
router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(); // ไม่ใช่ตัวเลข → 404

  const [rows] = await pool.query(
    `${SESSION_SELECT}
     WHERE rs.id = ? AND rs.status IN ('published', 'cancelled') AND c.status = 'published'`,
    [id]
  );
  const event = rows[0];
  if (!event) return next(); // ไม่มี / ยังเป็น draft → 404

  // ผู้ใช้คนนี้บันทึกกิจกรรมนี้ไว้แล้วหรือยัง
  const [saved] = await pool.query(
    "SELECT id FROM registrations WHERE user_id = ? AND run_session_id = ?",
    [req.session.user.id, id]
  );

  // ลิงก์ย้อนกลับ: ดู ?from= ว่าผู้ใช้เปิดมาจากหน้าไหน แล้วพากลับไปหน้านั้น
  // รับเฉพาะ 2 ค่าที่กำหนดไว้ ค่าอื่นถือว่ามาจากหน้า Events (ไม่เอาค่าจาก URL ไปใช้เป็นลิงก์ตรงๆ)
  let from = "";
  let back = { href: "/events", label: "All Events" };
  if (req.query.from === "club") {
    from = "club";
    back = { href: `/clubs/${event.club_id}`, label: event.club_name };
  } else if (req.query.from === "my-runs") {
    from = "my-runs";
    back = { href: "/my-runs", label: "My Runs" };
  }

  res.render("event-detail", {
    event,
    from,
    back,
    isSaved: saved.length > 0,
    isPast: new Date(event.start_at) < new Date(),
  });
});

// ===============================================================
// POST /events/:id/save  — บันทึกกิจกรรมลง "ลิสต์ของฉัน" (ดูได้ที่ My Runs)
// ===============================================================
router.post("/:id/save", async (req, res) => {
  const id = Number(req.params.id);
  // กลับไปหน้าเดิมพร้อม ?from= เดิม (ลิงก์ย้อนกลับจะยังชี้ไปหน้าคลับ / My Runs ที่เปิดมา)
  const from = ["club", "my-runs"].includes(req.body.from) ? req.body.from : "";
  const back = from ? `/events/${id}?from=${from}` : `/events/${id}`;
  if (!Number.isInteger(id) || id <= 0) return res.redirect("/events");

  // ตรวจฝั่ง server ด้วย (ปุ่มในหน้าเว็บซ่อนได้ แต่คนยิง request ตรงได้):
  // ต้องเป็นกิจกรรมที่ published ของคลับที่ published และยังไม่ถึงเวลา
  const [rows] = await pool.query(
    `SELECT rs.id FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.id = ? AND rs.status = 'published' AND c.status = 'published' AND rs.start_at > NOW()`,
    [id]
  );
  if (rows.length === 0) {
    req.session.flash = { type: "danger", message: "บันทึกไม่ได้ (กิจกรรมนี้ผ่านไปแล้ว หรือไม่ได้เปิดแสดง)" };
    return res.redirect(back);
  }

  // INSERT IGNORE + UNIQUE(user_id, run_session_id) → กดซ้ำก็ไม่เกิดแถวซ้ำ ไม่ error
  await pool.query("INSERT IGNORE INTO registrations (user_id, run_session_id) VALUES (?, ?)", [
    req.session.user.id,
    id,
  ]);

  req.session.flash = { type: "success", message: "บันทึกลงลิสต์แล้ว ดูได้ที่ My Runs" };
  res.redirect(back);
});

// ===============================================================
// POST /events/:id/unsave  — เอาออกจากลิสต์ของฉัน (ลบได้เฉพาะของตัวเอง)
// ===============================================================
router.post("/:id/unsave", async (req, res) => {
  const id = Number(req.params.id);

  // ใส่ user_id จาก session ใน WHERE = ลบได้เฉพาะรายการของตัวเอง (ตรวจ ownership)
  const [result] = await pool.query("DELETE FROM registrations WHERE run_session_id = ? AND user_id = ?", [
    id,
    req.session.user.id,
  ]);

  req.session.flash =
    result.affectedRows > 0
      ? { type: "success", message: "เอาออกจากลิสต์แล้ว" }
      : { type: "danger", message: "กิจกรรมนี้ไม่ได้อยู่ในลิสต์ของคุณ" };

  // กลับไปหน้าที่กดมา (My Runs หรือ Event Detail) — เลือกจากค่าที่กำหนดไว้เท่านั้น ไม่เอา URL จากผู้ใช้ไป redirect ตรงๆ
  let from = `/events/${id}`;
  if (req.body.from === "my-runs") from = "/my-runs";
  if (req.body.from === "club") from = `/events/${id}?from=club`;
  res.redirect(from);
});

module.exports = router;
