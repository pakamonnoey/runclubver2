// ฟังก์ชันจัดรูปแบบ ใช้ใน view ผ่าน fmt (ตั้งไว้ใน app.js)
const TZ = "Asia/Bangkok";

const DEFAULT_IMAGE = "/image/about.jpg"; // ใช้ตอนไม่มีรูป

// ค่าใน DB -> ชื่อที่แสดง
const RUN_TYPES = {
  morning: "Morning Run",
  social: "Social Run",
  night: "Night Run",
  beginner: "Beginner Friendly",
};

module.exports = {
  RUN_TYPES,

  // 20
  dayNumber: (date) => new Date(date).toLocaleString("en-US", { timeZone: TZ, day: "numeric" }),

  // NOV
  monthShort: (date) =>
    new Date(date).toLocaleString("en-US", { timeZone: TZ, month: "short" }).toUpperCase(),

  // 06:30 AM
  timeText: (date) =>
    new Date(date).toLocaleTimeString("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),

  // วันศุกร์ที่ 20 พฤศจิกายน 2569
  thaiDate: (date) =>
    new Date(date).toLocaleDateString("th-TH", {
      timeZone: TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),

  // 5.0 -> "5 KM", null -> ""
  distanceText: (km) => (km === null || km === undefined ? "" : `${Number(km)} KM`),

  runTypeLabel: (type) => RUN_TYPES[type] || type,

  // โปสเตอร์ -> โลโก้คลับ -> รูปสำรอง (SQL ต้องมี c.image AS club_image)
  eventImage: (event) => event.image || event.club_image || DEFAULT_IMAGE,

  clubImage: (club) => club.image || DEFAULT_IMAGE,

  // "https://www.instagram.com/sabairunclub.bkk/" -> "@sabairunclub.bkk"
  instagramHandle: (url) => {
    try {
      const name = new URL(url).pathname.split("/").filter(Boolean)[0];
      return name ? "@" + name : "Instagram";
    } catch {
      return "Instagram";
    }
  },

  // สำหรับ <input type="datetime-local"> เช่น "2026-11-22T06:00"
  // (sv-SE ให้รูปแบบ "2026-11-22 06:00:00" ตัดต่อง่าย)
  inputDateTime: (date) =>
    new Date(date).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T"),

  // "22 พ.ย. 2569 06:00" ใช้ในตาราง admin
  shortDateTime: (date) =>
    new Date(date).toLocaleString("th-TH", {
      timeZone: TZ,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
};
