// ลืมรหัสผ่าน: ขอลิงก์ทางอีเมล -> กดลิงก์ -> ตั้งรหัสใหม่
// - ตอบข้อความเดียวกันเสมอ จะได้เดาไม่ได้ว่าอีเมลไหนเป็นสมาชิก
// - DB เก็บแค่ hash ของ token ถ้า DB หลุดก็เอาไปใช้ไม่ได้
// - ลิงก์ใช้ได้ 30 นาที ครั้งเดียว
const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireGuest } = require("../middleware/auth");
const { checkNewPassword } = require("../utils/validators");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

const TOKEN_MINUTES = 30;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// อ่านจาก .env ไม่ใช้ Host header เพราะปลอมได้
const appUrl = () => process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

async function findValidToken(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const [rows] = await pool.query(
    "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW()",
    [sha256(token)]
  );
  return rows[0] || null;
}

// ---------- ขอลิงก์ ----------
router.get("/forgot-password", requireGuest, (req, res) => {
  res.render("auth/forgot-password", { title: "ลืมรหัสผ่าน - RUN BKK", sent: false, email: "" });
});

router.post("/forgot-password", requireGuest, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  const user = rows[0];

  if (user) {
    // เพิ่งขอไปไม่ถึง 1 นาที ไม่ส่งซ้ำ
    const [[recent]] = await pool.query(
      "SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 MINUTE",
      [user.id]
    );

    if (recent.n === 0) {
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]); // ลิงก์เก่าใช้ไม่ได้แล้ว
      await pool.query(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)",
        [user.id, sha256(token), TOKEN_MINUTES]
      );

      const link = `${appUrl()}/reset-password/${token}`;
      try {
        await sendMail({
          to: email,
          subject: "ตั้งรหัสผ่านใหม่ - RUN BKK",
          text: `กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${TOKEN_MINUTES} นาที):\n${link}\n\nถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้`,
          html:
            `<p>กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${TOKEN_MINUTES} นาที):</p>` +
            `<p><a href="${link}">ตั้งรหัสผ่านใหม่</a></p>` +
            `<p>ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้</p>`,
        });
      } catch (err) {
        console.error("ส่งอีเมลตั้งรหัสใหม่ไม่สำเร็จ:", err.message);
      }
    }
  }

  res.render("auth/forgot-password", { title: "ลืมรหัสผ่าน - RUN BKK", sent: true, email });
});

// ---------- ตั้งรหัสใหม่จากลิงก์ ----------

// token อยู่ใน URL ห้ามหลุดไปเว็บอื่นผ่าน Referer
router.use("/reset-password", (req, res, next) => {
  res.set("Referrer-Policy", "no-referrer");
  next();
});

router.get("/reset-password/:token", requireGuest, async (req, res) => {
  const valid = await findValidToken(req.params.token);
  res.render("auth/reset-password", { title: "ตั้งรหัสผ่านใหม่ - RUN BKK", valid: !!valid, errors: {} });
});

router.post("/reset-password/:token", requireGuest, async (req, res) => {
  const reset = await findValidToken(req.params.token);
  if (!reset) {
    return res.status(400).render("auth/reset-password", { title: "ตั้งรหัสผ่านใหม่ - RUN BKK", valid: false, errors: {} });
  }

  const password = String(req.body.password || "");
  const errors = checkNewPassword(password, String(req.body.confirmPassword || ""));
  if (Object.keys(errors).length > 0) {
    return res.status(400).render("auth/reset-password", { title: "ตั้งรหัสผ่านใหม่ - RUN BKK", valid: true, errors });
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, reset.user_id]);
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [reset.user_id]); // ใช้ได้ครั้งเดียว

  req.session.flash = { type: "success", message: "ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ" };
  res.redirect("/login");
});

module.exports = router;
