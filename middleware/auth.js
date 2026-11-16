// ใช้กั้นหน้า เช่น router.get("/clubs", requireLogin, ...)

function forbidden(res) {
  res.status(403).render("error", {
    title: "Forbidden - RUN BKK",
    status: 403,
    message: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
  });
}

function requireLogin(req, res, next) {
  if (req.session.user) return next();

  // จำหน้าที่จะเข้าไว้ login เสร็จแล้วพากลับมา
  if (req.method === "GET") req.session.returnTo = req.originalUrl;
  req.session.flash = { type: "warning", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" };
  res.redirect("/login");
}

// เช่น requireRole("admin")
function requireRole(role) {
  return function (req, res, next) {
    if (!req.session.user) return requireLogin(req, res, next);
    if (req.session.user.role === role) return next();
    forbidden(res);
  };
}

// หน้า login / register (login แล้วไม่ต้องเข้า)
function requireGuest(req, res, next) {
  if (!req.session.user) return next();
  res.redirect("/");
}

module.exports = { requireLogin, requireRole, requireGuest, forbidden };
