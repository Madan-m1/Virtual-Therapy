const express = require("express");
const router = express.Router();
const {
  bookSession,
  getTherapistSessions,
  getUserSessions,
  cancelSession,
} = require("../controllers/sessionController");

const authMiddleware = require("../middleware/authMiddleware");
const roleAuth = require("../middleware/roleMiddleware");

// User books a session
router.post("/book", authMiddleware, roleAuth(["user"]), bookSession);

// Therapist views their sessions
router.get("/therapist", authMiddleware, roleAuth(["therapist"]), getTherapistSessions);

// User views their sessions
router.get("/user", authMiddleware, roleAuth(["user"]), getUserSessions);

// Cancel a session
router.put("/cancel/:id", authMiddleware, cancelSession);

module.exports = router;
