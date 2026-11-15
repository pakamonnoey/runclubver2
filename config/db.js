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
  timezone: "+07:00", // แปลง DATETIME ↔ JavaScript Date เป็นเวลาไทย
  connectionLimit: 10,
  // DB บน cloud ตัด connection ที่ว่างนานๆ ทิ้ง (TiDB: 340 วินาที)
  // → ให้ pool ปิด connection ที่ว่างเกิน 60 วินาทีเองก่อน จะได้ไม่หยิบ connection ที่ตายแล้วมาใช้
  maxIdle: 2,
  idleTimeout: 60 * 1000,
  enableKeepAlive: true,
  // DB บน cloud บังคับเชื่อมต่อแบบเข้ารหัส (TLS) → ตั้ง DB_SSL=true ตอน deploy
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});

// ทุก connection ใหม่: ตั้งเขตเวลาเป็นไทย
// เพราะ DB บน cloud ใช้ UTC → NOW() จะช้ากว่าเวลาไทย 7 ชม. ถ้าไม่ตั้ง
// (เช่น กิจกรรม 06:00 ที่จบไปแล้วจะยังแสดงและกด Join ได้อีก 7 ชม.)
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

module.exports = pool;
