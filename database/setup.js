// สร้างตาราง + ข้อมูลเริ่มต้น: npm run db:setup
// runbkk.sql ลบตารางเดิมก่อน ถ้ามีข้อมูลอยู่แล้วจะหยุด (ล้างจริงใช้ -- --force)
// DB บน cloud: ENV_FILE=.env.production npm run db:setup
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const TABLES = ["users", "clubs", "run_sessions", "registrations", "images"];
const force = process.argv.includes("--force");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    multipleStatements: true, // รันทั้งไฟล์ .sql ในครั้งเดียว
  });

  console.log(`→ ${process.env.DB_HOST} / ${process.env.DB_NAME}`);

  try {
    // มีตารางของโปรเจกต์อยู่แล้วหรือยัง
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
