const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  scheduledAt: {
    type: Date,
  },
  timeSlot: {
    type: String, // Example: "10:00 AM - 10:30 AM"
    required: true,
  },
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled", "booked"],
    default: "scheduled",
  },
  notes: {
    type: String,
  },
}, { timestamps: true });

// Add index for better query performance
SessionSchema.index({ user: 1, date: 1 });
SessionSchema.index({ therapist: 1, date: 1 });
SessionSchema.index({ status: 1 });

module.exports = mongoose.model("Session", SessionSchema);