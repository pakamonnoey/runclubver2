// อัปเดตโครงสร้าง DB ที่มีข้อมูลอยู่แล้ว โดยไม่ลบข้อมูล:  npm run db:migrate
// รันทุกไฟล์ใน database/migrations/ ตามลำดับชื่อ (001_, 002_, ...)
// ทุกไฟล์เขียนแบบรันซ้ำได้ปลอดภัย (เช่น CREATE TABLE IF NOT EXISTS)
//
// เว็บจริง:  ENV_FILE=.env.production npm run db:migrate
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    multipleStatements: true,
  });

  console.log(`→ ${process.env.DB_HOST} / ${process.env.DB_NAME}`);
  try {
    for (const file of files) {
      await conn.query(fs.readFileSync(path.join(dir, file), "utf8"));
      console.log(`✔ ${file}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✘ migration failed:", err.message);
  process.exitCode = 1;
});
