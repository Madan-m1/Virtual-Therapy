import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function AdminDashboard() {
  const [therapists, setTherapists] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");
  const navigate = useNavigate();

  const fetchAllUsers = () => {
    setUsersLoading(true);
    API.get("/admin/users")
      .then(res => {
        setUsers(res.data);
        setUsersError("");
      })
      .catch(err => {
        console.error("Failed to fetch users:", err);
        setUsersError("Failed to load users. Please try again.");
      })
      .finally(() => setUsersLoading(false));
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/");
      return;
    }

    // Fetch pending therapists
    setLoading(true);
    API.get("/admin/pending-therapists")
      .then(res => {
        setTherapists(res.data);
        setError("");
      })
      .catch(err => {
        console.error("Failed to fetch pending therapists:", err);
        setError("Failed to load pending therapists. Please try again.");
      })
      .finally(() => setLoading(false));

    // Fetch all users
    fetchAllUsers();
  }, [navigate]);

  const approveTherapist = (id) => {
    API.put(`/admin/approve/${id}`)
      .then(() => {
        // Update local state for immediate UI feedback
        setTherapists(therapists.filter(t => t._id !== id));
        
        // Refetch all users from backend to get updated status
        fetchAllUsers();
      })
      .catch(err => {
        console.error("Failed to approve therapist:", err);
        alert("Failed to approve therapist. Please try again.");
      });
  };

  const blockUser = (id) => {
    if (window.confirm("Are you sure you want to block this user?")) {
      API.put(`/admin/block/${id}`)
        .then(() => {
          // Update local state immediately
          setUsers(users.map(user =>
            user._id === id ? { ...user, isBlocked: true } : user
          ));
        })
        .catch(err => {
          console.error("Failed to block user:", err);
          alert("Failed to block user. Please try again.");
        });
    }
  };

  const unblockUser = (id) => {
    if (window.confirm("Are you sure you want to unblock this user?")) {
      API.put(`/admin/unblock/${id}`)
        .then(() => {
          // Update local state immediately
          setUsers(users.map(user =>
            user._id === id ? { ...user, isBlocked: false } : user
          ));
        })
        .catch(err => {
          console.error("Failed to unblock user:", err);
          alert("Failed to unblock user. Please try again.");
        });
    }
  };

  // ✅ Updated Status Logic
  const getStatus = (user) => {
    if (user.role === "admin") return "Admin";
    if (user.isBlocked) return "Blocked";
    if (user.role === "therapist" && !user.approved) return "Pending";
    if (user.role === "therapist" && user.approved) return "Approved";
    return "Active";
  };

  return (
    <div className="p-6">
      {/* Resources Link */}
      <div className="mb-6">
        <Link 
          to="/resources" 
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Resources
        </Link>
      </div>

      {/* Pending Therapists */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold mb-6">Pending Therapists</h1>

        {loading && <p className="text-gray-500">Loading pending therapists...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {!loading && therapists.length === 0 && (
          <p className="text-gray-500">No pending therapists to approve.</p>
        )}

        {therapists.map(t => (
          <div key={t._id} className="border p-4 rounded mb-4">
            <p><b>Name:</b> {t.name}</p>
            <p><b>Email:</b> {t.email}</p>
            {t.specialization && <p><b>Specialization:</b> {t.specialization}</p>}
            <button
              onClick={() => approveTherapist(t._id)}
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        ))}
      </div>

      {/* All Users */}
      <div>
        <h1 className="text-2xl font-bold mb-6">All Users</h1>

        {usersLoading && <p className="text-gray-500">Loading users...</p>}
        {usersError && <p className="text-red-500 mb-4">{usersError}</p>}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map(user => {
                  // Get user status using updated logic
                  const status = getStatus(user);
                  
                  return (
                    <tr
                      key={user._id}
                      className={`border-t hover:bg-gray-50 ${user.isBlocked ? "bg-red-50" : ""}`}
                    >
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4">{user.email}</td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>

                      {/* ✅ Updated Status Badge with new logic */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            status === "Pending"
                              ? "bg-yellow-200 text-yellow-800"
                              : status === "Approved"
                              ? "bg-green-200 text-green-800"
                              : status === "Active"
                              ? "bg-blue-200 text-blue-800"
                              : status === "Blocked"
                              ? "bg-red-200 text-red-800"
                              : "bg-purple-200 text-purple-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {user.role !== "admin" && (
                          user.isBlocked ? (
                            <button
                              onClick={() => unblockUser(user._id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => blockUser(user._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Block
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}