// controllers/sessionController.js
const Session = require("../models/Session");
const User = require("../models/User");

// Helper → convert "10:00 AM - 10:30 AM" → Date range
function parseTimeRange(date, timeSlot) {
  const [start, end] = timeSlot.split(" - ");

  const startDate = new Date(`${date} ${start}`);
  const endDate = new Date(`${date} ${end}`);

  return { startDate, endDate };
}

// Auto-expire sessions
async function autoExpireSessions() {
  const now = new Date();
  await Session.updateMany(
    { status: "booked", endTime: { $lt: now } },
    { status: "expired" }
  );
}

/******************************
 * BOOK SESSION
 ******************************/
exports.bookSession = async (req, res) => {
  try {
    const { therapistId, date, timeSlot } = req.body;
    const userId = req.user.id;

    await autoExpireSessions();

    const { startDate, endDate } = parseTimeRange(date, timeSlot);

    if (startDate < new Date())
      return res.status(400).json({ msg: "Cannot book past sessions" });

    // Check overlapping sessions
    const exists = await Session.findOne({
      therapist: therapistId,
      status: "booked",
      $or: [
        { startTime: { $lt: endDate, $gte: startDate } },
        { endTime: { $gt: startDate, $lte: endDate } },
      ],
    });

    if (exists)
      return res.status(400).json({ msg: "Therapist already booked at this time" });

    const newSession = await Session.create({
      user: userId,
      therapist: therapistId,
      date,
      timeSlot,
      startTime: startDate,
      endTime: endDate,
      status: "booked",
    });

    res.json(newSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/******************************
 * USER Sessions
 ******************************/
exports.getUserSessions = async (req, res) => {
  try {
    await autoExpireSessions();

    const sessions = await Session.find({ user: req.user.id })
      .populate("therapist", "name")
      .sort({ startTime: 1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/******************************
 * THERAPIST Sessions
 ******************************/
exports.getTherapistSessions = async (req, res) => {
  try {
    await autoExpireSessions();

    const sessions = await Session.find({ therapist: req.user.id })
      .populate("user", "name")
      .sort({ startTime: 1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/******************************
 * CANCEL Session
 ******************************/
exports.cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session)
      return res.status(404).json({ msg: "Session not found" });

    session.status = "cancelled";
    await session.save();

    res.json({ msg: "Session cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
