// ตรวจฟอร์มคลับ / กิจกรรม / รหัสผ่าน
// ฟอร์ม admin คืน { values, errors, data }
// values = ค่าที่กรอก (เติมกลับในฟอร์ม), errors ว่าง = ผ่าน, data = ค่าที่พร้อมลง DB
const { RUN_TYPES } = require("./format");

const str = (v) => String(v ?? "").trim();

// รับแค่ http/https กันลิงก์ javascript: ที่รันโค้ดได้
function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// ว่าง, /image/xxx.jpg, /uploads/12 หรือลิงก์ http(s)
function isImagePath(value) {
  return value === "" || /^\/image\/[\w.-]+$/.test(value) || /^\/uploads\/\d+$/.test(value) || isWebUrl(value);
}

// กฎรหัสผ่าน ใช้ทั้งตอนสมัคร เปลี่ยนรหัส และลืมรหัสผ่าน
function checkNewPassword(password, confirmPassword) {
  const errors = {};
  if (password.length < 8) {
    errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  } else if (Buffer.byteLength(password) > 72) {
    errors.password = "รหัสผ่านยาวเกินไป"; // bcrypt ใช้ได้สูงสุด 72 bytes
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = "รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข";
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = "รหัสผ่านยืนยันไม่ตรงกัน";
  }
  return errors;
}

// ---------- ฟอร์มคลับ ----------
function readClubForm(body) {
  const values = {
    name: str(body.name),
    description: str(body.description),
    location: str(body.location),
    regular_schedule: str(body.regular_schedule),
    instagram_url: str(body.instagram_url),
    image: str(body.image),
    status: str(body.status),
  };
  const errors = {};

  if (values.name.length < 2 || values.name.length > 150) errors.name = "ชื่อคลับต้องมี 2–150 ตัวอักษร";
  if (values.description.length > 2000) errors.description = "คำอธิบายยาวเกิน 2000 ตัวอักษร";
  if (values.location.length > 255) errors.location = "สถานที่ยาวเกิน 255 ตัวอักษร";
  if (values.regular_schedule.length > 500) errors.regular_schedule = "ตารางวิ่งประจำยาวเกิน 500 ตัวอักษร";
  if (values.instagram_url && !isWebUrl(values.instagram_url))
    errors.instagram_url = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";
  if (!isImagePath(values.image)) errors.image = "ใส่เป็น /image/ชื่อไฟล์ หรือลิงก์ https://";
  if (!["pending", "published"].includes(values.status)) errors.status = "สถานะไม่ถูกต้อง";

  const data = {
    name: values.name,
    description: values.description || null,
    location: values.location || null,
    regular_schedule: values.regular_schedule || null,
    instagram_url: values.instagram_url || null,
    image: values.image || null,
    status: values.status,
  };

  return { values, errors, data };
}

// ---------- ฟอร์มกิจกรรม ----------
// clubIds = id คลับที่มีจริง, isNew = สร้างใหม่ต้องเป็นวันในอนาคต
function readEventForm(body, { clubIds, isNew }) {
  const values = {
    club_id: str(body.club_id),
    title: str(body.title),
    run_type: str(body.run_type),
    description: str(body.description),
    start_at: str(body.start_at), // เช่น "2026-11-22T06:00"
    meeting_point: str(body.meeting_point),
    distance_km: str(body.distance_km),
    fee: str(body.fee),
    external_url: str(body.external_url),
    source_url: str(body.source_url),
    image: str(body.image),
    status: str(body.status),
  };
  const errors = {};

  // กันคนแก้ค่าใน HTML เป็น id มั่วๆ
  const clubId = Number(values.club_id);
  if (!clubIds.includes(clubId)) errors.club_id = "กรุณาเลือกคลับ";

  if (values.title.length < 3 || values.title.length > 150) errors.title = "ชื่อกิจกรรมต้องมี 3–150 ตัวอักษร";
  if (!RUN_TYPES[values.run_type]) errors.run_type = "กรุณาเลือกประเภทกิจกรรม";
  if (values.description.length > 2000) errors.description = "รายละเอียดยาวเกิน 2000 ตัวอักษร";

  // เก็บเป็น "YYYY-MM-DD HH:MM:00" (เวลาไทย)
  let startAt = null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.start_at)) {
    errors.start_at = "กรุณาเลือกวันและเวลา";
  } else {
    const when = new Date(`${values.start_at}:00+07:00`);
    if (isNaN(when)) errors.start_at = "วันเวลาไม่ถูกต้อง";
    else if (isNew && when <= new Date()) errors.start_at = "ต้องเป็นวันเวลาในอนาคต";
    else startAt = values.start_at.replace("T", " ") + ":00";
  }

  if (values.meeting_point.length < 2 || values.meeting_point.length > 255)
    errors.meeting_point = "กรุณากรอกจุดนัดพบ";

  let distance = null;
  if (values.distance_km !== "") {
    distance = Number(values.distance_km);
    if (!(distance > 0 && distance <= 100)) errors.distance_km = "ระยะทางต้องอยู่ระหว่าง 0.1–100 กม.";
  }

  if (values.fee.length > 100) errors.fee = "ค่าใช้จ่ายยาวเกิน 100 ตัวอักษร";

  if (values.external_url && !isWebUrl(values.external_url))
    errors.external_url = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";

  if (values.source_url && !isWebUrl(values.source_url)) errors.source_url = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";

  if (!isImagePath(values.image)) errors.image = "ใส่เป็น /image/ชื่อไฟล์ หรือลิงก์ https://";
  if (!["draft", "published", "cancelled"].includes(values.status)) errors.status = "สถานะไม่ถูกต้อง";

  const data = {
    club_id: clubId,
    title: values.title,
    run_type: values.run_type,
    description: values.description || null,
    start_at: startAt,
    meeting_point: values.meeting_point,
    distance_km: distance,
    fee: values.fee || null, // ว่าง = ฟรี
    external_url: values.external_url || null,
    source_url: values.source_url || null,
    image: values.image || null,
    status: values.status,
  };

  return { values, errors, data };
}

module.exports = { readClubForm, readEventForm, isWebUrl, checkNewPassword };
