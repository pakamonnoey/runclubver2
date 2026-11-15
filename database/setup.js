// สร้างตาราง + ใส่ข้อมูลเริ่มต้น:  npm run db:setup
// ใช้ได้ทั้ง DB ในเครื่องและ DB บน cloud (อ่านค่าเชื่อมต่อจาก .env)
//
// ⚠️ runbkk.sql ลบตารางเดิมทิ้งก่อนสร้างใหม่ → ถ้าใน DB มีข้อมูลอยู่แล้ว สคริปต์จะหยุดก่อน
//    ถ้าต้องการล้างจริงๆ:  npm run db:setup -- --force
require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const TABLES = ["users", "clubs", "run_sessions", "registrations", "club_owner_requests"];
const force = process.argv.includes("--force");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true, // อนุญาตให้รันหลายคำสั่งในครั้งเดียว (ใช้เฉพาะสคริปต์นี้)
  });

  try {
    // ---- ตัวกันพลาด: มีตารางของโปรเจกต์อยู่แล้วหรือยัง ----
    const [existing] = await conn.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? AND table_name IN (?)",
      [process.env.DB_NAME, TABLES]
    );

    if (existing.length > 0 && !force) {
      console.log(`⚠️  Database "${process.env.DB_NAME}" มีตารางและข้อมูลอยู่แล้ว:`);
      for (const { name } of existing) {
        const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM ??", [name]); // ?? = ชื่อตาราง
        console.log(`   - ${name}: ${n} แถว`);
      }
      console.log("\nถ้ารันต่อ ข้อมูลทั้งหมดข้างบนจะถูกลบ แล้วเหลือแค่ข้อมูลใน seed.sql");
      console.log("ถ้าแน่ใจ (และ export ข้อมูลเก็บไว้แล้ว) ให้รัน:  npm run db:setup -- --force");
      process.exitCode = 1;
      return;
    }

    for (const file of ["runbkk.sql", "seed.sql"]) {
      const sql = fs.readFileSync(path.join(__dirname, file), "utf8");
      await conn.query(sql);
      console.log(`✔ ${file}`);
    }
    console.log(`Database "${process.env.DB_NAME}" is ready.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✘ Database setup failed:", err.message);
  process.exitCode = 1;
});
