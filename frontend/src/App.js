import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import UserDashboard from "./pages/UserDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSessions from "./pages/AdminSessions";
import Resources from "./pages/Resources"; // ✅ ADDED

import SessionRoom from "./components/SessionRoom";
import AdminRoute from "./components/AdminRoute";

// Wrapper for SessionRoom to access :id param
function SessionRoomWrapper() {
  const { id } = useParams();
  return <SessionRoom sessionId={id} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Dashboards */}
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/therapist/dashboard" element={<TherapistDashboard />} />

        {/* Resources Page */}
        <Route path="/resources" element={<Resources />} /> {/* ✅ INTEGRATED */}

        {/* Protected Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/sessions"
          element={
            <AdminRoute>
              <AdminSessions />
            </AdminRoute>
          }
        />

        {/* Therapy Session Room */}
        <Route path="/session/:id" element={<SessionRoomWrapper />} />
      </Routes>
    </Router>
  );
}
