// อัปเดตโครงสร้าง DB โดยไม่ลบข้อมูล: npm run db:migrate
// รันไฟล์ใน migrations/ ตามลำดับชื่อ รันซ้ำได้ (อะไรที่ทำไปแล้วจะข้าม)
// เว็บจริง: ENV_FILE=.env.production npm run db:migrate
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// error พวกนี้แปลว่าทำไปแล้ว ข้ามได้
const ALREADY_DONE = ["ER_TABLE_EXISTS_ERROR", "ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY"];

// ตัดคอมเมนต์ -- ออก แล้วแยกคำสั่งด้วย ;
function statements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  });

  console.log(`→ ${process.env.DB_HOST} / ${process.env.DB_NAME}`);
  try {
    for (const file of files) {
      let applied = 0;
      let skipped = 0;
      for (const sql of statements(fs.readFileSync(path.join(dir, file), "utf8"))) {
        try {
          await conn.query(sql);
          applied++;
        } catch (err) {
          if (!ALREADY_DONE.includes(err.code)) throw new Error(`${file}: ${err.message}`);
          skipped++;
        }
      }
      console.log(`✔ ${file}  (ทำ ${applied}, มีอยู่แล้ว ${skipped})`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✘ migration failed:", err.message);
  process.exitCode = 1;
});
