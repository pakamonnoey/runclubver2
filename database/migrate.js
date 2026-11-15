// อัปเดตโครงสร้าง DB ที่มีข้อมูลอยู่แล้ว โดยไม่ลบข้อมูล:  npm run db:migrate
// รันทุกไฟล์ใน database/migrations/ ตามลำดับชื่อ (001_, 002_, ...) ทีละคำสั่ง
// รันซ้ำได้ปลอดภัย: ถ้าตาราง/คอลัมน์มีอยู่แล้ว จะข้ามคำสั่งนั้น (ไม่ถือเป็น error)
//
// เว็บจริง:  ENV_FILE=.env.production npm run db:migrate
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// error ที่แปลว่า "ทำไปแล้ว" → ข้ามได้
// ER_CANT_DROP_FIELD_OR_KEY = คอลัมน์ที่จะลบ ถูกลบไปแล้ว
const ALREADY_DONE = ["ER_TABLE_EXISTS_ERROR", "ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY"];

// แยกไฟล์ SQL เป็นทีละคำสั่ง (ตัดคอมเมนต์ -- ออก แล้วแยกด้วย ;)
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
