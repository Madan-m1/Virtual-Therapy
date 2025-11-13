import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import SessionRoom from "./components/SessionRoom";
import UserDashboard from "./pages/UserDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function SessionRoomWrapper() {
  const { id } = useParams();
  return <SessionRoom sessionId={id} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/therapist/dashboard" element={<TherapistDashboard />} />
        <Route path="/session/:id" element={<SessionRoomWrapper />} />
      </Routes>
    </Router>
  );
}
