// สมัคร / login / logout / หน้าที่ต้อง login
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, PASSWORD, Client, testEmail, checkServer, cleanup } = require("./helpers");

const PREFIX = "auth";
before(checkServer);
after(async () => {
  await cleanup(PREFIX);
  await pool.end();
});

// ---------- สมัครสมาชิก ----------
test("สมัคร: ข้อมูลถูกต้อง → ไปหน้า login", async () => {
  const c = new Client();
  const res = await c.post("/register", {
    name: "Auth Tester",
    email: testEmail(PREFIX),
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  assert.equal(res.status, 302);
  assert.equal(res.location, "/login");
});

test("สมัคร: ข้อมูลผิดแต่ละแบบ → 400 พร้อมข้อความ error", async () => {
  const c = new Client();
  const ok = { name: "Auth Tester", email: testEmail(PREFIX), password: PASSWORD, confirmPassword: PASSWORD };
  const cases = [
    [{ name: "" }, "ชื่อ"],
    [{ email: "not-an-email" }, "อีเมล"],
    [{ password: "abc1", confirmPassword: "abc1" }, "อย่างน้อย 8 ตัวอักษร"],
    [{ password: "abcdefgh", confirmPassword: "abcdefgh" }, "ตัวอักษรภาษาอังกฤษและตัวเลข"],
    [{ confirmPassword: "Other1234" }, "ไม่ตรงกัน"],
  ];
  for (const [change, message] of cases) {
    const res = await c.post("/register", { ...ok, ...change });
    assert.equal(res.status, 400, JSON.stringify(change));
    assert.match(res.html, new RegExp(message), JSON.stringify(change));
  }
});

test("สมัคร: อีเมลซ้ำ (ตัวพิมพ์ใหญ่-เล็กต่างกันก็ถือว่าซ้ำ) → 400", async () => {
  const c = new Client();
  const email = testEmail(PREFIX);
  const form = { name: "Auth Tester", email, password: PASSWORD, confirmPassword: PASSWORD };
  await c.post("/register", form);
  const res = await c.post("/register", { ...form, email: email.toUpperCase() });
  assert.equal(res.status, 400);
  assert.match(res.html, /อีเมลนี้ถูกใช้สมัครแล้ว/);
});

test("สมัคร: รหัสผ่านใน DB เป็น bcrypt hash ไม่ใช่ข้อความจริง", async () => {
  const c = new Client();
  const email = testEmail(PREFIX);
  await c.post("/register", { name: "Auth Tester", email, password: PASSWORD, confirmPassword: PASSWORD });
  const [[user]] = await pool.query("SELECT password_hash, role FROM users WHERE email = ?", [email]);
  assert.notEqual(user.password_hash, PASSWORD);
  assert.match(user.password_hash, /^\$2[aby]\$/); // รูปแบบของ bcrypt
  assert.equal(user.role, "member"); // สมัครใหม่เป็น member เสมอ
});

// ---------- login / logout ----------
test("login: รหัสผิด และอีเมลที่ไม่มีในระบบ → ข้อความเดียวกัน", async () => {
  const c = new Client();
  const email = testEmail(PREFIX);
  await c.post("/register", { name: "Auth Tester", email, password: PASSWORD, confirmPassword: PASSWORD });

  const wrongPassword = await c.post("/login", { email, password: "Wrong1234" });
  const noSuchUser = await c.post("/login", { email: testEmail(PREFIX), password: PASSWORD });
  assert.equal(wrongPassword.status, 400);
  assert.equal(noSuchUser.status, 400);
  assert.match(wrongPassword.html, /อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
  assert.match(noSuchUser.html, /อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
});

test("login สำเร็จ → เห็นชื่อใน navbar / logout → กลับเป็น guest", async () => {
  const c = new Client();
  await c.registerAndLogin(PREFIX, "Navbar Name");
  assert.match((await c.get("/")).html, /Navbar Name/);

  const out = await c.post("/logout");
  assert.equal(out.status, 302);
  assert.equal((await c.get("/my-runs")).location, "/login");
});

test("login แล้วเข้าหน้า login / register ไม่ได้ (requireGuest) → กลับหน้าแรก", async () => {
  const c = new Client();
  await c.registerAndLogin(PREFIX);
  assert.equal((await c.get("/login")).location, "/");
  assert.equal((await c.get("/register")).location, "/");
});

// ---------- หน้าที่ต้อง login ----------
test("guest เปิดหน้าสาธารณะได้", async () => {
  const c = new Client();
  for (const path of ["/", "/faq", "/login", "/register", "/forgot-password"]) {
    assert.equal((await c.get(path)).status, 200, path);
  }
});

test("guest เปิดหน้าที่ต้อง login → ถูกส่งไปหน้า login", async () => {
  const c = new Client();
  for (const path of ["/events", "/clubs", "/clubs/1", "/my-runs", "/profile", "/admin"]) {
    const res = await c.get(path);
    assert.equal(res.status, 302, path);
    assert.equal(res.location, "/login", path);
  }
});

test("login แล้วพากลับไปหน้าที่ตั้งใจจะเข้า (returnTo)", async () => {
  const c = new Client();
  const email = testEmail(PREFIX);
  await c.post("/register", { name: "Auth Tester", email, password: PASSWORD, confirmPassword: PASSWORD });
  await c.get("/clubs"); // ยังไม่ login → server จำ /clubs ไว้
  const res = await c.post("/login", { email, password: PASSWORD });
  assert.equal(res.location, "/clubs");
});

test("หน้าที่ไม่มีอยู่ → 404", async () => {
  const c = new Client();
  assert.equal((await c.get("/no-such-page")).status, 404);
});
