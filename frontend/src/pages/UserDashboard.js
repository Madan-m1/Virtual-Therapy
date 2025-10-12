import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar"; // ✅ make sure this path is correct

export default function UserDashboard() {
  const [sessions, setSessions] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistId, setTherapistId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const navigate = useNavigate();

  // Fetch user sessions
  useEffect(() => {
    API.get("/sessions/user")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  // Fetch available therapists
  useEffect(() => {
    API.get("/auth/therapists")
      .then((res) => setTherapists(res.data))
      .catch((err) => console.error("Error fetching therapists", err));
  }, []);

  // Handle booking
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
    <div className="bg-gray-50 min-h-screen">
      {/* ✅ Navbar added here */}
      <Navbar userRole="user" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">User Dashboard</h1>
        </div>

        {/* Session Booking Section */}
        <form
          onSubmit={handleBook}
          className="bg-white p-4 rounded shadow w-96 mb-6 flex flex-col gap-3"
        >
          <h2 className="text-lg font-semibold mb-2">Book a Session</h2>

          {/* Therapist Dropdown */}
          <select
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value)}
            className="border p-2 rounded"
            required
          >
            <option value="">Select a Therapist</option>
            {therapists.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} — {t.specialization} ({t.experience} yrs)
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <input
            placeholder="Time Slot (e.g., 10:00 AM - 10:30 AM)"
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <button className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
            Book Session
          </button>
        </form>

        {/* Display User Sessions */}
        <h2 className="text-xl font-semibold mb-3">Your Sessions</h2>
        {sessions.length === 0 ? (
          <p>No sessions booked yet</p>
        ) : (
          sessions.map((s) => (
            <div key={s._id} className="border p-3 bg-white rounded mb-3 shadow">
              <p><b>Therapist:</b> {s.therapist?.name}</p>
              <p><b>Date:</b> {new Date(s.date).toDateString()}</p>
              <p><b>Time:</b> {s.timeSlot}</p>
              <p><b>Status:</b> {s.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
