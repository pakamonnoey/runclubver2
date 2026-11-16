// ตรวจฟอร์มฝั่ง browser ให้เห็น error ทันที (server ตรวจซ้ำอีกที)
// ใช้กับ <form data-validate> อ่านกฎจาก required, minlength, maxlength, type="email"
// data-match="password" = ต้องตรงกับช่อง password, data-letter-number = ต้องมีตัวอักษรและตัวเลข

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
  return "";
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
      event.preventDefault();
      firstInvalid.focus();
    }
  });

  // พิมพ์แก้แล้ว error หายทันที
  inputs.forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.classList.contains("is-invalid")) showError(input, getErrorMessage(input));
    });
  });
});
