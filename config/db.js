// การเชื่อมต่อฐานข้อมูล — ทั้งโปรเจกต์ใช้ pool ตัวนี้ตัวเดียว
const mysql = require("mysql2/promise");

// Pool = เปิด connection เตรียมไว้หลายเส้น ใครขอใช้ก็หยิบไป ใช้เสร็จคืน
// ดีกว่าเปิด/ปิด connection ใหม่ทุก request (ช้า และเสี่ยง connection เต็ม)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  timezone: "+07:00", // DATETIME ใน DB เป็นเวลาไทย
  connectionLimit: 10,
  // DB บน cloud (เช่น TiDB/Aiven) บังคับ SSL → ตั้ง DB_SSL=true ใน .env ตอน deploy
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

module.exports = pool;
