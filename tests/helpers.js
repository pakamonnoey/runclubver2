// ตัวช่วยของชุดทดสอบ (node:test + fetch ไม่ต้องลง package เพิ่ม)
// เปิด npm run dev ไว้ก่อน แล้วค่อย npm test
require("dotenv").config({ quiet: true });
const pool = require("../config/db");

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

// ชุดทดสอบสร้าง/ลบข้อมูล ห้ามรันกับเว็บจริง
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL) || process.env.ENV_FILE) {
  throw new Error("ชุดทดสอบรันได้เฉพาะกับ localhost และ DB ในเครื่องเท่านั้น");
}

// ผู้ใช้ทดสอบใช้ @example.test ลบทิ้งได้ง่ายและไม่โดนผู้ใช้จริง
const TEST_DOMAIN = "@example.test";
const PASSWORD = "Test1234";

let counter = 0;
function testEmail(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}${TEST_DOMAIN}`;
}

// เบราว์เซอร์จำลอง: จำ cookie ไว้ส่งไปทุก request
class Client {
  constructor() {
    this.cookies = {};
  }

  async request(method, path, form) {
    const headers = {};
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) headers.cookie = cookie;

    let body;
    if (form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(form).toString();
    }

    // ไม่ตาม redirect เอง จะได้เช็กว่าไปหน้าไหน
    const res = await fetch(BASE_URL + path, { method, headers, body, redirect: "manual" });

    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      this.cookies[pair.slice(0, i)] = pair.slice(i + 1);
    }

    const location = res.headers.get("location") || "";
    return { status: res.status, location, html: await res.text() };
  }

  get(path) {
    return this.request("GET", path);
  }

  post(path, form = {}) {
    return this.request("POST", path, form);
  }

  async registerAndLogin(prefix, name = "Test User") {
    const email = testEmail(prefix);
    await this.post("/register", { name, email, password: PASSWORD, confirmPassword: PASSWORD });
    const res = await this.post("/login", { email, password: PASSWORD });
    if (res.status !== 302) throw new Error("login ผู้ใช้ทดสอบไม่สำเร็จ");
    return email;
  }
}

async function checkServer() {
  try {
    await fetch(BASE_URL + "/faq");
  } catch {
    throw new Error(`เชื่อมต่อ ${BASE_URL} ไม่ได้ — เปิด npm run dev ไว้ก่อนแล้วค่อยรัน npm test`);
  }
}

// ลบผู้ใช้ทดสอบของไฟล์นั้น (ข้อมูลที่ผูกอยู่ถูกลบตาม)
async function cleanup(prefix) {
  await pool.query("DELETE FROM users WHERE email LIKE ?", [`${prefix}-%${TEST_DOMAIN}`]);
}

// หยิบกิจกรรมที่ยังไม่ถึงวันมา 1 รายการ (ไม่ fix id เพราะข้อมูลเปลี่ยนได้)
async function upcomingEvent() {
  const [rows] = await pool.query(
    `SELECT rs.id, rs.club_id, c.name AS club_name
     FROM run_sessions rs JOIN clubs c ON c.id = rs.club_id
     WHERE rs.status = 'published' AND c.status = 'published' AND rs.start_at > NOW()
     ORDER BY rs.start_at LIMIT 1`
  );
  return rows[0] || null;
}

module.exports = { pool, BASE_URL, PASSWORD, Client, testEmail, checkServer, cleanup, upcomingEvent };
