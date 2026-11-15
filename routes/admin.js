// Admin: คนเดียวที่กรอก/อัปเดตข้อมูลคลับและกิจกรรม + จัดการผู้ใช้
// ทุก route ในไฟล์นี้ admin เท่านั้น (router.use ด้านล่าง)
const express = require("express");
const pool = require("../config/db");
const { requireRole } = require("../middleware/auth");
const { readClubForm, readEventForm } = require("../utils/validators");
const { RUN_TYPES, inputDateTime } = require("../utils/format");
const { acceptImage, checkUploadedImage, saveImage, removeImageIfUnused } = require("../utils/upload");

const router = express.Router();

router.use(requireRole("admin")); // member → 403, ยังไม่ login → ไปหน้า login

// id จาก URL ต้องเป็นจำนวนเต็มบวก ไม่งั้นคืน null (→ 404) — กัน NaN หลุดไปถึง SQL
const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const flash = (req, type, message) => (req.session.flash = { type, message });

// ===============================================================
// Dashboard — ตัวเลขสรุป
// ===============================================================
router.get("/", async (req, res) => {
  const [[stats]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM clubs) AS clubs,
       (SELECT COUNT(*) FROM clubs WHERE status = 'pending') AS pending_clubs,
       (SELECT COUNT(*) FROM run_sessions WHERE status = 'published' AND start_at >= NOW()) AS upcoming_events,
       (SELECT COUNT(*) FROM run_sessions WHERE status = 'draft') AS draft_events,
       (SELECT COUNT(*) FROM registrations) AS registrations`
  );
  res.render("admin/dashboard", { stats });
});

// ===============================================================
// Users — เปลี่ยน role (member/admin), ลบ
// ===============================================================
router.get("/users", async (req, res) => {
  const [users] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM registrations r WHERE r.user_id = u.id) AS run_count
     FROM users u ORDER BY u.created_at DESC`
  );
  res.render("admin/users", { users });
});

router.post("/users/:id/role", async (req, res) => {
  const id = toId(req.params.id);
  const role = String(req.body.role || "");

  if (!["member", "admin"].includes(role)) {
    flash(req, "danger", "role ไม่ถูกต้อง");
  } else if (id === req.session.user.id) {
    flash(req, "danger", "เปลี่ยน role ของตัวเองไม่ได้ (กัน admin ล็อกตัวเองออกจากระบบ)");
  } else {
    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    if (result.affectedRows) flash(req, "success", "เปลี่ยน role แล้ว (มีผลทันที)");
    else flash(req, "danger", "ไม่พบผู้ใช้");
  }
  res.redirect("/admin/users");
});

router.post("/users/:id/delete", async (req, res) => {
  const id = toId(req.params.id);
  if (id === req.session.user.id) {
    flash(req, "danger", "ลบบัญชีตัวเองไม่ได้");
  } else {
    // FK CASCADE: การ Join ทั้งหมดของ user นี้ถูกลบตาม
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    flash(req, result.affectedRows ? "success" : "danger", result.affectedRows ? "ลบผู้ใช้แล้ว" : "ไม่พบผู้ใช้");
  }
  res.redirect("/admin/users");
});

// ===============================================================
// Clubs — รายการทุกสถานะ, เพิ่ม, แก้, ลบ
// ===============================================================
router.get("/clubs", async (req, res) => {
  const [clubs] = await pool.query(
    `SELECT c.id, c.name, c.status,
            (SELECT COUNT(*) FROM run_sessions rs WHERE rs.club_id = c.id) AS event_count
     FROM clubs c
     ORDER BY c.status = 'pending' DESC, c.name`
  );
  res.render("admin/clubs", { clubs });
});

const renderClubForm = (res, { heading, action, values, errors = {}, status = 200 }) =>
  res.status(status).render("admin/club-form", { heading, action, values, errors });

router.get("/clubs/new", (req, res) =>
  renderClubForm(res, { heading: "เพิ่มคลับ", action: "/admin/clubs", values: { status: "pending" } })
);

// acceptImage = รับไฟล์จากช่อง "เลือกไฟล์" (ฟอร์มต้องเป็น multipart/form-data)
router.post("/clubs", acceptImage, async (req, res) => {
  const { values, errors, data } = readClubForm(req.body);
  const imageError = checkUploadedImage(req);
  if (imageError) errors.image = imageError;
  const view = { heading: "เพิ่มคลับ", action: "/admin/clubs", values, status: 400 };
  if (Object.keys(errors).length > 0) return renderClubForm(res, { ...view, errors });

  // ฟอร์มผ่านแล้วค่อยบันทึกรูป (ไม่ให้มีรูปค้างใน DB ถ้าฟอร์มผิด) — มีไฟล์ใหม่ = ใช้แทนลิงก์
  if (req.file) data.image = await saveImage(req.file);

  try {
    await pool.query(
      `INSERT INTO clubs (name, description, location, regular_schedule, instagram_url, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.description, data.location, data.regular_schedule, data.instagram_url, data.image, data.status]
    );
  } catch (err) {
    await removeImageIfUnused(data.image); // บันทึกคลับไม่สำเร็จ → ลบรูปที่เพิ่งอัปโหลดทิ้ง
    if (err.code !== "ER_DUP_ENTRY") throw err; // UNIQUE(name)
    return renderClubForm(res, { ...view, errors: { name: "มีคลับชื่อนี้แล้ว" } });
  }
  flash(req, "success", "เพิ่มคลับแล้ว");
  res.redirect("/admin/clubs");
});

router.get("/clubs/:id/edit", async (req, res, next) => {
  const [rows] = await pool.query("SELECT * FROM clubs WHERE id = ?", [toId(req.params.id)]);
  if (!rows[0]) return next(); // ไม่พบ → 404
  renderClubForm(res, { heading: "แก้ไขคลับ", action: `/admin/clubs/${rows[0].id}`, values: rows[0] });
});

router.post("/clubs/:id", acceptImage, async (req, res, next) => {
  const id = toId(req.params.id);
  const [rows] = await pool.query("SELECT id, image FROM clubs WHERE id = ?", [id]);
  if (!rows[0]) return next();
  const oldImage = rows[0].image;

  const { values, errors, data } = readClubForm(req.body);
  const imageError = checkUploadedImage(req);
  if (imageError) errors.image = imageError;
  const view = { heading: "แก้ไขคลับ", action: `/admin/clubs/${id}`, values, status: 400 };
  if (Object.keys(errors).length > 0) return renderClubForm(res, { ...view, errors });

  if (req.file) data.image = await saveImage(req.file);

  try {
    await pool.query(
      `UPDATE clubs SET name = ?, description = ?, location = ?, regular_schedule = ?,
         instagram_url = ?, image = ?, status = ? WHERE id = ?`,
      [data.name, data.description, data.location, data.regular_schedule, data.instagram_url, data.image, data.status, id]
    );
  } catch (err) {
    if (req.file) await removeImageIfUnused(data.image);
    if (err.code !== "ER_DUP_ENTRY") throw err;
    return renderClubForm(res, { ...view, errors: { name: "มีคลับชื่อนี้แล้ว" } });
  }
  if (oldImage !== data.image) await removeImageIfUnused(oldImage); // เปลี่ยนรูป → ลบรูปเก่าถ้าไม่มีใครใช้
  flash(req, "success", "บันทึกคลับแล้ว");
  res.redirect("/admin/clubs");
});

router.post("/clubs/:id/delete", async (req, res) => {
  const id = toId(req.params.id);
  // เก็บรายการรูปของคลับและกิจกรรมไว้ก่อนลบ → ลบรูปที่ไม่มีใครใช้แล้วตามหลัง
  const [imageRows] = await pool.query(
    "SELECT image FROM clubs WHERE id = ? UNION SELECT image FROM run_sessions WHERE club_id = ?",
    [id, id]
  );
  // FK CASCADE: กิจกรรมของคลับ + การ Join ถูกลบตาม
  const [result] = await pool.query("DELETE FROM clubs WHERE id = ?", [id]);
  for (const row of imageRows) await removeImageIfUnused(row.image);
  flash(req, result.affectedRows ? "success" : "danger", result.affectedRows ? "ลบคลับแล้ว" : "ไม่พบคลับ");
  res.redirect("/admin/clubs");
});

// ===============================================================
// Events — รายการทุกสถานะ, เพิ่ม, แก้, ยกเลิก, ลบ, รายชื่อผู้เข้าร่วม
// ===============================================================

// หากิจกรรม + จำนวนคนที่ Join แล้ว
async function findEvent(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT rs.*, c.name AS club_name,
            (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS joined_count
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.id = ?`,
    [id]
  );
  return rows[0];
}

async function allClubs() {
  const [rows] = await pool.query("SELECT id, name, status FROM clubs ORDER BY name");
  return rows;
}

async function renderEventForm(res, { event = null, values, errors = {}, status = 200 }) {
  res.status(status).render("admin/event-form", {
    heading: event ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรม",
    action: event ? `/admin/events/${event.id}` : "/admin/events",
    clubs: await allClubs(),
    runTypes: RUN_TYPES,
    values,
    errors,
    joinedCount: event ? event.joined_count : 0,
  });
}

router.get("/events", async (req, res) => {
  const [events] = await pool.query(
    `SELECT rs.id, rs.title, rs.start_at, rs.status, rs.max_participants, c.name AS club_name,
            (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS joined_count
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     ORDER BY rs.start_at DESC`
  );
  res.render("admin/events", { events, now: new Date() });
});

router.get("/events/new", (req, res) =>
  renderEventForm(res, {
    values: { club_id: String(req.query.club || ""), registration_type: "internal", status: "published" },
  })
);

router.post("/events", acceptImage, async (req, res) => {
  const clubs = await allClubs();
  const { values, errors, data } = readEventForm(req.body, { clubIds: clubs.map((c) => c.id), isNew: true });
  const imageError = checkUploadedImage(req);
  if (imageError) errors.image = imageError;
  if (Object.keys(errors).length > 0) return renderEventForm(res, { values, errors, status: 400 });

  if (req.file) data.image = await saveImage(req.file);

  await pool.query(
    `INSERT INTO run_sessions
       (club_id, title, run_type, description, start_at, meeting_point, distance_km, pace, fee,
        max_participants, registration_type, external_url, source_url, image, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.club_id, data.title, data.run_type, data.description, data.start_at, data.meeting_point,
      data.distance_km, data.pace, data.fee, data.max_participants, data.registration_type,
      data.external_url, data.source_url, data.image, data.status,
    ]
  );
  flash(req, "success", "เพิ่มกิจกรรมแล้ว");
  res.redirect("/admin/events");
});

router.get("/events/:id/edit", async (req, res, next) => {
  const event = await findEvent(toId(req.params.id));
  if (!event) return next();

  // แปลงค่าจาก DB → ค่าที่ใส่ในฟอร์มได้
  const values = {
    ...event,
    club_id: String(event.club_id),
    start_at: inputDateTime(event.start_at),
    distance_km: event.distance_km ?? "",
    max_participants: event.max_participants ?? "",
  };
  await renderEventForm(res, { event, values });
});

router.post("/events/:id", acceptImage, async (req, res, next) => {
  const event = await findEvent(toId(req.params.id));
  if (!event) return next();

  const clubs = await allClubs();
  const { values, errors, data } = readEventForm(req.body, {
    clubIds: clubs.map((c) => c.id),
    isNew: false,
    minMax: event.joined_count, // ห้ามตั้งจำนวนรับต่ำกว่าคนที่ Join แล้ว
  });
  const imageError = checkUploadedImage(req);
  if (imageError) errors.image = imageError;
  if (Object.keys(errors).length > 0) return renderEventForm(res, { event, values, errors, status: 400 });

  if (req.file) data.image = await saveImage(req.file);

  await pool.query(
    `UPDATE run_sessions SET
       club_id = ?, title = ?, run_type = ?, description = ?, start_at = ?, meeting_point = ?,
       distance_km = ?, pace = ?, fee = ?, max_participants = ?, registration_type = ?,
       external_url = ?, source_url = ?, image = ?, status = ?
     WHERE id = ?`,
    [
      data.club_id, data.title, data.run_type, data.description, data.start_at, data.meeting_point,
      data.distance_km, data.pace, data.fee, data.max_participants, data.registration_type,
      data.external_url, data.source_url, data.image, data.status, event.id,
    ]
  );
  if (event.image !== data.image) await removeImageIfUnused(event.image);
  flash(req, "success", "บันทึกกิจกรรมแล้ว");
  res.redirect("/admin/events");
});

// ยกเลิก = เปลี่ยน status (ไม่ลบ — ผู้ที่ Join ไว้จะเห็นว่าถูกยกเลิกใน My Runs)
router.post("/events/:id/cancel", async (req, res, next) => {
  const event = await findEvent(toId(req.params.id));
  if (!event) return next();
  await pool.query("UPDATE run_sessions SET status = 'cancelled' WHERE id = ?", [event.id]);
  flash(req, "success", `ยกเลิกกิจกรรม "${event.title}" แล้ว`);
  res.redirect("/admin/events");
});

// ลบถาวร (FK CASCADE: การ Join ของกิจกรรมนี้ถูกลบตาม)
router.post("/events/:id/delete", async (req, res) => {
  const event = await findEvent(toId(req.params.id));
  const [result] = await pool.query("DELETE FROM run_sessions WHERE id = ?", [toId(req.params.id)]);
  if (event) await removeImageIfUnused(event.image);
  flash(req, result.affectedRows ? "success" : "danger", result.affectedRows ? "ลบกิจกรรมแล้ว" : "ไม่พบกิจกรรม");
  res.redirect("/admin/events");
});

router.get("/events/:id/participants", async (req, res, next) => {
  const event = await findEvent(toId(req.params.id));
  if (!event) return next();

  const [participants] = await pool.query(
    `SELECT u.name, u.email, r.created_at AS joined_at
     FROM registrations r JOIN users u ON u.id = r.user_id
     WHERE r.run_session_id = ?
     ORDER BY r.created_at`,
    [event.id]
  );
  res.render("admin/participants", { event, participants });
});

module.exports = router;
