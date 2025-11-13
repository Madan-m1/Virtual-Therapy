import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function UserDashboard() {
  const [sessions, setSessions] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistId, setTherapistId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/sessions/user")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

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
      window.location.reload();
    } catch (err) {
      alert("Error booking session");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Navbar userRole="user" />

      <div className="max-w-5xl mx-auto p-6">
        {/* Booking Section */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            📅 Book a Therapy Session
          </h2>
          <form onSubmit={handleBook} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Session History Section */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">🗂️ Your Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No sessions booked yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                >
                  <p><b>Therapist:</b> {s.therapist?.name}</p>
                  <p><b>Date:</b> {new Date(s.date).toDateString()}</p>
                  <p><b>Time:</b> {s.timeSlot}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-sm ${
                      s.status === "booked"
                        ? "bg-green-100 text-green-700"
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
