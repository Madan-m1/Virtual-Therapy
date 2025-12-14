// authMiddleware.js - Combined authentication and authorization
module.exports = (req, res, next) => {
  // 1. Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // 2. Check if user is admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  
  next();
};