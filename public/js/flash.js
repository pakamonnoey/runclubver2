// ข้อความแจ้งเตือนที่มี data-autohide (ข้อความสำเร็จ) → ปิดเองหลัง 5 วินาที
// ใช้ Bootstrap Alert.close() → มี animation ค่อยๆ จางหายเหมือนกดปุ่ม ×
document.querySelectorAll(".alert[data-autohide]").forEach(function (alertBox) {
  setTimeout(function () {
    bootstrap.Alert.getOrCreateInstance(alertBox).close();
  }, 5000);
});
