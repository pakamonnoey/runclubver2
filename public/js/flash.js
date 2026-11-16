// ข้อความสำเร็จ (data-autohide) ปิดเองหลัง 5 วินาที
document.querySelectorAll(".alert[data-autohide]").forEach(function (alertBox) {
  setTimeout(function () {
    bootstrap.Alert.getOrCreateInstance(alertBox).close();
  }, 5000);
});
