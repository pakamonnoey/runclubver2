// ส่งอีเมลผ่าน Brevo (บริการส่งอีเมล แบบฟรีส่งได้ 300 ฉบับ/วัน)
//
// ทำไมใช้ HTTP API ไม่ใช้ SMTP: Render แบบฟรีบล็อกพอร์ต SMTP (25/465/587)
// จึงส่งเป็น HTTPS request ธรรมดาด้วย fetch (มีใน Node อยู่แล้ว ไม่ต้องลง package เพิ่ม)
//
// ตั้งค่าใน .env:
//   BREVO_API_KEY = API key จาก Brevo (ห้าม commit)
//   MAIL_FROM     = อีเมลผู้ส่งที่ยืนยันกับ Brevo แล้ว
// ถ้ายังไม่ตั้ง BREVO_API_KEY ตอนพัฒนาในเครื่อง → แสดงลิงก์ใน Terminal แทนการส่งจริง

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ยังไม่ได้ตั้งค่า BREVO_API_KEY — ส่งอีเมลไม่ได้");
    }
    // เครื่องตัวเอง: พิมพ์อีเมลออก Terminal (ไม่มีใครเห็นนอกจากเรา)
    console.log(`\n[DEV] อีเมลถึง ${to}\nหัวข้อ: ${subject}\n${text}\n`);
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "RUN BKK", email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo ${response.status}: ${await response.text()}`);
  }
}

module.exports = { sendMail };
