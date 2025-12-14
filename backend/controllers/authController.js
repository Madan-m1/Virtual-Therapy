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

    // BLOCKED USER CHECK - Already implemented
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked by admin"
      });
    }

    // Use the matchPassword method from User model
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid login details" });
    }

    // THERAPIST APPROVAL CHECK (ADMIN BYPASSES THIS)
    if (user.role === "therapist" && !user.isApproved) {
      return res.status(403).json({
        message: "Therapist account pending admin approval"
      });
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
    
    // Security: never reveal if user exists (but we should still handle errors gracefully)
    if (!user) {
      // Return a generic message for security
      return res.json({ message: "If email exists, reset link sent" });
    }

    // BLOCKED USER CHECK - Added for password reset
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked by admin"
      });
    }

    // ✅ 1. Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // ✅ 2. Hash token before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // ✅ 3. Save to DB (using correct field name from second code block)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save({ validateBeforeSave: false });

    // ✅ 4. Build reset URL (IMPORTANT - using resetToken, not hashedToken)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // ✅ 5. Email message
    const message = `
      <h2>Password Reset</h2>
      <p>You requested a password reset.</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `;

    // ✅ 6. Send email
    await sendEmail({
      to: user.email,
      subject: "Reset your Virtual Therapy password",
      html: message,
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
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Find user with matching token and check expiration
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // Note: using resetPasswordExpire (not resetPasswordExpires)
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // BLOCKED USER CHECK - Added for password reset
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked by admin"
      });
    }

    // Set new password and clear reset token fields
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // The pre-save hook will automatically hash the password
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};