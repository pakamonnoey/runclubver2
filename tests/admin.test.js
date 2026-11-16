// ทดสอบ: สิทธิ์ admin (requireRole) — member เข้าไม่ได้ / admin เข้าได้
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, Client, checkServer, cleanup } = require("./helpers");

const PREFIX = "admin";
before(checkServer);
after(async () => {
  await cleanup(PREFIX);
  await pool.end();
});

const ADMIN_PAGES = ["/admin", "/admin/users", "/admin/clubs", "/admin/events", "/admin/clubs/new", "/admin/events/new"];

test("member เข้าหน้า admin → 403 Forbidden", async () => {
  const c = new Client();
  await c.registerAndLogin(PREFIX);
  for (const path of ADMIN_PAGES) {
    assert.equal((await c.get(path)).status, 403, path);
  }
});

test("member ส่งฟอร์ม admin ตรงๆ (ไม่ผ่านหน้าเว็บ) ก็ถูกบล็อก → 403", async () => {
  const c = new Client();
  await c.registerAndLogin(PREFIX);
  const res = await c.post("/admin/clubs", { name: "Should Not Exist", status: "draft" });
  assert.equal(res.status, 403);
});

test("admin เข้าทุกหน้า admin ได้ และเห็นเมนู Admin", async () => {
  const c = new Client();
  const email = await c.registerAndLogin(PREFIX);
  // เปลี่ยน role ใน DB → app.js อ่าน role ล่าสุดจาก DB ทุก request จึงมีผลทันที
  await pool.query("UPDATE users SET role = 'admin' WHERE email = ?", [email]);

  for (const path of ADMIN_PAGES) {
    assert.equal((await c.get(path)).status, 200, path);
  }
  assert.match((await c.get("/")).html, /href="\/admin"/);
});
