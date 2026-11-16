// หน้าคลับ: ข้อมูลต้องตรงกับ DB
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, Client, checkServer, cleanup } = require("./helpers");

const PREFIX = "clubs";
const c = new Client();
let clubs;

before(async () => {
  await checkServer();
  await c.registerAndLogin(PREFIX);
  [clubs] = await pool.query("SELECT id, name, instagram_url FROM clubs WHERE status = 'published' ORDER BY id");
});
after(async () => {
  await cleanup(PREFIX);
  await pool.end();
});

test("/clubs แสดงทุกคลับที่ published จาก DB", async () => {
  const res = await c.get("/clubs");
  assert.equal(res.status, 200);
  for (const club of clubs) {
    assert.ok(res.html.includes(`href="/clubs/${club.id}"`), club.name);
  }
});

test("/clubs ไม่แสดงคลับที่เป็น draft", async () => {
  const [drafts] = await pool.query("SELECT id FROM clubs WHERE status <> 'published'");
  const res = await c.get("/clubs");
  for (const club of drafts) {
    assert.ok(!res.html.includes(`href="/clubs/${club.id}"`), `draft ${club.id}`);
    assert.equal((await c.get(`/clubs/${club.id}`)).status, 404);
  }
});

test("/clubs ไม่มีช่องค้นหา", async () => {
  const res = await c.get("/clubs");
  assert.ok(!res.html.includes('name="q"'));
});

test("การ์ดคลับแสดงชื่อบัญชี IG จากลิงก์ที่ admin กรอก", async () => {
  const res = await c.get("/clubs");
  for (const club of clubs.filter((x) => x.instagram_url)) {
    const handle = "@" + new URL(club.instagram_url).pathname.split("/").filter(Boolean)[0];
    assert.ok(res.html.includes(handle), handle);
  }
});

test("ปุ่มบอกจำนวนกิจกรรมที่กำลังจะมาถึงตรงกับ DB", async () => {
  const res = await c.get("/clubs");
  for (const club of clubs) {
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM run_sessions WHERE club_id = ? AND status = 'published' AND start_at >= NOW()",
      [club.id]
    );
    const label = n > 0 ? `ดูกิจกรรมของคลับ (${n})` : "ดูข้อมูลคลับ";
    const card = res.html.split(`href="/clubs/${club.id}"`)[1];
    assert.ok(card.trimStart().startsWith('class="main-button club-button"'), club.name);
    assert.ok(card.slice(0, 200).includes(label), `${club.name}: ${label}`);
  }
});

test("หน้ารายละเอียดคลับ: ชื่อ + หัวข้อกิจกรรม + ลิงก์กิจกรรมมี ?from=club", async () => {
  for (const club of clubs) {
    const res = await c.get(`/clubs/${club.id}`);
    assert.equal(res.status, 200);
    assert.ok(res.html.includes("กิจกรรมที่กำลังจะมาถึง"));
    const [events] = await pool.query(
      "SELECT id FROM run_sessions WHERE club_id = ? AND status = 'published' AND start_at >= NOW()",
      [club.id]
    );
    for (const e of events) {
      assert.ok(res.html.includes(`href="/events/${e.id}?from=club"`), `event ${e.id}`);
    }
  }
});

test("รหัสคลับไม่ถูกต้อง → 404", async () => {
  for (const path of ["/clubs/abc", "/clubs/0", "/clubs/99999999"]) {
    assert.equal((await c.get(path)).status, 404, path);
  }
});
