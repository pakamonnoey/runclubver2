// กิจกรรม, กดสนใจ, My Runs, ปุ่มย้อนกลับ
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, Client, checkServer, cleanup, upcomingEvent } = require("./helpers");

const PREFIX = "events";
const c = new Client();
let event;

before(async () => {
  await checkServer();
  await c.registerAndLogin(PREFIX);
  event = await upcomingEvent();
});
after(async () => {
  await cleanup(PREFIX);
  await pool.end();
});

// ไม่มีกิจกรรมใน DB ก็ข้ามเทสต์ที่ต้องใช้
const needEvent = (t) => {
  if (!event) t.skip("ยังไม่มีกิจกรรมที่กำลังจะมาถึงใน DB");
  return !event;
};

test("/events แสดงกิจกรรมที่ published และยังไม่ถึงวัน", async (t) => {
  if (needEvent(t)) return;
  const res = await c.get("/events");
  assert.equal(res.status, 200);
  assert.ok(res.html.includes(`href="/events/${event.id}"`));
});

test("/events ค้นหาคำที่ไม่มี → ไม่พบกิจกรรม", async () => {
  const res = await c.get("/events?q=" + encodeURIComponent("zzz-ไม่มีแน่นอน"));
  assert.match(res.html, /ไม่พบกิจกรรมที่ตรงกับเงื่อนไข/);
});

test("/events ค่าตัวกรองแปลกๆ ไม่ทำให้เว็บพัง (whitelist)", async () => {
  const res = await c.get("/events?type=hack&distance=';DROP&sort=1;DELETE");
  assert.equal(res.status, 200);
});

test("รหัสกิจกรรมไม่ถูกต้อง → 404", async () => {
  for (const path of ["/events/abc", "/events/0", "/events/99999999"]) {
    assert.equal((await c.get(path)).status, 404, path);
  }
});

test("กดสนใจ → อยู่ใน My Runs / กดซ้ำไม่เกิดแถวซ้ำ / เอาออกได้", async (t) => {
  if (needEvent(t)) return;
  const [[me]] = await pool.query("SELECT id FROM users WHERE email LIKE ? ORDER BY id DESC LIMIT 1", [`${PREFIX}-%`]);
  const count = async () =>
    (await pool.query("SELECT COUNT(*) AS n FROM registrations WHERE user_id = ? AND run_session_id = ?", [me.id, event.id]))[0][0].n;

  await c.post(`/events/${event.id}/save`);
  await c.post(`/events/${event.id}/save`); // กดซ้ำ
  assert.equal(await count(), 1);
  const myRuns = (await c.get("/my-runs")).html;
  assert.ok(myRuns.includes(`href="/events/${event.id}?from=my-runs"`));
  assert.ok(myRuns.includes(`action="/events/${event.id}/unsave"`)); // มีปุ่มเอาออก
  assert.match((await c.get(`/events/${event.id}`)).html, /อยู่ในลิสต์ของคุณแล้ว/);

  await c.post(`/events/${event.id}/unsave`);
  assert.equal(await count(), 0);
});

test("บันทึกกิจกรรมที่ผ่านไปแล้วไม่ได้ (server ตรวจซ้ำ ไม่เชื่อปุ่มในหน้าเว็บ)", async (t) => {
  const [[past]] = await pool.query("SELECT id FROM run_sessions WHERE start_at < NOW() LIMIT 1");
  if (!past) return t.skip("ไม่มีกิจกรรมที่ผ่านไปแล้วใน DB");
  await c.post(`/events/${past.id}/save`);
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM registrations r JOIN users u ON u.id = r.user_id WHERE u.email LIKE ? AND r.run_session_id = ?",
    [`${PREFIX}-%`, past.id]
  );
  assert.equal(n, 0);
});

test("ปุ่มย้อนกลับ: กลับไปหน้าที่เปิดมา (Events / หน้าคลับ / My Runs)", async (t) => {
  if (needEvent(t)) return;
  const back = async (query) => (await c.get(`/events/${event.id}${query}`)).html.match(/<a href="([^"]+)" class="back-link">/)[1];
  assert.equal(await back(""), "/events");
  assert.equal(await back("?from=club"), `/clubs/${event.club_id}`);
  assert.equal(await back("?from=my-runs"), "/my-runs");
  assert.equal(await back("?from=https://evil.example"), "/events"); // ค่าแปลกปลอม → ไม่ใช้
});

test("กดสนใจจากหน้าที่เปิดมาจากคลับ → redirect ยังจำ ?from=club ไว้", async (t) => {
  if (needEvent(t)) return;
  const saved = await c.post(`/events/${event.id}/save`, { from: "club" });
  assert.equal(saved.location, `/events/${event.id}?from=club`);
  const removed = await c.post(`/events/${event.id}/unsave`, { from: "my-runs" });
  assert.equal(removed.location, "/my-runs");
  const evil = await c.post(`/events/${event.id}/save`, { from: "https://evil.example" });
  assert.equal(evil.location, `/events/${event.id}`);
});

test("navbar: เมนูของหน้าที่เปิดอยู่มี aria-current=\"page\"", async (t) => {
  const current = async (path) => (await c.get(path)).html.match(/<a href="([^"]+)"[^>]*aria-current="page"/)?.[1];
  assert.equal(await current("/events"), "/events");
  assert.equal(await current("/clubs"), "/clubs");
  assert.equal(await current("/my-runs"), "/my-runs");
  if (event) assert.equal(await current(`/events/${event.id}`), "/events"); // หน้าย่อย → เมนูแม่
});
