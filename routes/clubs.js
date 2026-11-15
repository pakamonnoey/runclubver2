// Clubs: รายการคลับ + รายละเอียดคลับ (พร้อมกิจกรรมที่จะมาถึงของคลับนั้น)
const express = require("express");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.use(requireLogin);

// GET /clubs — เฉพาะคลับที่ published (ข้อมูลที่ยืนยันแล้ว)
router.get("/", async (req, res) => {
  const [clubs] = await pool.query(
    `SELECT id, name, description, location, regular_schedule, instagram_url, image
     FROM clubs
     WHERE status = 'published'
     ORDER BY id`
  );
  res.render("clubs", { clubs });
});

// GET /clubs/:id
router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next();

  const [rows] = await pool.query(
    "SELECT * FROM clubs WHERE id = ? AND status = 'published'",
    [id]
  );
  const club = rows[0];
  if (!club) return next(); // ไม่พบ → 404

  const [events] = await pool.query(
    `SELECT rs.*, c.image AS club_image,
            (SELECT COUNT(*) FROM registrations r WHERE r.run_session_id = rs.id) AS joined_count
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.club_id = ? AND rs.status = 'published' AND rs.start_at >= NOW()
     ORDER BY rs.start_at`,
    [id]
  );

  res.render("club-detail", { club, events });
});

module.exports = router;
