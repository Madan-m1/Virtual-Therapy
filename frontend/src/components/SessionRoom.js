// frontend/src/components/SessionRoom.js
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// FREE TURN server (DEV ONLY). Replace with Coturn / paid TURN in production.
const FREE_TURN = {
  urls: "turn:relay1.expressturn.com:3478",
  username: "efree",
  credential: "efree",
};

export default function SessionRoom({ sessionId }) {
  // UI / chat state
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [typing, setTyping] = useState(false);

  // call state
  const [callStarted, setCallStarted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [connected, setConnected] = useState(false);

  // local controls
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mirrorLocal, setMirrorLocal] = useState(false);

  // advanced features
  const [sharingScreen, setSharingScreen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [bitrate, setBitrate] = useState(null);

  // refs
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const pcRef = useRef(null); // underlying RTCPeerConnection (if available)
  const localStreamRef = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const typingTimer = useRef(null);
  const statsTimer = useRef(null);
  const callTimer = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // ICE servers
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }, FREE_TURN];

  // ----------------------------------------------------------------------------
  // Auto-scroll chat
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  // ----------------------------------------------------------------------------
  // Socket initialization and listeners
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-session", sessionId);
    });

    socketRef.current.on("chat-message", (m) => {
      setMessages((prev) => [...prev, m]);
    });

    socketRef.current.on("typing", () => {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1400);
    });

    // Signaling (offer/answer/ICE)
    socketRef.current.on("signal", ({ from, data }) => {
      // If peer exists just feed signal
      if (peerRef.current) {
        try {
          peerRef.current.signal(data);
        } catch (err) {
          console.warn("peer.signal error:", err);
        }
        return;
      }

      // incoming call -> get media and answer
      setIncomingCall(true);
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideo.current) localVideo.current.srcObject = stream;

          createPeer(false, stream, () => {
            // after peer created, apply incoming signal (offer)
            try {
              peerRef.current.signal(data);
            } catch (err) {
              console.warn("signal after createPeer", err);
            }
            setCallStarted(true);
            setIncomingCall(false);
            startCallTimers();
            startStatsPolling();
          });
        })
        .catch((err) => {
          console.error("getUserMedia failed for incoming call", err);
          setIncomingCall(false);
        });
    });

    socketRef.current.on("end-call", ({ by }) => {
      // safe cleanup (no peer.destroy call)
      endCleanupSafe();
    });

    socketRef.current.on("peer-left", ({ socketId }) => {
      endCleanupSafe();
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    // cleanup on unload
    const beforeUnload = () => {
      try {
        socketRef.current?.emit("leave-session", { sessionId });
      } catch {}
      endCleanupSafe();
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      socketRef.current?.disconnect();
      endCleanupSafe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ----------------------------------------------------------------------------
  // Create peer (initiator=true -> caller)
  // ----------------------------------------------------------------------------
  function createPeer(initiator, stream, onCreated) {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: { iceServers },
    });

    peer.on("signal", (signal) => {
      try {
        socketRef.current?.emit("signal", { sessionId, data: signal });
      } catch (err) {
        console.warn("emit signal failed", err);
      }
    });

    peer.on("stream", (remoteStream) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      setConnected(true);
    });

    peer.on("connect", () => {
      // capture underlying RTCPeerConnection instance for replaceTrack/getStats
      try {
        // different builds expose differently; check common properties
        const maybePc = peer._pc || peer.pc || peer._pcReal || null;
        if (maybePc) pcRef.current = maybePc;
      } catch (err) {
        // ignore
      }
    });

    peer.on("error", (err) => {
      console.error("Peer error:", err);
    });

    // we DO NOT call peer.destroy() during normal end-call to avoid stream/readable runtime errors
    peerRef.current = peer;
    if (onCreated) onCreated();
  }

  // ----------------------------------------------------------------------------
  // Start call (caller)
  // ----------------------------------------------------------------------------
  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      localStreamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      createPeer(true, stream);
      setCallStarted(true);
      setIncomingCall(false);
      startCallTimers();
      startStatsPolling();
    } catch (err) {
      console.error("startCall error:", err);
      alert("Camera / Microphone permission required.");
    }
  }

  // ----------------------------------------------------------------------------
  // End call safe - notify server + safe cleanup (no peer.destroy() call)
  // ----------------------------------------------------------------------------
  function endCall() {
    try {
      socketRef.current?.emit("end-call", { sessionId });
    } catch (err) {
      console.warn("end-call emit failed", err);
    }
    endCleanupSafe();
  }

  // safe cleanup: close pc, stop tracks, null refs (avoids calling simple-peer.destroy())
  function endCleanupSafe() {
    try {
      // stop connection & senders
      const pc = pcRef.current;
      if (pc) {
        try {
          if (typeof pc.getSenders === "function") {
            pc.getSenders().forEach((s) => {
              try {
                s.track?.stop();
              } catch {}
            });
          }
        } catch {}
        try {
          pc.close && pc.close();
        } catch {}
      }
    } catch {}

    // stop local stream tracks
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
      }
    } catch (err) {
      console.warn("stop local tracks failed", err);
    }

    // stop screen share if active
    stopScreenShareLocal();

    // stop recorder if active
    if (recording) stopRecording();

    // clear video src
    try {
      if (localVideo.current) localVideo.current.srcObject = null;
      if (remoteVideo.current) remoteVideo.current.srcObject = null;
    } catch {}

    // clear refs
    peerRef.current = null;
    pcRef.current = null;
    localStreamRef.current = null;

    // clear timers and UI
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

  // ----------------------------------------------------------------------------
  // replaceTrack helpers using RTCPeerConnection sender.replaceTrack if available
  // ----------------------------------------------------------------------------
  async function replaceVideoTrack(newTrack) {
    try {
      const pc = pcRef.current;
      if (pc && typeof pc.getSenders === "function") {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && typeof sender.replaceTrack === "function") {
          await sender.replaceTrack(newTrack);
          return true;
        }
      }

      // fallback: try simple-peer replaceTrack if available
      if (peerRef.current && typeof peerRef.current.replaceTrack === "function" && peerRef.current.streams && peerRef.current.streams[0]) {
        const outbound = peerRef.current.streams[0];
        outbound.getTracks().filter((t) => t.kind === "video").forEach((oldTrack) => {
          try {
            peerRef.current.replaceTrack(oldTrack, newTrack, outbound);
          } catch (err) {}
        });
        return true;
      }
    } catch (err) {
      console.warn("replaceVideoTrack error", err);
    }
    return false;
  }

  async function replaceAudioTrack(newTrack) {
    try {
      const pc = pcRef.current;
      if (pc && typeof pc.getSenders === "function") {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
        if (sender && typeof sender.replaceTrack === "function") {
          await sender.replaceTrack(newTrack);
          return true;
        }
      }

      if (peerRef.current && typeof peerRef.current.replaceTrack === "function" && peerRef.current.streams && peerRef.current.streams[0]) {
        const outbound = peerRef.current.streams[0];
        outbound.getTracks().filter((t) => t.kind === "audio").forEach((oldTrack) => {
          try {
            peerRef.current.replaceTrack(oldTrack, newTrack, outbound);
          } catch (err) {}
        });
        return true;
      }
    } catch (err) {
      console.warn("replaceAudioTrack error", err);
    }
    return false;
  }

  // ----------------------------------------------------------------------------
  // Mute toggle
  // ----------------------------------------------------------------------------
  function toggleMute() {
    try {
      const a = localStreamRef.current?.getAudioTracks()?.[0];
      if (!a) return;
      a.enabled = !a.enabled;
      setMuted(!a.enabled);
      replaceAudioTrack(a); // best-effort sync with remote
    } catch (err) {
      console.warn("toggleMute error", err);
    }
  }

  // ----------------------------------------------------------------------------
  // Camera toggle (black frame fallback). Uses replaceVideoTrack for smooth swap.
  // ----------------------------------------------------------------------------
  async function toggleCamera() {
    try {
      const stream = localStreamRef.current;
      if (!stream) return;

      const vTrack = stream.getVideoTracks()?.[0];

      // turn OFF camera -> stop existing and insert black frame
      if (!cameraOff && vTrack) {
        try { vTrack.stop(); } catch {}
        // remove video tracks from stream (if any)
        try { stream.getVideoTracks().forEach((t) => { try { stream.removeTrack(t); } catch {} }); } catch {}
        // create black canvas track as placeholder
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blackTrack = canvas.captureStream(1).getVideoTracks()[0];

        try { stream.addTrack(blackTrack); } catch (err) { console.warn("add black track failed", err); }
        if (localVideo.current) localVideo.current.srcObject = stream;
        await replaceVideoTrack(blackTrack);
        setCameraOff(true);
        return;
      }

      // turn ON camera -> get new camera track and replace
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = cam.getVideoTracks()[0];
        // stop any existing video tracks and remove them
        try { stream.getVideoTracks().forEach((t) => { try { t.stop(); } catch {} }); } catch {}
        try { stream.getVideoTracks().forEach((t) => { try { stream.removeTrack(t); } catch {} }); } catch {}
        try { stream.addTrack(newTrack); } catch (err) { console.warn("add new video track failed", err); }

        if (localVideo.current) localVideo.current.srcObject = stream;
        await replaceVideoTrack(newTrack);
        setCameraOff(false);
      } catch (err) {
        console.error("Camera ON failed", err);
      }
    } catch (err) {
      console.error("toggleCamera error", err);
    }
  }

  // ----------------------------------------------------------------------------
  // Screen sharing (getDisplayMedia, replaceVideoTrack)
  // ----------------------------------------------------------------------------
  async function startScreenShare() {
    try {
      if (sharingScreen) return;
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      // attach to local stream (replace existing video track)
      try {
        // stop and remove existing video tracks
        localStreamRef.current.getVideoTracks().forEach((t) => { try { t.stop(); } catch {} });
        try { localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current.removeTrack(t)); } catch {}
        localStreamRef.current.addTrack(screenTrack);
        if (localVideo.current) localVideo.current.srcObject = localStreamRef.current;
        await replaceVideoTrack(screenTrack);
        setSharingScreen(true);

        // when user stops sharing via browser UI, revert back to camera
        screenTrack.onended = () => {
          stopScreenShareLocal();
        };
      } catch (err) {
        console.warn("share replaceVideo failed", err);
      }
    } catch (err) {
      console.error("startScreenShare failed", err);
    }
  }

  async function stopScreenShareLocal() {
    try {
      // stop display tracks if any
      try { localStreamRef.current.getVideoTracks().forEach((t) => { if (t.label?.toLowerCase().includes("screen")) t.stop(); }); } catch {}
      // request camera back (best-effort)
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = cam.getVideoTracks()[0];
        try { localStreamRef.current.getVideoTracks().forEach((t) => { try { localStreamRef.current.removeTrack(t); } catch {} }); } catch {}
        try { localStreamRef.current.addTrack(newTrack); } catch {}
        if (localVideo.current) localVideo.current.srcObject = localStreamRef.current;
        await replaceVideoTrack(newTrack);
      } catch (err) {
        // camera unavailable: insert black fallback
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blackTrack = canvas.captureStream(1).getVideoTracks()[0];
        try { localStreamRef.current.getVideoTracks().forEach((t) => { try { localStreamRef.current.removeTrack(t); } catch {} }); } catch {}
        try { localStreamRef.current.addTrack(blackTrack); } catch {}
        if (localVideo.current) localVideo.current.srcObject = localStreamRef.current;
        await replaceVideoTrack(blackTrack);
      }
    } catch (err) {
      console.warn("stopScreenShareLocal error", err);
    } finally {
      setSharingScreen(false);
    }
  }

  // ----------------------------------------------------------------------------
  // Recording (MediaRecorder - local only) and download
  // ----------------------------------------------------------------------------
  function startRecording() {
    try {
      if (!localStreamRef.current) return;
      recordedChunksRef.current = [];
      const mr = new MediaRecorder(localStreamRef.current, { mimeType: "video/webm; codecs=vp9" });
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn("stopRecording failed", err);
    } finally {
      setRecording(false);
    }
  }

  // ----------------------------------------------------------------------------
  // Call timers & stats polling
  // ----------------------------------------------------------------------------
  function startCallTimers() {
    setCallSeconds(0);
    clearInterval(callTimer.current);
    callTimer.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
  }
  function stopCallTimers() {
    clearInterval(callTimer.current);
    callTimer.current = null;
  }

  // very basic bitrate estimation via getStats (sample every 2s)
  function startStatsPolling() {
    stopStatsPolling();
    statsTimer.current = setInterval(async () => {
      try {
        const pc = pcRef.current;
        if (!pc || typeof pc.getStats !== "function") return;
        const stats = await pc.getStats();
        let outBytes = 0, outT = 0;
        stats.forEach((report) => {
          if (report.type === "outbound-rtp" && report.kind === "video") {
            outBytes = report.bytesSent || 0;
            outT = report.timestamp || 0;
          }
        });
        // store last value in ref for diffing; simple approach omitted for brevity
        // just show bytesSent as quick feedback
        if (outBytes) setBitrate(Math.round(outBytes));
      } catch (err) {
        // ignore
      }
    }, 2000);
  }
  function stopStatsPolling() {
    clearInterval(statsTimer.current);
    statsTimer.current = null;
    setBitrate(null);
  }

  // ----------------------------------------------------------------------------
  // Chat send / typing
  // ----------------------------------------------------------------------------
  function sendMessage(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    const payload = { sessionId, text: msg, sender: "me", time: new Date() };
    try {
      socketRef.current?.emit("chat-message", payload);
    } catch {}
    setMessages((prev) => [...prev, payload]);
    setMsg("");
  }

  function onTypingChange(e) {
    setMsg(e.target.value);
    try {
      socketRef.current?.emit("typing", { sessionId });
    } catch {}
  }

  // ----------------------------------------------------------------------------
  // UI Helpers & classes
  // ----------------------------------------------------------------------------
  const primaryBtn = "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-500 to-blue-600 text-white";
  const dangerBtn = "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-r from-red-500 to-red-600 text-white";
  const warnBtn = "px-4 py-2 rounded-xl shadow-md transition-all duration-200 hover:scale-105 bg-yellow-400 text-black";
  const smallBtn = "px-3 py-1 rounded-full shadow-sm bg-white/70 border border-gray-200";

  const localFloating = "absolute bottom-6 right-6 w-40 h-28 rounded-lg shadow-lg border-2 border-white z-40 overflow-hidden";

  // helper for formatting time
  function fmtTime(s) {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Video & Controls */}
        <div className="relative bg-white/40 backdrop-blur-lg border border-white/30 rounded-2xl p-4 shadow-xl">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            {!callStarted ? (
              <button onClick={startCall} className={primaryBtn}>🎥 Start Call</button>
            ) : (
              <button onClick={endCall} className={dangerBtn}>🔴 End Call</button>
            )}

            {callStarted && (
              <>
                <button onClick={toggleMute} className={warnBtn}>{muted ? "Unmute" : "Mute"}</button>
                <button onClick={toggleCamera} className={primaryBtn}>{cameraOff ? "Turn Camera On" : "Turn Camera Off"}</button>
                <button onClick={() => (sharingScreen ? stopScreenShareLocal() : startScreenShare())} className={smallBtn}>
                  {sharingScreen ? "Stop Share" : "Share Screen"}
                </button>
                <button onClick={() => (recording ? stopRecording() : startRecording())} className={smallBtn}>
                  {recording ? "Stop Rec" : "Record"}
                </button>
                <button onClick={() => setMirrorLocal((m) => !m)} className={smallBtn}>
                  {mirrorLocal ? "Mirror: On" : "Mirror: Off"}
                </button>
              </>
            )}
          </div>

          {incomingCall && !callStarted && (
            <div className="text-yellow-700 bg-yellow-100 p-2 rounded-lg text-center mb-4">Incoming call…</div>
          )}

          {/* Remote video */}
          <div className="rounded-2xl overflow-hidden bg-black/70 h-72 md:h-96 flex items-center justify-center">
            <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-700">{connected ? "Connected ✓" : "Waiting for participant…"}</p>
            <div className="text-xs text-gray-500">
              <span className="mr-3">Time: {fmtTime(callSeconds)}</span>
              <span>BytesSent: {bitrate ?? "-"}</span>
            </div>
          </div>

          {/* Local video floating (if call started) */}
          <div className={callStarted ? localFloating : "w-full mt-4"}>
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: mirrorLocal ? "scaleX(-1)" : "none" }}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="bg-white rounded-2xl p-4 shadow-lg flex flex-col">
          <div id="chatBox" className="flex-1 overflow-auto mb-3 p-3 rounded-xl bg-gray-50 shadow-inner space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`px-4 py-2 rounded-2xl shadow ${m.sender === "me" ? "bg-blue-600 text-white" : "bg-white text-gray-800"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && <div className="text-gray-400 italic">Typing…</div>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-3 items-center">
            <input value={msg} onChange={onTypingChange} placeholder="Type a message..." className="flex-1 border p-3 rounded-full focus:ring-2 focus:ring-blue-300 outline-none" />
            <button type="submit" className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow">Send</button>
          </form>

          <div className="mt-3 text-xs text-gray-400 text-center">
            <span>Secure · Private · Encrypted (transport)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
