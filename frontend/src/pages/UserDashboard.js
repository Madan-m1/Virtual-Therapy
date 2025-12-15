// frontend/src/pages/UserDashboard.js
import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

/**
 * Parse "01:40AM" or "10:00 PM" into { hours, minutes }
 */
function parseClockLabel(label) {
  if (!label) return null;
  const match = label.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Given a session object with date + timeSlot, compute timing state.
 * Returns { state: 'upcoming' | 'live' | 'expired', start, end }
 */
function computeTiming(session, now = new Date()) {
  try {
    const dateObj = new Date(session.date);
    const [rawStart, rawEnd] = (session.timeSlot || "").split("-");

    const startClock = parseClockLabel(rawStart);
    const endClock = parseClockLabel(rawEnd);

    if (!startClock || !endClock) {
      return { state: "upcoming" };
    }

    const start = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      startClock.hours,
      startClock.minutes,
      0
    );

    const end = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      endClock.hours,
      endClock.minutes,
      0
    );

    if (now < start) return { state: "upcoming", start, end };
    if (now >= start && now <= end) return { state: "live", start, end };
    return { state: "expired", start, end };
  } catch {
    return { state: "upcoming" };
  }
}

/**
 * Format time difference into human readable countdown.
 */
function formatCountdown(target, now) {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Map timing + DB status into final UI flags.
 */
function getSessionUI(session, now) {
  const timing = computeTiming(session, now);

  let label = session.status?.toUpperCase() || "BOOKED";
  let badgeClass = "bg-gray-100 text-gray-700";
  let canJoin = false;
  let countdownLabel = "";

  if (session.status === "cancelled") {
    label = "CANCELLED";
    badgeClass = "bg-red-100 text-red-600";
    canJoin = false;
  } else {
    if (timing.state === "live") {
      label = "LIVE";
      badgeClass = "bg-green-100 text-green-700";
      canJoin = true;
      if (timing.end) {
        countdownLabel = "Ends in " + formatCountdown(timing.end, now);
      }
    } else if (timing.state === "upcoming") {
      label = "UPCOMING";
      badgeClass = "bg-blue-100 text-blue-700";
      // decide if you want early joining; here we allow it:
      canJoin = true;
      if (timing.start) {
        countdownLabel = "Starts in " + formatCountdown(timing.start, now);
      }
    } else if (timing.state === "expired") {
      label = "EXPIRED";
      badgeClass = "bg-gray-200 text-gray-500";
      canJoin = false;
      countdownLabel = "Session ended";
    }
  }

  return { label, badgeClass, canJoin, timing, countdownLabel };
}

export default function UserDashboard() {
  const [sessions, setSessions] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistId, setTherapistId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [now, setNow] = useState(new Date());
  // NEW: tool selection state for dropdown
  const [toolSelection, setToolSelection] = useState("");

  const navigate = useNavigate();

  // Auto-refresh "now" every 30 seconds so countdowns update
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Load user sessions
  useEffect(() => {
    API.get("/sessions/user")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  // Load therapists list
  useEffect(() => {
    API.get("/auth/therapists")
      .then((res) => setTherapists(res.data))
      .catch((err) => console.error("Error fetching therapists", err));
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!therapistId) return alert("Please select a therapist");

    try {
      await API.post("/sessions/book", { therapistId, date, timeSlot });
      alert("Session booked successfully!");

      const res = await API.get("/sessions/user");
      setSessions(res.data);

      setTherapistId("");
      setDate("");
      setTimeSlot("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error booking session");
    }
  };

  // Handle tool dropdown change
  const onToolChange = (e) => {
    const val = e.target.value;
    setToolSelection(val);
    if (!val) return;
    // navigate to specific tool pages
    if (val === "emotion-check") {
      navigate("/emotion-check");
    }
    // reset selection visually
    setToolSelection("");
  };

  // Split into upcoming/live vs history
  const upcomingAndLive = sessions.filter((s) => {
    const t = computeTiming(s, now);
    return (t.state === "upcoming" || t.state === "live") && s.status !== "cancelled";
  });

  const historySessions = sessions.filter((s) => {
    const t = computeTiming(s, now);
    return t.state === "expired" || s.status === "cancelled";
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Navbar userRole="user" />

      <div className="max-w-5xl mx-auto p-6">
        {/* Top Bar with Tools and Resources */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Tools Dropdown */}
          <div className="flex items-center">
            <label className="mr-3 text-gray-600 font-medium">Tools</label>
            <select
              value={toolSelection}
              onChange={onToolChange}
              className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select tool</option>
              <option value="emotion-check">Emotion Check</option>
              {/* future tools can be added here */}
            </select>
          </div>

          {/* Resources Quick Link */}
          <Link 
            to="/resources" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            📚 View Mental Health Resources
          </Link>
        </div>

        {/* Booking Section */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            📅 Book a Therapy Session
          </h2>
          <form
            onSubmit={handleBook}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <select
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="">Select Therapist</option>
              {therapists.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — {t.specialization}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
              required
            />

            <input
              placeholder="Time Slot (e.g. 10:00 AM - 10:30 AM)"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
              required
            />

            <button className="bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 transition sm:col-span-3">
              Confirm Booking
            </button>
          </form>
        </div>

        {/* UPCOMING + LIVE SESSIONS */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            ⏳ Upcoming & Live Sessions
          </h2>

          {upcomingAndLive.length === 0 ? (
            <p className="text-gray-500">No upcoming sessions.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAndLive.map((s) => {
                const { label, badgeClass, canJoin, countdownLabel } =
                  getSessionUI(s, now);

                return (
                  <div
                    key={s._id}
                    className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <p>
                      <b>Therapist:</b> {s.therapist?.name}
                    </p>
                    <p>
                      <b>Date:</b> {new Date(s.date).toDateString()}
                    </p>
                    <p>
                      <b>Time:</b> {s.timeSlot}
                    </p>

                    <span
                      className={`inline-block mt-2 px-2 py-1 rounded text-sm ${badgeClass}`}
                    >
                      {label}
                    </span>

                    {countdownLabel && (
                      <p className="mt-1 text-xs text-gray-500">
                        ⏱ {countdownLabel}
                      </p>
                    )}

                    <button
                      onClick={() =>
                        canJoin && navigate(`/session/${s._id}`)
                      }
                      disabled={!canJoin}
                      className={`bg-blue-600 text-white px-3 py-1 rounded mt-3 w-full transition ${
                        canJoin
                          ? "hover:bg-blue-700"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {label === "LIVE" ? "Join Now" : "Join Session"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HISTORY SESSIONS */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            🗂️ Session History
          </h2>

          {historySessions.length === 0 ? (
            <p className="text-gray-500">No past sessions yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {historySessions.map((s) => {
                const { label, badgeClass } = getSessionUI(s, now);

                return (
                  <div
                    key={s._id}
                    className="border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <p>
                      <b>Therapist:</b> {s.therapist?.name}
                    </p>
                    <p>
                      <b>Date:</b> {new Date(s.date).toDateString()}
                    </p>
                    <p>
                      <b>Time:</b> {s.timeSlot}
                    </p>

                    <span
                      className={`inline-block mt-2 px-2 py-1 rounded text-sm ${badgeClass}`}
                    >
                      {label}
                    </span>

                    {/* No join button for history */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}