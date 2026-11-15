// RUN BKK — จุดเริ่มต้นของเซิร์ฟเวอร์
require("dotenv").config(); // โหลดค่าจากไฟล์ .env เข้า process.env

const path = require("path");
const express = require("express");

const pageRoutes = require("./routes/pages");

const app = express();
const PORT = process.env.PORT || 3000;

// 1) ตั้งค่า EJS เป็น template engine และบอกว่าไฟล์ view อยู่ที่ไหน
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 2) ไฟล์ static (CSS, รูป, Bootstrap) ส่งให้ browser ตรงๆ จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

// 3) อ่านข้อมูลจาก <form method="POST"> ให้อยู่ใน req.body (ใช้ใน Phase 4)
app.use(express.urlencoded({ extended: false }));

// 4) Routes
app.use("/", pageRoutes);

// 5) ไม่เจอ route ไหนเลย → หน้า 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found - RUN BKK",
    status: 404,
    message: "ไม่พบหน้าที่คุณต้องการ",
  });
});

// 6) Error handler กลาง (Express รู้ว่าเป็น error handler เพราะมี 4 parameters)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Error - RUN BKK",
    status: 500,
    message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
  });
});

app.listen(PORT, () => {
  console.log(`RUN BKK running at http://localhost:${PORT}`);
});
