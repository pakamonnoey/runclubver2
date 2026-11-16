const mysql = require("mysql2/promise");

// pool: เปิด connection ไว้หลายเส้นแล้วใช้วนกัน ทั้งโปรเจกต์ใช้ตัวนี้ตัวเดียว
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  timezone: "+07:00",
  connectionLimit: 10,
  // TiDB ตัด connection ที่ว่างนาน เลยปิดเองก่อนที่ 60 วินาที
  maxIdle: 2,
  idleTimeout: 60 * 1000,
  enableKeepAlive: true,
  // DB บน cloud ต้องใช้ SSL (DB_SSL=true)
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});

// DB บน cloud ใช้ UTC ถ้าไม่ตั้ง NOW() จะช้ากว่าเวลาไทย 7 ชม.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

module.exports = pool;
