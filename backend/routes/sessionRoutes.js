const express = require("express");
const router = express.Router();
const {
  bookSession,
  getTherapistSessions,
  getUserSessions,
  cancelSession,
} = require("../controllers/sessionController");

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.post("/book", auth, role(["user"]), bookSession);
router.get("/therapist", auth, role(["therapist"]), getTherapistSessions);
router.get("/user", auth, role(["user"]), getUserSessions);
router.put("/cancel/:id", auth, cancelSession);

module.exports = router;
