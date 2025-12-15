// backend/server.js (FINAL – integrated)

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
const adminRoutes = require("./routes/adminRoutes");
const resourceRoutes = require("./routes/resourceRoutes");

// ✅ NEW: Sentiment analysis routes
const sentimentRoutes = require("./routes/sentimentRoutes");

// Load environment variables & connect DB
dotenv.config();
connectDB();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/resources", resourceRoutes);

// ✅ NEW: Sentiment API
// POST /api/sentiment/analyze
app.use("/api/sentiment", sentimentRoutes);

// Create HTTP + Socket.IO server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://virtual-therapy-five.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

// 🔐 Socket Authentication Middleware (JWT)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// 🔌 Socket Events
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.user.id);

  // Join therapy session room
  socket.on("join-session", (sessionId) => {
    socket.join(sessionId);
    socket.to(sessionId).emit("user-joined", socket.user.id);
  });

  // 💬 Chat messages
  socket.on("chat-message", ({ sessionId, text, sender }) => {
    io.to(sessionId).emit("chat-message", {
      sender: sender || socket.user.id,
      text,
      time: new Date(),
    });
  });

  // 📡 WebRTC signaling
  socket.on("signal", ({ sessionId, data }) => {
    socket.to(sessionId).emit("signal", {
      from: socket.user.id,
      data,
    });
  });

  // 📞 End call
  socket.on("end-call", ({ sessionId }) => {
    console.log("📞 Call ended by:", socket.user.id);
    socket.to(sessionId).emit("end-call", { by: socket.user.id });
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.user.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
