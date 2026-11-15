// เลื่อนบัญชีที่สมัครไว้แล้วให้เป็น admin
// วิธีใช้:  npm run make-admin -- you@example.com
// (สมัครผ่านหน้าเว็บก่อน → รหัสผ่านถูก hash ด้วยโค้ดเดียวกับผู้ใช้ทั่วไป สคริปต์นี้ไม่ยุ่งกับรหัสผ่าน)
// ENV_FILE=.env.production → ใช้ค่าเชื่อมต่อ DB บน cloud แทน (ค่าเริ่มต้นคือ .env)
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });
const pool = require("../config/db");

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exitCode = 1;
    return;
  }

  const [result] = await pool.query("UPDATE users SET role = 'admin' WHERE email = ?", [email]);

  if (result.affectedRows === 0) {
    console.error(`✘ ไม่พบผู้ใช้อีเมล ${email} — สมัครผ่านหน้า /register ก่อน`);
    process.exitCode = 1;
  } else {
    console.log(`✔ ${email} เป็น admin แล้ว (refresh หน้าเว็บก็มีผลทันที)`);
  }
}

main()
  .catch((err) => {
    console.error("✘", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
