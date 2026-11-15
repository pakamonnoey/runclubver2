// ช่องเลือกรูป: แสดงตัวอย่างทันที + เตือนถ้าไฟล์เกิน 2 MB (server ตรวจซ้ำอีกครั้งเสมอ)
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
      input.value = ""; // ล้างไฟล์ที่เลือก ไม่ให้ส่งไป server
      input.classList.add("is-invalid");
      feedback.textContent = "ไฟล์รูปต้องไม่เกิน 2 MB";
      return;
    }

    // URL.createObjectURL = สร้างลิงก์ชั่วคราวไปที่ไฟล์ในเครื่อง → แสดงตัวอย่างได้โดยไม่ต้องอัปโหลด
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("d-none");
  });
});
