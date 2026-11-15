// ฟังก์ชันช่วยแสดงผล — app.js ใส่ไว้ใน app.locals ทำให้ทุกไฟล์ .ejs เรียกใช้ได้
const TZ = "Asia/Bangkok";

// ประเภทกิจกรรม (ค่าใน DB → ชื่อที่แสดง)
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

  // 5.0 → "5 KM", 10.5 → "10.5 KM", null → ""
  distanceText: (km) => (km === null || km === undefined ? "" : `${Number(km)} KM`),

  runTypeLabel: (type) => RUN_TYPES[type] || type,
};
