// เลื่อนบัญชีที่สมัครไว้แล้วให้เป็น admin
// วิธีใช้:  npm run make-admin -- you@example.com
// (สมัครผ่านหน้าเว็บก่อน → รหัสผ่านถูก hash ด้วยโค้ดเดียวกับผู้ใช้ทั่วไป สคริปต์นี้ไม่ยุ่งกับรหัสผ่าน)
require("dotenv").config({ quiet: true });
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
    console.log(`✔ ${email} เป็น admin แล้ว (ต้อง logout แล้ว login ใหม่ถึงจะมีผล)`);
  }
}

main()
  .catch((err) => {
    console.error("✘", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
