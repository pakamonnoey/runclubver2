// แสดงตัวอย่างรูปทันที และเตือนถ้าไฟล์เกิน 2 MB (server ตรวจซ้ำอีกที)
document.querySelectorAll("[data-image-input]").forEach(function (input) {
  const field = input.closest(".image-field");
  const preview = field.querySelector("[data-image-preview]");
  const feedback = field.querySelector(".invalid-feedback");
  const MAX_SIZE = 2 * 1024 * 1024;

  input.addEventListener("change", function () {
    const file = input.files[0];
    input.classList.remove("is-invalid");
    if (!file) return;

    if (file.size > MAX_SIZE) {
      input.value = "";
      input.classList.add("is-invalid");
      feedback.textContent = "ไฟล์รูปต้องไม่เกิน 2 MB";
      return;
    }

    // ลิงก์ชั่วคราวไปที่ไฟล์ในเครื่อง แสดงรูปได้โดยยังไม่อัปโหลด
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("d-none");
  });
});
