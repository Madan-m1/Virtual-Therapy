const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const role = require("../middleware/roleMiddleware");
const { adminDashboard } = require("../controllers/adminController");
const User = require("../models/User");
const Session = require("../models/Session");

// Admin dashboard route
router.get("/dashboard", auth, role(["admin"]), adminDashboard);

// Admin analytics - Integrated version (combining both approaches)
router.get("/analytics", auth, admin, async (req, res) => {
  try {
    // Using Promise.all for better performance (as in your enhanced version)
    const [
      users,
      therapists,
      sessions,
      regularUsers,
      completedSessions
    ] = await Promise.all([
      User.countDocuments(),  // All users (admins + therapists + regular users)
      User.countDocuments({ role: "therapist" }),
      Session.countDocuments(),
      User.countDocuments({ role: "user" }),  // Only regular users
      Session.countDocuments({ status: "completed" })
    ]);

    // Return both basic analytics (as requested) and enhanced metrics
    res.json({
      // Basic analytics (from provided code)
      users,
      therapists,
      sessions,
      
      // Enhanced analytics (from your original code)
      totalUsers: users,           // Alias for users
      regularUsers,               // Only users with role "user"
      completedSessions,          // Completed sessions
      completionRate: sessions > 0 ? 
        Math.round((completedSessions / sessions) * 100) : 0  // Completion rate percentage
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Alternative: If you want to keep the simple version as a separate endpoint
// router.get("/analytics/basic", auth, admin, async (req, res) => {
//   try {
//     const users = await User.countDocuments();
//     const therapists = await User.countDocuments({ role: "therapist" });
//     const sessions = await Session.countDocuments();

//     res.json({ users, therapists, sessions });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// Get all users
router.get("/users", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get pending therapists (with password exclusion for security)
router.get("/pending-therapists", auth, admin, async (req, res) => {
  try {
    const therapists = await User.find({
      role: "therapist",
      isApproved: false
    }).select("-password");
    res.json(therapists);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// View all sessions - Improved version with error handling
router.get("/sessions", auth, admin, async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate("user", "name email")
      .populate("therapist", "name email")
      .sort({ createdAt: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel session - with error handling (using your provided code structure)
router.put("/cancel-session/:id", auth, admin, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, {
      status: "cancelled"
    });
    res.json({ message: "Session cancelled by admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Alternative endpoint for cancelling sessions (nested under /sessions)
router.put("/sessions/cancel/:id", auth, admin, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, {
      status: "cancelled"
    });
    res.json({ message: "Session cancelled by admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Approve therapist
router.put("/approve/:id", auth, admin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { 
      isApproved: true 
    });
    res.json({ message: "Therapist approved" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Block user
router.put("/block/:id", auth, admin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { 
      isBlocked: true 
    });
    res.json({ message: "User blocked" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unblock user
router.put("/unblock/:id", auth, admin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { 
      isBlocked: false 
    });
    res.json({ message: "User unblocked" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;