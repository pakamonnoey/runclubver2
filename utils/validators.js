// ตรวจข้อมูลจากฟอร์ม "คลับ" และ "กิจกรรม" ในหน้า Admin
// แต่ละฟังก์ชันคืน { values, errors, data }
//   values = ค่าที่ผู้ใช้กรอก (ส่งกลับไปเติมในฟอร์มถ้ามี error)
//   errors = { ชื่อช่อง: ข้อความ } — ว่าง = ผ่าน
//   data   = ค่าที่แปลงแล้ว พร้อมบันทึกลง DB
const { RUN_TYPES } = require("./format");

const str = (v) => String(v ?? "").trim();

// ยอมรับเฉพาะลิงก์ http/https — กัน "javascript:alert(1)" ที่ใส่ใน href แล้วรันโค้ดได้
function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// รูป: เว้นว่าง / ไฟล์ในเว็บเรา (/image/xxx.jpg) / รูปที่อัปโหลด (/uploads/12) / ลิงก์ http(s)
function isImagePath(value) {
  return value === "" || /^\/image\/[\w.-]+$/.test(value) || /^\/uploads\/\d+$/.test(value) || isWebUrl(value);
}

// ===============================================================
// ฟอร์มคลับ
// ===============================================================
function readClubForm(body) {
  const values = {
    name: str(body.name),
    description: str(body.description),
    location: str(body.location),
    instagram_url: str(body.instagram_url),
    image: str(body.image),
    status: str(body.status),
  };
  const errors = {};

  if (values.name.length < 2 || values.name.length > 150) errors.name = "ชื่อคลับต้องมี 2–150 ตัวอักษร";
  if (values.description.length > 2000) errors.description = "คำอธิบายยาวเกิน 2000 ตัวอักษร";
  if (values.location.length > 255) errors.location = "สถานที่ยาวเกิน 255 ตัวอักษร";
  if (values.instagram_url && !isWebUrl(values.instagram_url))
    errors.instagram_url = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";
  if (!isImagePath(values.image)) errors.image = "ใส่เป็น /image/ชื่อไฟล์ หรือลิงก์ https://";
  if (!["pending", "published"].includes(values.status)) errors.status = "สถานะไม่ถูกต้อง";

  const data = {
    name: values.name,
    description: values.description || null, // ช่องว่าง → NULL ใน DB
    location: values.location || null,
    instagram_url: values.instagram_url || null,
    image: values.image || null,
    status: values.status,
  };

  return { values, errors, data };
}

// ===============================================================
// ฟอร์มกิจกรรม
//   clubIds  = id คลับที่มีอยู่จริง (เลือกได้เฉพาะคลับในรายการ)
//   isNew    = สร้างใหม่ต้องเป็นวันในอนาคต
//   minMax   = จำนวนคนที่ Join แล้ว (แก้ไขห้ามตั้งจำนวนรับต่ำกว่านี้)
// ===============================================================
function readEventForm(body, { clubIds, isNew, minMax = 0 }) {
  const values = {
    club_id: str(body.club_id),
    title: str(body.title),
    run_type: str(body.run_type),
    description: str(body.description),
    start_at: str(body.start_at), // จาก <input type="datetime-local"> เช่น "2026-11-22T06:00"
    meeting_point: str(body.meeting_point),
    distance_km: str(body.distance_km),
    pace: str(body.pace),
    max_participants: str(body.max_participants),
    registration_type: str(body.registration_type),
    external_url: str(body.external_url),
    image: str(body.image),
    status: str(body.status),
  };
  const errors = {};

  // club_id ต้องเป็นคลับที่มีอยู่จริง (กันแก้ค่าใน HTML เป็น id มั่วๆ)
  const clubId = Number(values.club_id);
  if (!clubIds.includes(clubId)) errors.club_id = "กรุณาเลือกคลับ";

  if (values.title.length < 3 || values.title.length > 150) errors.title = "ชื่อกิจกรรมต้องมี 3–150 ตัวอักษร";
  if (!RUN_TYPES[values.run_type]) errors.run_type = "กรุณาเลือกประเภทกิจกรรม";
  if (values.description.length > 2000) errors.description = "รายละเอียดยาวเกิน 2000 ตัวอักษร";

  // วันเวลา: เก็บเป็นเวลาไทย "YYYY-MM-DD HH:MM:00"
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

  if (values.pace.length > 50) errors.pace = "Pace ยาวเกิน 50 ตัวอักษร";

  let maxParticipants = null;
  if (values.max_participants !== "") {
    maxParticipants = Number(values.max_participants);
    if (!Number.isInteger(maxParticipants) || maxParticipants < 1 || maxParticipants > 1000)
      errors.max_participants = "จำนวนรับต้องเป็นจำนวนเต็ม 1–1000 (เว้นว่าง = ไม่จำกัด)";
    else if (maxParticipants < minMax)
      errors.max_participants = `มีผู้เข้าร่วมแล้ว ${minMax} คน ตั้งต่ำกว่านี้ไม่ได้`;
  }

  if (!["internal", "external"].includes(values.registration_type))
    errors.registration_type = "กรุณาเลือกวิธีสมัคร";
  if (values.registration_type === "external" && !isWebUrl(values.external_url))
    errors.external_url = "สมัครภายนอกต้องใส่ลิงก์ https://";
  if (values.external_url && !isWebUrl(values.external_url))
    errors.external_url = "ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://";

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
    pace: values.pace || null,
    max_participants: maxParticipants,
    registration_type: values.registration_type,
    external_url: values.registration_type === "external" ? values.external_url : null,
    image: values.image || null,
    status: values.status,
  };

  return { values, errors, data };
}

module.exports = { readClubForm, readEventForm, isWebUrl };
