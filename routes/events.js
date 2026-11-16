// กิจกรรม: รายการ, รายละเอียด, กดสนใจ (เก็บลง My Runs)
// เว็บไม่รับสมัครเอง สมัครจริงที่ลิงก์ของผู้จัด
const express = require("express");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");
const { RUN_TYPES } = require("../utils/format");

const router = express.Router();

router.use(requireLogin);

// ค่าใน dropdown -> SQL ที่เขียนไว้เอง ไม่เอาค่าจากผู้ใช้ไปต่อ SQL ตรงๆ
const DISTANCES = {
  short: { label: "ไม่เกิน 5 KM", sql: "rs.distance_km <= 5" },
  mid: { label: "5–10 KM", sql: "rs.distance_km > 5 AND rs.distance_km <= 10" },
  long: { label: "มากกว่า 10 KM", sql: "rs.distance_km > 10" },
};

const SORTS = {
  soonest: { label: "วันที่ใกล้สุด", sql: "rs.start_at ASC" },
  distance_asc: { label: "ระยะสั้น → ยาว", sql: "rs.distance_km IS NULL, rs.distance_km ASC, rs.start_at ASC" },
  distance_desc: { label: "ระยะยาว → สั้น", sql: "rs.distance_km DESC, rs.start_at ASC" },
};

// ใช้ทั้งหน้ารายการและหน้ารายละเอียด (saved_count = จำนวนคนสนใจ)
const SESSION_SELECT = `
  SELECT rs.*, c.name AS club_name, c.image AS club_image,
         (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS saved_count
  FROM run_sessions rs
  JOIN clubs c ON c.id = rs.club_id`;

// GET /events — ค้นหา / กรอง / เรียง
router.get("/", async (req, res) => {
  // เช่น /events?q=social&type=morning&sort=soonest
  const filters = {
    q: String(req.query.q || "").trim(),
    location: String(req.query.location || "").trim(),
    type: RUN_TYPES[req.query.type] ? req.query.type : "",
    distance: DISTANCES[req.query.distance] ? req.query.distance : "",
    sort: SORTS[req.query.sort] ? req.query.sort : "soonest",
  };

  // ค่าที่ผู้ใช้พิมพ์ใส่ใน params เสมอ (กัน SQL injection)
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

// GET /events/:id
router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(); // 404

  const [rows] = await pool.query(
    `${SESSION_SELECT}
     WHERE rs.id = ? AND rs.status IN ('published', 'cancelled') AND c.status = 'published'`,
    [id]
  );
  const event = rows[0];
  if (!event) return next(); // ไม่มี หรือยังเป็น draft

  const [saved] = await pool.query(
    "SELECT id FROM registrations WHERE user_id = ? AND run_session_id = ?",
    [req.session.user.id, id]
  );

  // ปุ่มย้อนกลับ: ?from= บอกว่าเปิดมาจากหน้าไหน (รับแค่ 2 ค่านี้)
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

// POST /events/:id/save — กดสนใจ
router.post("/:id/save", async (req, res) => {
  const id = Number(req.params.id);
  const from = ["club", "my-runs"].includes(req.body.from) ? req.body.from : "";
  const back = from ? `/events/${id}?from=${from}` : `/events/${id}`;
  if (!Number.isInteger(id) || id <= 0) return res.redirect("/events");

  // ตรวจซ้ำฝั่ง server: ต้อง published และยังไม่ถึงวัน
  const [rows] = await pool.query(
    `SELECT rs.id FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.id = ? AND rs.status = 'published' AND c.status = 'published' AND rs.start_at > NOW()`,
    [id]
  );
  if (rows.length === 0) {
    req.session.flash = { type: "danger", message: "บันทึกไม่ได้ (กิจกรรมนี้ผ่านไปแล้ว หรือไม่ได้เปิดแสดง)" };
    return res.redirect(back);
  }

  // มี UNIQUE(user_id, run_session_id) กดซ้ำก็ไม่เกิดแถวซ้ำ
  await pool.query("INSERT IGNORE INTO registrations (user_id, run_session_id) VALUES (?, ?)", [
    req.session.user.id,
    id,
  ]);

  req.session.flash = { type: "success", message: "บันทึกลงลิสต์แล้ว ดูได้ที่ My Runs" };
  res.redirect(back);
});

// POST /events/:id/unsave — เอาออกจากลิสต์
router.post("/:id/unsave", async (req, res) => {
  const id = Number(req.params.id);

  // ใส่ user_id จาก session ลบได้แค่ของตัวเอง
  const [result] = await pool.query("DELETE FROM registrations WHERE run_session_id = ? AND user_id = ?", [
    id,
    req.session.user.id,
  ]);

  if (result.affectedRows > 0) {
    req.session.flash = { type: "success", message: "เอาออกจากลิสต์แล้ว" };
  } else {
    req.session.flash = { type: "danger", message: "กิจกรรมนี้ไม่ได้อยู่ในลิสต์ของคุณ" };
  }

  let from = `/events/${id}`;
  if (req.body.from === "my-runs") from = "/my-runs";
  if (req.body.from === "club") from = `/events/${id}?from=club`;
  res.redirect(from);
});

module.exports = router;
