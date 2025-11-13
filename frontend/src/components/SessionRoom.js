// frontend/src/components/SessionRoom.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

export default function SessionRoom({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [connected, setConnected] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  // ✅ Auto-scroll for chat
  useEffect(() => {
    const chatBox = document.querySelector("#chatBox");
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io("http://localhost:5000", { auth: { token } });

    socketRef.current.emit("join-session", sessionId);

    socketRef.current.on("chat-message", (m) =>
      setMessages((prev) => [...prev, m])
    );

    socketRef.current.on("signal", ({ from, data }) => {
      if (peerRef.current) {
        peerRef.current.signal(data);
        return;
      }

      setIncomingCall(true);
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideo.current) localVideo.current.srcObject = stream;
          createPeer(false, stream, () => {
            peerRef.current.signal(data);
            setCallStarted(true);
            setIncomingCall(false);
          });
        })
        .catch(() => {
          alert("Camera/mic access needed to accept the call");
          setIncomingCall(false);
        });
    });

    socketRef.current.on("user-joined", (userId) => {
      console.log("User joined session:", userId);
    });

    socketRef.current.on("end-call", () => {
      cleanupCall();
      alert("The other participant ended the call");
    });

    return () => {
      socketRef.current.disconnect();
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function createPeer(initiator, stream, onReady) {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:relay1.expressturn.com:3478",
            username: "efree",
            credential: "efree",
          },
        ],
      },
    });

    peer.on("signal", (data) => {
      socketRef.current.emit("signal", { sessionId, data });
    });

    peer.on("stream", (remoteStream) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      setConnected(true);
    });

    peer.on("error", (err) => {
      console.error("Peer error:", err);
    });

    peerRef.current = peer;
    if (onReady) onReady();
  }

  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      createPeer(true, stream);
      setCallStarted(true);
      setIncomingCall(false);
    } catch (err) {
      console.error("getUserMedia error:", err);
      alert("Camera/mic access needed to start a call");
    }
  }

  function endCall() {
    socketRef.current.emit("end-call", { sessionId });
    cleanupCall();
  }

  function cleanupCall() {
    try {
      if (peerRef.current) {
        peerRef.current.removeAllListeners();
        peerRef.current.destroy();
        peerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      if (localVideo.current) localVideo.current.srcObject = null;
      if (remoteVideo.current) remoteVideo.current.srcObject = null;

      setCallStarted(false);
      setConnected(false);
      setIncomingCall(false);
    } catch (err) {
      console.error("cleanup error", err);
    }
  }

  const sendMessage = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    socketRef.current.emit("chat-message", { sessionId, text: msg });
    setMessages((prev) => [
      ...prev,
      { text: msg, sender: "me", time: new Date() },
    ]);
    setMsg("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {/* Left: Video + controls */}
      <div className="space-y-4">
        <div className="flex gap-3 mb-2">
          {!callStarted ? (
            <button
              onClick={startCall}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              🎥 Start Call
            </button>
          ) : (
            <button
              onClick={endCall}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              🔴 End Call
            </button>
          )}

          {incomingCall && !callStarted && (
            <div className="px-3 py-2 rounded bg-yellow-100 text-yellow-800">
              Incoming call... granting camera access to connect
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded shadow">
          <video ref={localVideo} autoPlay muted className="w-full rounded" />
          <p className="text-sm text-gray-500">You</p>
        </div>

        <div className="bg-white p-3 rounded shadow">
          <video ref={remoteVideo} autoPlay className="w-full rounded" />
          <p className="text-sm text-gray-500">
            {connected ? "Connected ✅" : "Waiting for participant..."}
          </p>
        </div>
      </div>

      {/* Right: Chat area */}
      <div className="bg-white p-4 rounded shadow flex flex-col">
        {/* ✅ Added id="chatBox" for auto-scroll */}
        <div id="chatBox" className="flex-1 overflow-auto mb-2">
          {messages.map((m, i) => (
            <div key={i} className={`mb-1 ${m.sender === "me" && "text-right"}`}>
              <div
                className={`inline-block px-2 py-1 rounded ${
                  m.sender === "me"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {m.text}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(m.time).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type message..."
            className="border p-2 rounded flex-1 focus:ring-2 focus:ring-blue-400"
          />
          <button className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
