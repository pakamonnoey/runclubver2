// ดึงคลับ + กิจกรรมจากเว็บจริงลง DB ในเครื่อง: npm run db:pull
// อ่านจาก .env.production เขียนลง .env อย่างเดียว ไม่เขียนกลับขึ้นเว็บจริง
// ไม่ดึง users เพราะเป็นข้อมูลส่วนตัว / ถ้าข้อมูลในเครื่องจะถูกทับจะถามก่อน (--yes = ไม่ถาม)
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const ROOT = path.join(__dirname, "..");
const TABLES = ["images", "clubs", "run_sessions"]; // ตารางแม่ก่อน
const IGNORE_COLUMNS = ["created_at", "updated_at"];
const autoYes = process.argv.includes("--yes");

// อ่าน env 2 ไฟล์พร้อมกัน เลยไม่ใส่ลง process.env
function readEnv(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) throw new Error(`ไม่พบไฟล์ ${file}`);
  return dotenv.parse(fs.readFileSync(full));
}

async function connect(env) {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: "utf8mb4",
    dateStrings: true, // copy วันเวลาเป็นข้อความ ไม่ต้องแปลงเขตเวลา
    ssl: env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  });
  await conn.query("SET time_zone = '+07:00'");
  return conn;
}

// เทียบทีละตาราง จับคู่ด้วย id
function compare(localRows, prodRows) {
  const prodById = new Map(prodRows.map((r) => [r.id, r]));
  const localById = new Map(localRows.map((r) => [r.id, r]));
  const result = { removed: [], changed: [], added: [] };

  for (const row of localRows) {
    const prod = prodById.get(row.id);
    if (!prod) {
      result.removed.push(row);
      continue;
    }
    const columns = Object.keys(prod).filter((col) => !IGNORE_COLUMNS.includes(col) && !same(prod[col], row[col]));
    if (columns.length > 0) result.changed.push({ row, columns });
  }
  for (const row of prodRows) {
    if (!localById.has(row.id)) result.added.push(row);
  }
  return result;
}

const same = (a, b) => (Buffer.isBuffer(a) && Buffer.isBuffer(b) ? a.equals(b) : String(a) === String(b));

const label = (row) => `#${row.id} ${row.name || row.title || `รูป ${row.mime_type}`}`;

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
    rl.on("close", () => {
      if (!answered) resolve("");
    });
  });
}

async function main() {
  const prodEnv = readEnv(".env.production");
  const localEnv = readEnv(".env");

  // สองไฟล์ชี้ DB เดียวกัน = จะลบข้อมูลจริง หยุดเลย
  if (prodEnv.DB_HOST === localEnv.DB_HOST && prodEnv.DB_NAME === localEnv.DB_NAME) {
    throw new Error(".env กับ .env.production ชี้ไปที่ DB เดียวกัน — หยุดเพื่อไม่ให้ข้อมูลจริงถูกลบ");
  }

  console.log(`อ่านจาก  (production): ${prodEnv.DB_HOST} / ${prodEnv.DB_NAME}`);
  console.log(`เขียนลง  (ในเครื่อง)  : ${localEnv.DB_HOST} / ${localEnv.DB_NAME}\n`);

  const prod = await connect(prodEnv);
  const local = await connect(localEnv);

  try {
    // 1) อ่านทั้งสองฝั่ง
    const prodData = {};
    const diff = {};
    for (const table of TABLES) {
      [prodData[table]] = await prod.query("SELECT * FROM ?? ORDER BY id", [table]);
      const [localRows] = await local.query("SELECT * FROM ?? ORDER BY id", [table]);
      diff[table] = compare(localRows, prodData[table]);
    }
    const [[{ regs }]] = await local.query("SELECT COUNT(*) AS regs FROM registrations");

    // 2) สรุปสิ่งที่จะเปลี่ยน
    let willLoseData = regs > 0;
    let anyChange = regs > 0;
    for (const table of TABLES) {
      const { removed, changed, added } = diff[table];
      console.log(`${table}: เพิ่ม ${added.length} · แก้ ${changed.length} · ลบ ${removed.length}`);
      removed.forEach((row) => console.log(`   - ลบ  ${label(row)}`));
      changed.forEach(({ row, columns }) => console.log(`   ~ ทับ ${label(row)}  (${columns.join(", ")})`));
      if (removed.length || changed.length) willLoseData = true;
      if (removed.length || changed.length || added.length) anyChange = true;
    }
    if (regs > 0) console.log(`registrations: การ Join ในเครื่อง ${regs} รายการจะถูกล้าง`);

    if (!anyChange) {
      console.log("\nข้อมูลในเครื่องตรงกับเว็บจริงอยู่แล้ว — ไม่มีอะไรต้องทำ");
      return;
    }

    // 3) ถ้าข้อมูลในเครื่องจะหายต้องยืนยันก่อน
    if (willLoseData && !autoYes) {
      const answer = await ask("\nข้อมูลในเครื่องข้างบนจะถูกลบ/ทับ — ยืนยันพิมพ์ y แล้วกด Enter: ");
      if (answer.trim().toLowerCase() !== "y") {
        console.log("ยกเลิก — ไม่มีการเปลี่ยนแปลงในเครื่อง");
        return;
      }
    }

    // 4) เขียนใน transaction พังกลางทางก็ rollback
    await local.beginTransaction();
    await local.query("DELETE FROM registrations");
    await local.query("DELETE FROM run_sessions");
    await local.query("DELETE FROM clubs");
    await local.query("DELETE FROM images");
    for (const table of TABLES) {
      for (const row of prodData[table]) {
        // ใช้ id เดิม URL จะได้ตรงกับเว็บจริง
        // ทีละแถว เพราะรูปหลายรูปรวมกันในคำสั่งเดียวอาจเกินขนาดที่ DB รับได้ต่อครั้ง
        await local.query("INSERT INTO ?? SET ?", [table, row]);
      }
    }
    await local.commit();

    console.log(`\n✔ images ${prodData.images.length}, clubs ${prodData.clubs.length}, run_sessions ${prodData.run_sessions.length} แถว`);
    console.log("ข้อมูลในเครื่องตรงกับเว็บจริงแล้ว (users ในเครื่องไม่ถูกแตะ)");
  } catch (err) {
    await local.rollback().catch(() => {});
    throw err;
  } finally {
    await prod.end();
    await local.end();
  }
}

main().catch((err) => {
  console.error("✘ db:pull failed:", err.message);
  process.exitCode = 1;
});
