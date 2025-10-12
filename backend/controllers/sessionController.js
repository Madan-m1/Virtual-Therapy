const Session = require("../models/Session");

// 📅 Book a Session (User)
exports.bookSession = async (req, res) => {
  try {
    const { therapistId, date, timeSlot } = req.body;

    const newSession = await Session.create({
      user: req.user._id,
      therapist: therapistId,
      date,
      timeSlot,
      status: "booked",
    });

    res.status(201).json({ message: "Session booked successfully", session: newSession });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 🧾 View All Sessions (Therapist)
exports.getTherapistSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ therapist: req.user._id })
      .populate("user", "name email")
      .sort({ date: 1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 👤 View User's Sessions
exports.getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .populate("therapist", "name specialization")
      .sort({ date: 1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ❌ Cancel Session
exports.cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findByIdAndUpdate(id, { status: "cancelled" });
    res.json({ message: "Session cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
