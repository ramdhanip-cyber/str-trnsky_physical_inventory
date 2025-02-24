const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
      next(); // Proceed if logged in
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
  
  module.exports = isAuthenticated;

