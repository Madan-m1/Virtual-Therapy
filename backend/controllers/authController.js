const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

/* ============================
   REGISTER USER / THERAPIST
============================ */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, specialization, experience } = req.body;

    // Role validation
    if (!role || !["user", "therapist"].includes(role)) {
      return res.status(400).json({ message: "Invalid role type" });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Build user data with therapist-specific fields
    const userData = {
      name,
      email,
      password, // 👈 The pre-save hook will hash this automatically
      role,
    };

    // Therapist-specific fields
    if (role === "therapist") {
      userData.specialization = specialization || "General";
      userData.experience = experience || 0;
    }

    // Create user - password will be hashed by pre-save hook
    const user = await User.create(userData);

    res.status(201).json({
      message: `${role} registered successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ============================
   LOGIN USER / THERAPIST
============================ */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔴 Must use select("+password") to include the password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    // Use the matchPassword method from User model
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    // Use 7-day expiration from integrated code (instead of 1 day)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: `${user.role} login successful`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ============================
   FORGOT PASSWORD
============================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Security: never reveal if user exists
    if (!user) {
      return res.json({ message: "If email exists, reset link sent" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");

    // Hash token before saving
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const html = `
      <h2>Password Reset</h2>
      <p>Click below to reset your password</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `;

    // Send email using the email utility
    await sendEmail({
      to: user.email,
      subject: "Reset your Virtual Therapy password",
      html,
    });

    res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ============================
   RESET PASSWORD
============================ */
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password and clear reset token fields
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // The pre-save hook will automatically hash the password
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};