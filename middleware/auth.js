// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is authenticated, proceed to the next middleware/route
  } else {
    return res.redirect("/"); // Redirect to the login page if not authenticated
  }
}

module.exports = { ensureAuthenticated };
