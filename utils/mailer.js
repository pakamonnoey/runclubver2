// ส่งอีเมลผ่าน Brevo (ฟรี 300 ฉบับ/วัน)
// ใช้ HTTP API แทน SMTP เพราะ Render แบบฟรีบล็อกพอร์ต SMTP
// .env: BREVO_API_KEY, MAIL_FROM (ในเครื่องไม่ตั้ง key ก็ได้ จะพิมพ์ลิงก์ออก Terminal แทน)

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ยังไม่ได้ตั้งค่า BREVO_API_KEY — ส่งอีเมลไม่ได้");
    }
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
