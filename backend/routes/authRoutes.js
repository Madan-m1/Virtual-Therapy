const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const roleAuth = require("../middleware/roleMiddleware");
const User = require("../models/User");

/* ============================
   PUBLIC AUTH ROUTES
============================ */
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

/* ============================
   ROLE-BASED DASHBOARDS
============================ */

// User-only dashboard
router.get(
  "/user/dashboard",
  authMiddleware,
  roleAuth(["user"]),
  (req, res) => {
    res.json({
      message: `Welcome ${req.user.name}, this is your User Dashboard.`,
    });
  }
);

// Therapist-only dashboard
router.get(
  "/therapist/dashboard",
  authMiddleware,
  roleAuth(["therapist"]),
  (req, res) => {
    const name = req.user.name.startsWith("Dr.")
      ? req.user.name
      : `Dr. ${req.user.name}`;

    res.json({
      message: `Welcome ${name}, this is your Therapist Dashboard.`,
    });
  }
);

/* ============================
   PUBLIC THERAPIST LIST
============================ */
router.get("/therapists", async (req, res) => {
  try {
    const therapists = await User.find({ role: "therapist" }).select(
      "name email specialization experience"
    );
    res.json(therapists);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
