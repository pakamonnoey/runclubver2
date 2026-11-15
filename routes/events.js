// Events (run_sessions): รายการ + ค้นหา, รายละเอียด, Join / Cancel
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

// ส่วน SELECT ที่ใช้ร่วมกัน: ข้อมูลกิจกรรม + ชื่อคลับ + จำนวนคนที่ Join แล้ว
const SESSION_SELECT = `
  SELECT rs.*, c.name AS club_name, c.image AS club_image,
         (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS joined_count
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

  // ผู้ใช้คนนี้ Join แล้วหรือยัง
  const [reg] = await pool.query(
    "SELECT id FROM registrations WHERE user_id = ? AND run_session_id = ?",
    [req.session.user.id, id]
  );

  const isPast = new Date(event.start_at) < new Date();
  const isFull = event.max_participants !== null && event.joined_count >= event.max_participants;

  res.render("event-detail", {
    event,
    isJoined: reg.length > 0,
    isPast,
    isFull,
    spotsLeft: event.max_participants === null ? null : Math.max(event.max_participants - event.joined_count, 0),
  });
});

// ===============================================================
// POST /events/:id/join  — เข้าร่วมกิจกรรม
// ใช้ transaction + SELECT ... FOR UPDATE เพื่อกันกรณีหลายคนกด Join พร้อมกันตอนเหลือที่ว่างที่เดียว
// ===============================================================
router.post("/:id/join", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.user.id;
  const back = `/events/${id}`;

  const fail = (message) => {
    req.session.flash = { type: "danger", message };
    res.redirect(back);
  };

  if (!Number.isInteger(id) || id <= 0) return fail("ไม่พบกิจกรรมนี้");

  const conn = await pool.getConnection(); // transaction ต้องใช้ connection เดียวกันตลอด
  try {
    await conn.beginTransaction();

    // FOR UPDATE = ล็อกแถวกิจกรรมนี้ไว้ คนอื่นที่จะ Join กิจกรรมเดียวกันต้องรอจนเรา COMMIT
    const [rows] = await conn.query(
      `SELECT rs.id, rs.status, rs.start_at, rs.max_participants, rs.registration_type
       FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
       WHERE rs.id = ? AND c.status = 'published'
       FOR UPDATE`,
      [id]
    );
    const event = rows[0];

    // ตรวจทุกเงื่อนไขฝั่ง server (ปุ่มในหน้าเว็บซ่อนได้ แต่คนยิง request ตรงได้)
    if (!event || event.status !== "published") {
      await conn.rollback();
      return fail("กิจกรรมนี้ไม่เปิดให้เข้าร่วม");
    }
    if (event.registration_type !== "internal") {
      await conn.rollback();
      return fail("กิจกรรมนี้ต้องสมัครผ่านลิงก์ภายนอก");
    }
    if (new Date(event.start_at) < new Date()) {
      await conn.rollback();
      return fail("กิจกรรมนี้ผ่านไปแล้ว");
    }

    const [[{ joined }]] = await conn.query(
      "SELECT COUNT(*) AS joined FROM registrations WHERE run_session_id = ?",
      [id]
    );
    if (event.max_participants !== null && joined >= event.max_participants) {
      await conn.rollback();
      return fail("ขออภัย กิจกรรมนี้เต็มแล้ว");
    }

    // UNIQUE(user_id, run_session_id) ใน DB กันการ Join ซ้ำ
    await conn.query("INSERT INTO registrations (user_id, run_session_id) VALUES (?, ?)", [userId, id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") return fail("คุณเข้าร่วมกิจกรรมนี้แล้ว");
    throw err;
  } finally {
    conn.release(); // คืน connection เข้า pool เสมอ
  }

  req.session.flash = { type: "success", message: "เข้าร่วมกิจกรรมสำเร็จ! ดูได้ที่ My Runs" };
  res.redirect(back);
});

// ===============================================================
// POST /events/:id/cancel  — ยกเลิกการเข้าร่วม (เฉพาะของตัวเอง และกิจกรรมยังไม่เริ่ม)
// ===============================================================
router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);

  // ใส่ user_id ใน WHERE = ลบได้เฉพาะ registration ของตัวเอง (ตรวจ ownership)
  const [result] = await pool.query(
    `DELETE r FROM registrations r
     JOIN run_sessions rs ON rs.id = r.run_session_id
     WHERE r.run_session_id = ? AND r.user_id = ? AND rs.start_at > NOW()`,
    [id, req.session.user.id]
  );

  req.session.flash =
    result.affectedRows > 0
      ? { type: "success", message: "ยกเลิกการเข้าร่วมแล้ว" }
      : { type: "danger", message: "ยกเลิกไม่ได้ (ไม่ได้ลงทะเบียนไว้ หรือกิจกรรมเริ่มไปแล้ว)" };

  // กลับไปหน้าที่กดมา (My Runs หรือ Event Detail) — รับเฉพาะ path ภายในเว็บ
  const from = req.body.from === "my-runs" ? "/my-runs" : `/events/${id}`;
  res.redirect(from);
});

module.exports = router;
