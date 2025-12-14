import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import UserDashboard from "./pages/UserDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import SessionRoom from "./components/SessionRoom";

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

        {/* Therapy Session Room */}
        <Route path="/session/:id" element={<SessionRoomWrapper />} />
      </Routes>
    </Router>
  );
}
