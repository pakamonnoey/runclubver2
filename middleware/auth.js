// Middleware ตรวจสิทธิ์ — ใส่หน้า route ที่ต้องการป้องกัน
// เช่น router.get("/clubs", requireLogin, handler)

// ต้อง login ก่อน
function requireLogin(req, res, next) {
  if (req.session.user) return next(); // login แล้ว → ไปต่อ

  // จำหน้าที่ตั้งใจจะเข้า (เฉพาะ GET) เพื่อพากลับมาหลัง login
  if (req.method === "GET") req.session.returnTo = req.originalUrl;
  req.session.flash = { type: "warning", message: "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้" };
  res.redirect("/login");
}

// ต้องมี role ที่กำหนด เช่น requireRole("admin") หรือ requireRole("owner", "admin")
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.session.user) return requireLogin(req, res, next);
    if (roles.includes(req.session.user.role)) return next();

    // login แล้วแต่ role ไม่ตรง → 403 Forbidden
    res.status(403).render("error", {
      title: "Forbidden - RUN BKK",
      status: 403,
      message: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
    });
  };
}

// ยังไม่ login เท่านั้น (หน้า login/register — login แล้วไม่ต้องเข้าอีก)
function requireGuest(req, res, next) {
  if (!req.session.user) return next();
  res.redirect("/");
}

module.exports = { requireLogin, requireRole, requireGuest };
