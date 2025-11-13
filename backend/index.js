const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");

// ✅ Load environment variables & connect DB
dotenv.config();
connectDB();

// ✅ Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

// ✅ Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

// ✅ Socket Authentication Middleware (JWT)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// ✅ Socket Events
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user.id);

  // Join a session room
  socket.on("join-session", (sessionId) => {
    socket.join(sessionId);
    socket.to(sessionId).emit("user-joined", socket.user.id);
  });

  // Chat messages (real-time)
  socket.on("chat-message", ({ sessionId, text }) => {
    io.to(sessionId).emit("chat-message", {
      sender: socket.user.id,
      text,
      time: new Date(),
    });
  });

  // WebRTC signaling (for video/audio)
  socket.on("signal", ({ sessionId, data }) => {
    socket.to(sessionId).emit("signal", { from: socket.user.id, data });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.user.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
