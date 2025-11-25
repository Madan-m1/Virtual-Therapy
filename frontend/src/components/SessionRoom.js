// frontend/src/components/SessionRoom.js
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// Metered.ca TURN servers configuration
const ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "56d6eb0d549719f538d2eebf",
    credential: "NXJEOEspP5AbW6Qh",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "56d6eb0d549719f538d2eebf",
    credential: "NXJEOEspP5AbW6Qh",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "56d6eb0d549719f538d2eebf",
    credential: "NXJEOEspP5AbW6Qh",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "56d6eb0d549719f538d2eebf",
    credential: "NXJEOEspP5AbW6Qh",
  },
];

export default function SessionRoom({ sessionId }) {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [typing, setTyping] = useState(false);

  // Call state
  const [callStarted, setCallStarted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [connected, setConnected] = useState(false);

  // Local controls
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mirrorLocal, setMirrorLocal] = useState(false);

  // Advanced: screen share, recording, stats
  const [sharingScreen, setSharingScreen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [bitrate, setBitrate] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const pcRef = useRef(null);             // RTCPeerConnection
  const localStreamRef = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const typingTimer = useRef(null);
  const statsTimer = useRef(null);
  const callTimer = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // My user id (from token or localStorage) for chat alignment
  const myIdRef = useRef(localStorage.getItem("userId") || null);

  // Auto-scroll chat box
  useEffect(() => {
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  // Socket + signaling setup
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Decode JWT to get user id if not already stored
    if (token && !myIdRef.current) {
      try {
        const payloadBase64 = token.split(".")[1];
        const payloadJson = atob(
          payloadBase64.replace(/-/g, "+").replace(/_/g, "/")
        );
        const payload = JSON.parse(payloadJson);
        if (payload.id) {
          myIdRef.current = payload.id;
          localStorage.setItem("userId", payload.id);
        }
      } catch (e) {
        console.warn("Failed to decode JWT for user id", e);
      }
    }

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-session", sessionId);
    });

    // Chat: server is the single source of truth (no local duplication)
    socketRef.current.on("chat-message", (m) => {
      setMessages((prev) => [...prev, m]);
    });

    socketRef.current.on("typing", () => {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1400);
    });

    // WebRTC signaling from server
    socketRef.current.on("signal", async ({ data }) => {
      if (!data || !data.type) return;

      if (data.type === "offer") {
        // Incoming offer: we act as callee
        setIncomingCall(true);
        try {
          // Ensure we have local media
          if (!localStreamRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            });
            localStreamRef.current = stream;
            if (localVideo.current) localVideo.current.srcObject = stream;
          }

          if (!pcRef.current) {
            createPeerConnection(localStreamRef.current);
          }

          const pc = pcRef.current;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socketRef.current.emit("signal", {
            sessionId,
            data: { type: "answer", sdp: pc.localDescription },
          });

          setCallStarted(true);
          setIncomingCall(false);
          startCallTimers();
          startStatsPolling();
        } catch (err) {
          console.error("Error handling incoming offer", err);
          setIncomingCall(false);
        }
      } else if (data.type === "answer") {
        // Our offer got an answer
        try {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          console.error("Error handling answer", err);
        }
      } else if (data.type === "candidate") {
        try {
          const pc = pcRef.current;
          if (!pc || !data.candidate) return;
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding ICE candidate", err);
        }
      }
    });

    // Call ended by remote
    socketRef.current.on("end-call", () => {
      safeEndCleanup();
    });

    socketRef.current.on("peer-left", () => {
      safeEndCleanup();
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    const beforeUnload = () => {
      try {
        socketRef.current?.emit("leave-session", { sessionId });
      } catch {}
      safeEndCleanup();
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      socketRef.current?.disconnect();
      safeEndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Create a native RTCPeerConnection
  function createPeerConnection(stream) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Remote track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = remoteStream;
      }
      setConnected(true);
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          socketRef.current?.emit("signal", {
            sessionId,
            data: { type: "candidate", candidate: event.candidate },
          });
        } catch {}
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        safeEndCleanup();
      }
    };

    pcRef.current = pc;
  }

  // Start call (caller)
  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      localStreamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      if (!pcRef.current) {
        createPeerConnection(stream);
      }

      const pc = pcRef.current;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit("signal", {
        sessionId,
        data: { type: "offer", sdp: pc.localDescription },
      });

      setCallStarted(true);
      setIncomingCall(false);
      startCallTimers();
      startStatsPolling();
    } catch (err) {
      console.error("startCall error:", err);
      alert("Camera / Microphone permission required.");
    }
  }

  // End call: notify server and cleanup
  function endCall() {
    try {
      socketRef.current?.emit("end-call", { sessionId });
    } catch (err) {
      console.warn("end-call emit failed", err);
    }
    safeEndCleanup();
  }

  // Cleanup: close pc, stop tracks, clear refs
  function safeEndCleanup() {
    try {
      const pc = pcRef.current;
      if (pc) {
        try {
          pc.getSenders().forEach((s) => {
            try {
              s.track?.stop();
            } catch {}
          });
        } catch {}
        try {
          pc.close();
        } catch {}
      }
    } catch {}

    // Stop local tracks
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
      }
    } catch {}

    stopScreenShareLocal();
    if (recording) stopRecording();

    try {
      if (localVideo.current) localVideo.current.srcObject = null;
      if (remoteVideo.current) remoteVideo.current.srcObject = null;
    } catch {}

    pcRef.current = null;
    localStreamRef.current = null;

    stopCallTimers();
    stopStatsPolling();

    setCallStarted(false);
    setIncomingCall(false);
    setConnected(false);
    setMuted(false);
    setCameraOff(false);
    setSharingScreen(false);
    setRecording(false);
    setCallSeconds(0);
    setBitrate(null);
  }

  // Replace tracks (video/audio) using RTCRtpSender.replaceTrack
  async function replaceVideoTrack(newTrack) {
    try {
      const pc = pcRef.current;
      if (pc && typeof pc.getSenders === "function") {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender && typeof sender.replaceTrack === "function") {
          await sender.replaceTrack(newTrack);
        }
      }
    } catch (err) {
      console.warn("replaceVideoTrack error", err);
    }
  }

  async function replaceAudioTrack(newTrack) {
    try {
      const pc = pcRef.current;
      if (pc && typeof pc.getSenders === "function") {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "audio");
        if (sender && typeof sender.replaceTrack === "function") {
          await sender.replaceTrack(newTrack);
        }
      }
    } catch (err) {
      console.warn("replaceAudioTrack error", err);
    }
  }

  // Mute toggle
  function toggleMute() {
    try {
      const a = localStreamRef.current?.getAudioTracks()?.[0];
      if (!a) return;
      a.enabled = !a.enabled;
      setMuted(!a.enabled);
      replaceAudioTrack(a);
    } catch (err) {
      console.warn("toggleMute error", err);
    }
  }

  // Camera toggle
  async function toggleCamera() {
    try {
      const stream = localStreamRef.current;
      if (!stream) return;

      const vTrack = stream.getVideoTracks()?.[0];

      // Turn OFF camera
      if (!cameraOff && vTrack) {
        try {
          vTrack.stop();
        } catch {}
        try {
          stream.getVideoTracks().forEach((t) => {
            try {
              stream.removeTrack(t);
            } catch {}
          });
        } catch {}

        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blackTrack = canvas.captureStream(1).getVideoTracks()[0];

        try {
          stream.addTrack(blackTrack);
        } catch {}

        if (localVideo.current) localVideo.current.srcObject = stream;
        await replaceVideoTrack(blackTrack);
        setCameraOff(true);
        return;
      }

      // Turn ON camera
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      const newTrack = cam.getVideoTracks()[0];

      try {
        stream.getVideoTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        stream.getVideoTracks().forEach((t) => {
          try {
            stream.removeTrack(t);
          } catch {}
        });
      } catch {}

      try {
        stream.addTrack(newTrack);
      } catch {}

      if (localVideo.current) localVideo.current.srcObject = stream;
      await replaceVideoTrack(newTrack);
      setCameraOff(false);
    } catch (err) {
      console.error("toggleCamera error", err);
    }
  }

  // Screen share
  async function startScreenShare() {
    try {
      if (sharingScreen) return;
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = display.getVideoTracks()[0];

      const stream = localStreamRef.current;
      if (!stream) return;

      try {
        stream.getVideoTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
      } catch {}

      stream.addTrack(screenTrack);

      if (localVideo.current) localVideo.current.srcObject = stream;
      await replaceVideoTrack(screenTrack);
      setSharingScreen(true);

      screenTrack.onended = () => stopScreenShareLocal();
    } catch (err) {
      console.error("startScreenShare error", err);
    }
  }

  async function stopScreenShareLocal() {
    try {
      const stream = localStreamRef.current;
      if (!stream) return;

      try {
        stream.getVideoTracks().forEach((t) => {
          if (t.label?.toLowerCase().includes("screen")) {
            try {
              t.stop();
            } catch {}
          }
        });
      } catch {}

      try {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newTrack = cam.getVideoTracks()[0];
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
        stream.addTrack(newTrack);

        if (localVideo.current) localVideo.current.srcObject = stream;
        await replaceVideoTrack(newTrack);
      } catch {
        // fallback: black frame
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blackTrack = canvas.captureStream(1).getVideoTracks()[0];
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
        stream.addTrack(blackTrack);
        if (localVideo.current) localVideo.current.srcObject = stream;
        await replaceVideoTrack(blackTrack);
      }
    } catch (err) {
      console.warn("stopScreenShareLocal error", err);
    } finally {
      setSharingScreen(false);
    }
  }

  // Recording
  function startRecording() {
    try {
      if (!localStreamRef.current) return;
      recordedChunksRef.current = [];
      const mr = new MediaRecorder(localStreamRef.current, {
        mimeType: "video/webm; codecs=vp9",
      });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session_${sessionId || "rec"}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      mr.start(1000);
      setRecording(true);
    } catch (err) {
      console.warn("startRecording failed", err);
    }
  }

  function stopRecording() {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn("stopRecording failed", err);
    } finally {
      setRecording(false);
    }
  }

  // Timers & stats
  function startCallTimers() {
    setCallSeconds(0);
    clearInterval(callTimer.current);
    callTimer.current = setInterval(
      () => setCallSeconds((s) => s + 1),
      1000
    );
  }

  function stopCallTimers() {
    clearInterval(callTimer.current);
    callTimer.current = null;
  }

  function startStatsPolling() {
    clearInterval(statsTimer.current);
    statsTimer.current = setInterval(async () => {
      try {
        const pc = pcRef.current;
        if (!pc || typeof pc.getStats !== "function") return;
        const stats = await pc.getStats();
        let outBytes = 0;
        stats.forEach((report) => {
          if (report.type === "outbound-rtp" && report.kind === "video") {
            outBytes = report.bytesSent || 0;
          }
        });
        if (outBytes) setBitrate(Math.round(outBytes));
      } catch {}
    }, 2000);
  }

  function stopStatsPolling() {
    clearInterval(statsTimer.current);
    statsTimer.current = null;
    setBitrate(null);
  }

  // Chat send / typing (WhatsApp-style: only server pushes messages)
  function sendMessage(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      socketRef.current?.emit("chat-message", {
        sessionId,
        text: msg,
      });
    } catch {}
    setMsg("");
  }

  function onTypingChange(e) {
    setMsg(e.target.value);
    try {
      socketRef.current?.emit("typing", { sessionId });
    } catch {}
  }

  // UI helpers
  const primaryBtn =
    "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-500 to-blue-600 text-white";
  const dangerBtn =
    "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-r from-red-500 to-red-600 text-white";
  const warnBtn =
    "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-yellow-400 text-black";
  const smallBtn =
    "px-3 py-1 rounded-full shadow-sm bg-white/70 border border-gray-200";
  const localFloating =
    "absolute bottom-6 right-6 w-40 h-28 rounded-lg shadow-lg border-2 border-white z-40 overflow-hidden";

  function fmtTime(s) {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Video & Controls */}
        <div className="relative bg-white/40 backdrop-blur-lg border border-white/30 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            {!callStarted ? (
              <button onClick={startCall} className={primaryBtn}>
                🎥 Start Call
              </button>
            ) : (
              <button onClick={endCall} className={dangerBtn}>
                🔴 End Call
              </button>
            )}

            {callStarted && (
              <>
                <button onClick={toggleMute} className={warnBtn}>
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button onClick={toggleCamera} className={primaryBtn}>
                  {cameraOff ? "Turn Camera On" : "Turn Camera Off"}
                </button>
                <button
                  onClick={() =>
                    sharingScreen ? stopScreenShareLocal() : startScreenShare()
                  }
                  className={smallBtn}
                >
                  {sharingScreen ? "Stop Share" : "Share Screen"}
                </button>
                <button
                  onClick={() =>
                    recording ? stopRecording() : startRecording()
                  }
                  className={smallBtn}
                >
                  {recording ? "Stop Rec" : "Record"}
                </button>
                <button
                  onClick={() => setMirrorLocal((m) => !m)}
                  className={smallBtn}
                >
                  {mirrorLocal ? "Mirror: On" : "Mirror: Off"}
                </button>
              </>
            )}
          </div>

          {incomingCall && !callStarted && (
            <div className="text-yellow-700 bg-yellow-100 p-2 rounded-lg text-center mb-4">
              Incoming call…
            </div>
          )}

          {/* Remote video */}
          <div className="rounded-2xl overflow-hidden bg-black/70 h-72 md:h-96 flex items-center justify-center">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {connected ? "Connected ✓" : "Waiting for participant…"}
            </p>
            <div className="text-xs text-gray-500">
              <span className="mr-3">Time: {fmtTime(callSeconds)}</span>
              <span>BytesSent: {bitrate ?? "-"}</span>
            </div>
          </div>

          {/* Local video */}
          <div className={callStarted ? localFloating : "w-full mt-4"}>
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: mirrorLocal ? "scaleX(-1)" : "none",
              }}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="bg-white rounded-2xl p-4 shadow-lg flex flex-col">
          <div
            id="chatBox"
            className="flex-1 overflow-auto mb-3 p-3 rounded-xl bg-gray-50 shadow-inner space-y-3"
          >
            {messages.map((m, i) => {
              const isMe =
                myIdRef.current && m.sender === myIdRef.current.toString();
              return (
                <div
                  key={i}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl shadow ${
                      isMe
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="text-gray-400 italic">Typing…</div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-3 items-center">
            <input
              value={msg}
              onChange={onTypingChange}
              placeholder="Type a message..."
              className="flex-1 border p-3 rounded-full focus:ring-2 focus:ring-blue-300 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow"
            >
              Send
            </button>
          </form>

          <div className="mt-3 text-xs text-gray-400 text-center">
            <span>Secure · Private · Encrypted (transport)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
