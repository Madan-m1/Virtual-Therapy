import { useEffect, useState } from "react";
import API from "../services/api";

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    API.get("/admin/sessions").then(res => setSessions(res.data));
  }, []);

  // OPTION 1: Using the original endpoint from your new code
  // const cancelSession = (id) => {
  //   API.put(`/admin/cancel-session/${id}`).then(() =>
  //     setSessions(s =>
  //       s.map(x =>
  //         x._id === id ? { ...x, status: "cancelled" } : x
  //       )
  //     )
  //   );
  // };

  // OPTION 2: Using the RESTful endpoint (currently active)
  const cancelSession = (id) => {
    // Using the new endpoint with better error handling
    API.put(`/admin/sessions/cancel/${id}`)
      .then(() => {
        setSessions(s =>
          s.map(x =>
            x._id === id ? { ...x, status: "cancelled" } : x
          )
        );
      });
  };

  // OPTION 3: More robust version with error handling
  // const cancelSession = (id) => {
  //   API.put(`/admin/sessions/cancel/${id}`) // You could also use `/admin/cancel-session/${id}`
  //     .then(() => {
  //       setSessions(s =>
  //         s.map(x =>
  //           x._id === id ? { ...x, status: "cancelled" } : x
  //         )
  //       );
  //       // Optional: Show success message
  //       alert("Session cancelled successfully!");
  //     })
  //     .catch(error => {
  //       console.error("Failed to cancel session:", error);
  //       // Optional: Show error message
  //       alert("Failed to cancel session. Please try again.");
  //     });
  // };

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">All Sessions</h1>

      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">User</th>
            <th className="p-2">Therapist</th>
            <th className="p-2">Date</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {sessions.map(s => (
            <tr key={s._id} className="border-t text-center">
              <td className="p-2">{s.user?.name}</td>
              <td className="p-2">{s.therapist?.name}</td>
              <td className="p-2">{new Date(s.scheduledAt).toLocaleString()}</td>
              <td className="p-2">{s.status}</td>
              <td className="p-2">
                {/* Using the improved condition from the second code */}
                {s.status !== "cancelled" && (
                  <button
                    onClick={() => cancelSession(s._id)}
                    className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 transition-colors"
                  >
                    Cancel Session
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}