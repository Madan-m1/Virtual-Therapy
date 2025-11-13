import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function TherapistDashboard() {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/sessions/therapist")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <Navbar userRole="therapist" />

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            🩺 Upcoming Appointments
          </h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No appointments scheduled yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                >
                  <p><b>Patient:</b> {s.user?.name}</p>
                  <p><b>Date:</b> {new Date(s.date).toDateString()}</p>
                  <p><b>Time:</b> {s.timeSlot}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-sm ${
                      s.status === "booked"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.status.toUpperCase()}
                  </span>

                  {/* ✅ Join Session Button */}
                  <button
                    onClick={() => navigate(`/session/${s._id}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded mt-3 w-full hover:bg-blue-700 transition"
                  >
                    Join Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
