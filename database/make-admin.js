// ทำให้บัญชีที่สมัครไว้แล้วเป็น admin: npm run make-admin -- you@example.com
// DB บน cloud: ENV_FILE=.env.production npm run make-admin -- you@example.com
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
