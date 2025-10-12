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
  timeSlot: {
    type: String, // Example: "10:00 AM - 10:30 AM"
    required: true,
  },
  status: {
    type: String,
    enum: ["booked", "completed", "cancelled"],
    default: "booked",
  },
  notes: {
    type: String,
  },
});

module.exports = mongoose.model("Session", SessionSchema);
