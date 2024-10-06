function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next(); // User is an admin, proceed to the next middleware/route
  } else {
    return res
      .status(403)
      .send("Access denied. You do not have permission to view this page.");
  }
}

module.exports = isAdmin;
