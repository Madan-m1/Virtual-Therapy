// frontend/src/pages/TherapistDashboard.js
import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

// Helpers (same as in UserDashboard – can be moved to shared utils later)
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

function formatCountdown(target, now) {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

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

export default function TherapistDashboard() {
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  // Auto-update time every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    API.get("/sessions/therapist")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  const upcomingAndLive = sessions.filter((s) => {
    const t = computeTiming(s, now);
    return (t.state === "upcoming" || t.state === "live") && s.status !== "cancelled";
  });

  const historySessions = sessions.filter((s) => {
    const t = computeTiming(s, now);
    return t.state === "expired" || s.status === "cancelled";
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <Navbar userRole="therapist" />

      <div className="max-w-5xl mx-auto p-6">
        {/* UPCOMING & LIVE APPOINTMENTS */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            🩺 Upcoming & Live Appointments
          </h2>

          {upcomingAndLive.length === 0 ? (
            <p className="text-gray-500">No upcoming appointments.</p>
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
                      <b>Patient:</b> {s.user?.name}
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

        {/* HISTORY */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            📜 Appointment History
          </h2>

          {historySessions.length === 0 ? (
            <p className="text-gray-500">No past appointments.</p>
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
                      <b>Patient:</b> {s.user?.name}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RESOURCES LINK */}
        <div className="mt-8 text-center">
          <Link 
            to="/resources" 
            className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition duration-300 shadow-md"
          >
            📚 Access Therapy Resources
          </Link>
          <p className="mt-2 text-gray-600">
            Find helpful materials, worksheets, and guides for your sessions.
          </p>
        </div>
      </div>
    </div>
  );
}