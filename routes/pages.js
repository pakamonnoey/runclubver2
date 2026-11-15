// Routes ของหน้าหลัก (Phase 2: ยังเป็นข้อมูล hardcode ใน view)
const express = require("express");
const router = express.Router();

// res.render("index") = เอา views/index.ejs มาแปลงเป็น HTML แล้วส่งกลับ
router.get("/", (req, res) => res.render("index"));
router.get("/clubs", (req, res) => res.render("clubs"));
router.get("/events", (req, res) => res.render("events"));
router.get("/faq", (req, res) => res.render("faq"));

module.exports = router;
