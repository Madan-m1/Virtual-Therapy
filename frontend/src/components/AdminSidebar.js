import { Link } from "react-router-dom";

export default function AdminSidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-5">
      <h2 className="text-xl mb-6">Admin Panel</h2>

      <nav className="space-y-3">
        <Link to="/admin/dashboard" className="block hover:text-gray-300">Dashboard</Link>
        <Link to="/admin/users" className="block hover:text-gray-300">Users</Link>
        <Link to="/admin/therapists" className="block hover:text-gray-300">Therapists</Link>
        <Link to="/admin/sessions" className="block hover:text-gray-300">Sessions</Link>
        <Link to="/admin/analytics" className="block hover:text-gray-300">Analytics</Link>
      </nav>
    </div>
  );
}