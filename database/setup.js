// สร้างตาราง + ใส่ข้อมูลเริ่มต้น:  npm run db:setup
// ใช้ได้ทั้ง DB ในเครื่องและ DB บน cloud (อ่านค่าเชื่อมต่อจาก .env)
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

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

  for (const file of ["runbkk.sql", "seed.sql"]) {
    const sql = fs.readFileSync(path.join(__dirname, file), "utf8");
    await conn.query(sql);
    console.log(`✔ ${file}`);
  }

  await conn.end();
  console.log(`Database "${process.env.DB_NAME}" is ready.`);
}

main().catch((err) => {
  console.error("✘ Database setup failed:", err.message);
  process.exit(1);
});
