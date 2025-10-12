import { useNavigate } from "react-router-dom";

export default function Navbar({ userRole }) {
  const navigate = useNavigate();

  return (
    <div className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <h1 className="font-semibold text-lg">🧠 Virtual Therapy Platform</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm capitalize">{userRole} Dashboard</span>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
          className="bg-red-500 px-3 py-1 rounded-md text-sm hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
