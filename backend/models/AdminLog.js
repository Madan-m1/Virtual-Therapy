const mongoose = require("mongoose");

const AdminLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: String,
  target: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminLog", AdminLogSchema);
// OR use "AuditLog" if you prefer that name
// module.exports = mongoose.model("AuditLog", AdminLogSchema);