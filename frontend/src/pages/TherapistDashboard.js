import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar"; // ✅ Make sure path is correct

export default function TherapistDashboard() {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/sessions/therapist")
      .then((res) => setSessions(res.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ✅ Navbar added */}
      <Navbar userRole="therapist" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Therapist Dashboard</h1>
        </div>

        {sessions.length === 0 ? (
          <p>No appointments yet</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s._id}
              className="border p-3 bg-white rounded mb-3 shadow-sm"
            >
              <p>
                <b>Patient:</b> {s.user?.name || "Unknown"}
              </p>
              <p>
                <b>Date:</b> {new Date(s.date).toDateString()}
              </p>
              <p>
                <b>Time:</b> {s.timeSlot}
              </p>
              <p>
                <b>Status:</b> {s.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
