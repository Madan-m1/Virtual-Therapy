const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const roleAuth = require("../middleware/roleMiddleware");
const User = require("../models/User");

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// User-only route
router.get("/user/dashboard", authMiddleware, roleAuth(["user"]), (req, res) => {
  res.json({ message: `Welcome ${req.user.name}, this is your User Dashboard.` });
});

// Therapist-only route
router.get("/therapist/dashboard", authMiddleware, roleAuth(["therapist"]), (req, res) => {
  const name = req.user.name.startsWith("Dr.") ? req.user.name : `Dr. ${req.user.name}`;
  res.json({ message: `Welcome ${name}, this is your Therapist Dashboard.` });
});

// Fetch all therapists (public route)
router.get("/therapists", async (req, res) => {
  try {
    const therapists = await User.find({ role: "therapist" }).select(
      "name email specialization experience"
    );
    res.json(therapists);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

