// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is authenticated, proceed to the next middleware
  } else {
    return res.redirect("/"); // If not authenticated, redirect to login
  }
}

module.exports = { ensureAuthenticated };
