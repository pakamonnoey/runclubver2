// ทดสอบ: ลืมรหัสผ่าน → ลิงก์ตั้งรหัสใหม่ (token) + เปลี่ยนรหัสในหน้า Profile
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { pool, PASSWORD, Client, testEmail, checkServer, cleanup } = require("./helpers");

const PREFIX = "password";
before(checkServer);
after(async () => {
  await cleanup(PREFIX);
  await pool.end();
});

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

// สร้างผู้ใช้ทดสอบ (ยังไม่ login) คืน { email, id }
async function newUser() {
  const email = testEmail(PREFIX);
  await new Client().post("/register", { name: "Reset Tester", email, password: PASSWORD, confirmPassword: PASSWORD });
  const [[user]] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  return { email, id: user.id };
}

// ลิงก์จริงอยู่ในอีเมล (เทสต์อ่านไม่ได้) → สร้าง token เองแล้วเก็บ hash ลง DB แบบเดียวกับ routes/password.js
async function makeToken(userId, minutes = 30) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
  await pool.query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)",
    [userId, sha256(token), minutes]
  );
  return token;
}

test("ขอลิงก์: อีเมลที่มี / ไม่มีในระบบ → ข้อความเดียวกัน (เดาไม่ได้ว่าใครเป็นสมาชิก)", async () => {
  const { email } = await newUser();
  const unknown = testEmail(PREFIX);
  const a = await new Client().post("/forgot-password", { email });
  const b = await new Client().post("/forgot-password", { email: unknown });
  // ดึงกล่องข้อความ แล้วเอาอีเมลออก (อีเมลที่กรอกต่างกัน แต่ข้อความที่เหลือต้องเหมือนกันทุกตัวอักษร)
  const message = (html, mail) => html.match(/<div class="alert[\s\S]*?<\/div>/)[0].replace(mail, "EMAIL");
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(message(a.html, email), message(b.html, unknown));
});

test("ขอลิงก์: DB เก็บแค่ hash ของ token และขอซ้ำใน 1 นาทีไม่สร้างใหม่", async () => {
  const { email, id } = await newUser();
  await new Client().post("/forgot-password", { email });
  await new Client().post("/forgot-password", { email });
  const [rows] = await pool.query("SELECT token_hash FROM password_resets WHERE user_id = ?", [id]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].token_hash, /^[a-f0-9]{64}$/);
});

test("ลิงก์ผิดรูปแบบ / ไม่มีในระบบ / หมดอายุ → ใช้ไม่ได้", async () => {
  const { id } = await newUser();
  const expired = await makeToken(id, -1);
  for (const token of ["abc", "f".repeat(64), expired]) {
    const res = await new Client().get(`/reset-password/${token}`);
    assert.match(res.html, /หมดอายุ/, token.slice(0, 8));
  }
});

test("ตั้งรหัสใหม่: รหัสอ่อน → 400 / ถูกต้อง → login ด้วยรหัสใหม่ได้ และลิงก์ใช้ซ้ำไม่ได้", async () => {
  const { email, id } = await newUser();
  const token = await makeToken(id);
  const c = new Client();

  const weak = await c.post(`/reset-password/${token}`, { password: "short", confirmPassword: "short" });
  assert.equal(weak.status, 400);

  const ok = await c.post(`/reset-password/${token}`, { password: "NewPass99", confirmPassword: "NewPass99" });
  assert.equal(ok.location, "/login");

  assert.equal((await new Client().post("/login", { email, password: PASSWORD })).status, 400); // รหัสเก่าใช้ไม่ได้
  assert.equal((await new Client().post("/login", { email, password: "NewPass99" })).status, 302);
  assert.match((await new Client().get(`/reset-password/${token}`)).html, /หมดอายุ/); // ใช้ได้ครั้งเดียว
});

test("Profile: เปลี่ยนรหัสต้องใส่รหัสเดิมให้ถูก", async () => {
  const c = new Client();
  const email = await c.registerAndLogin(PREFIX);

  const wrong = await c.post("/profile/password", {
    currentPassword: "Wrong1234",
    newPassword: "Changed99",
    confirmPassword: "Changed99",
  });
  assert.equal(wrong.status, 400);
  assert.match(wrong.html, /รหัสผ่านปัจจุบันไม่ถูกต้อง/);

  const ok = await c.post("/profile/password", {
    currentPassword: PASSWORD,
    newPassword: "Changed99",
    confirmPassword: "Changed99",
  });
  assert.equal(ok.location, "/profile");
  assert.equal((await new Client().post("/login", { email, password: "Changed99" })).status, 302);
});
