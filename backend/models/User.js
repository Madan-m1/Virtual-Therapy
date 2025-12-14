const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Added: password won't be returned in queries by default
  },
  role: {
    type: String,
    enum: ["user", "therapist", "admin"],
    default: "user",
  },

  // 🔐 Forgot Password
  resetPasswordToken: String,
  resetPasswordExpires: Date, // Keeping plural 'Expires' for consistency
});

// 🔐 Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Using both approaches: genSalt for control, 10 rounds for consistency
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Password comparison method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);