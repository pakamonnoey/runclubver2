// Validation ฝั่ง client — ช่วยให้ผู้ใช้เห็น error ทันทีโดยไม่ต้องส่งไป server
// (server ยัง validate ซ้ำทุกครั้ง เพราะ client ปิด JS หรือแก้โค้ดได้)
//
// ใช้กับ <form data-validate> และอ่านกฎจาก attribute ของ input:
//   required, minlength, maxlength, type="email"  → กฎมาตรฐาน HTML
//   data-match="password"                         → ต้องตรงกับช่อง id="password"
//   data-letter-number                            → ต้องมีทั้งตัวอักษรและตัวเลข

function getErrorMessage(input) {
  const value = input.value.trim();

  if (input.required && value === "") return "กรุณากรอกข้อมูลช่องนี้";
  if (input.minLength > 0 && input.value.length < input.minLength)
    return `ต้องมีอย่างน้อย ${input.minLength} ตัวอักษร`;
  if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "รูปแบบอีเมลไม่ถูกต้อง";
  if (input.hasAttribute("data-letter-number") && !(/[A-Za-z]/.test(input.value) && /[0-9]/.test(input.value)))
    return "ต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข";
  if (input.dataset.match) {
    const other = document.getElementById(input.dataset.match);
    if (other && input.value !== other.value) return "รหัสผ่านยืนยันไม่ตรงกัน";
  }
  return ""; // ผ่าน
}

function showError(input, message) {
  const feedback = input.parentElement.querySelector(".invalid-feedback");
  input.classList.toggle("is-invalid", message !== "");
  if (feedback) feedback.textContent = message;
}

document.querySelectorAll("form[data-validate]").forEach(function (form) {
  const inputs = form.querySelectorAll("input");

  form.addEventListener("submit", function (event) {
    let firstInvalid = null;

    inputs.forEach(function (input) {
      const message = getErrorMessage(input);
      showError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      event.preventDefault(); // หยุดไม่ให้ส่งฟอร์ม
      firstInvalid.focus();
    }
  });

  // พิมพ์แก้แล้ว error หายทันที (เฉพาะช่องที่เคยแสดง error)
  inputs.forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.classList.contains("is-invalid")) showError(input, getErrorMessage(input));
    });
  });
});
