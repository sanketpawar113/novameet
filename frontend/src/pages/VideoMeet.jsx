// src/pages/VideoMeet.jsx
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  Badge, IconButton, TextField, Tooltip,
  Avatar, Chip, Snackbar, Alert,
} from "@mui/material";
import { Button } from "@mui/material";
import {
  Videocam, VideocamOff, CallEnd, Mic, MicOff,
  ScreenShare, StopScreenShare, Chat as ChatIcon,
  Send, Close, People, PersonOff, VolumeOff,
  ContentCopy, AdminPanelSettings, FiberManualRecord,
} from "@mui/icons-material";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";
import { useParams } from "react-router-dom";

const server_url = server;

// Store peer connections globally (outside React state to avoid stale closures)
const connections = {};

const peerConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoMeetComponent() {
  const { url: roomId } = useParams();

  const socketRef      = useRef();
  const socketIdRef    = useRef();
  const localVideoRef  = useRef();
  const videoRef       = useRef([]);
  const chatEndRef     = useRef();
  const usernameMapRef = useRef({});

  // Media states
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [video, setVideo]   = useState(false);
  const [audio, setAudio]   = useState(false);
  const [screen, setScreen] = useState(false);

  // UI states
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [videos, setVideos]     = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Chat
  const [messages, setMessages]   = useState([]);
  const [message, setMessage]     = useState("");
  const [newMessages, setNewMessages] = useState(0);

  // Participants & host
  const [participants, setParticipants] = useState({});
  const [hostSocketId, setHostSocketId] = useState(null);
  const [isHost, setIsHost]             = useState(false);
  const [mutedByHost, setMutedByHost]   = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Snack
  const [snack, setSnack] = useState({ open: false, msg: "", type: "info" });
  const showMsg = (msg, type = "info") => setSnack({ open: true, msg, type });

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!askForUsername) {
      const t = setInterval(() => setCallDuration(d => d + 1), 1000);
      return () => clearInterval(t);
    }
  }, [askForUsername]);

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  // ─── Permissions ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const v = await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoAvailable(true); v.getTracks().forEach(t => t.stop());
      } catch { setVideoAvailable(false); }

      try {
        const a = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioAvailable(true); a.getTracks().forEach(t => t.stop());
      } catch { setAudioAvailable(false); }

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        window.localStream = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e) { console.log("Preview failed:", e); }
    })();
  }, []);

  // ─── Media change effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (video !== false || audio !== false) getUserMedia();
  }, [video, audio]);

  useEffect(() => {
    if (screen) getDisplayMedia();
  }, [screen]);

  // ─── Chat scroll — always scroll to bottom when messages change ───────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── getUserMedia ─────────────────────────────────────────────────────────
  const getUserMedia = () => {
    if (video || audio) {
      navigator.mediaDevices.getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(e => console.log(e));
    } else {
      try { window.localStream?.getTracks().forEach(t => t.stop()); } catch {}
    }
  };

  const getUserMediaSuccess = (stream) => {
    try { window.localStream?.getTracks().forEach(t => t.stop()); } catch {}
    window.localStream = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      try { connections[id].addStream(stream); } catch {}
      connections[id].createOffer()
        .then(desc => connections[id].setLocalDescription(desc))
        .then(() => socketRef.current.emit("signal", id,
          JSON.stringify({ sdp: connections[id].localDescription })))
        .catch(e => console.log("renegotiate offer error:", e));
    }
  };

  // ─── getDisplayMedia ──────────────────────────────────────────────────────
  const getDisplayMedia = () => {
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then(stream => {
        try { window.localStream?.getTracks().forEach(t => t.stop()); } catch {}
        window.localStream = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        for (let id in connections) {
          if (id === socketIdRef.current) continue;
          try { connections[id].addStream(stream); } catch {}
          connections[id].createOffer()
            .then(desc => connections[id].setLocalDescription(desc))
            .then(() => socketRef.current.emit("signal", id,
              JSON.stringify({ sdp: connections[id].localDescription })))
            .catch(e => console.log("screen share offer error:", e));
        }
        stream.getTracks()[0].onended = () => setScreen(false);
      })
      .catch(e => { console.log(e); setScreen(false); });
  };

  // ─── Create a single peer connection ──────────────────────────────────────
  const createPeerConnection = (peerId, isOfferer, currentUsernameMap) => {
    if (connections[peerId]) return;

    const pc = new RTCPeerConnection(peerConfig);
    connections[peerId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("signal", peerId, JSON.stringify({ ice: e.candidate }));
      }
    };

    pc.onaddstream = (e) => {
      const incomingStream = e.stream;
      if (!incomingStream) return;

      const peerUsername = usernameMapRef.current[peerId]
        || currentUsernameMap?.[peerId]
        || "Guest";

      setVideos(prev => {
        const exists = prev.find(v => v.socketId === peerId);
        let updated;
        if (exists) {
          updated = prev.map(v =>
            v.socketId === peerId ? { ...v, stream: incomingStream, username: peerUsername } : v
          );
        } else {
          updated = [...prev, {
            socketId: peerId,
            stream: incomingStream,
            username: peerUsername,
          }];
        }
        videoRef.current = updated;
        return updated;
      });
    };

    const streamToAdd = window.localStream || createBlankStream();
    if (!window.localStream) window.localStream = streamToAdd;
    pc.addStream(streamToAdd);

    if (isOfferer) {
      pc.createOffer()
        .then(desc => pc.setLocalDescription(desc))
        .then(() => {
          socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: pc.localDescription }));
        })
        .catch(e => console.log("createOffer error for", peerId, e));
    }
  };

  // ─── Connect to socket ────────────────────────────────────────────────────
  const connectToSocket = () => {
    socketRef.current = io(server_url);

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.pathname, username);
    });

    // ── FIX 1: server sends chat-message back to ALL including sender.
    //    If your server does NOT echo back to sender, keep addMessage here.
    //    If your server DOES echo back to sender, remove addMessage from sendMessage().
    //    The safest approach: deduplicate by checking if we already added this msg.
    socketRef.current.on("chat-message", (data, sender, senderSocketId) => {
      // Only add messages from OTHER users here.
      // Our own messages are added immediately in sendMessage() for instant feedback.
      if (senderSocketId !== socketIdRef.current) {
        addMessage(data, sender, senderSocketId);
      }
    });

    socketRef.current.on("user-joined", (id, clients, usernameMap, hostId) => {
      usernameMapRef.current = usernameMap || {};
      setParticipants(usernameMap || {});
      setHostSocketId(hostId);

      if (hostId === socketIdRef.current) {
        setIsHost(true);
        showMsg("You are the Host ⭐", "success");
      }

      const iAmNewJoiner = (id === socketIdRef.current);

      clients.forEach(peerId => {
        if (peerId === socketIdRef.current) return;

        if (iAmNewJoiner) {
          createPeerConnection(peerId, false, usernameMap);
        } else {
          if (peerId === id) {
            createPeerConnection(peerId, true, usernameMap);
          }
        }
      });
    });

    socketRef.current.on("user-left", (id) => {
      setVideos(prev => {
        const updated = prev.filter(v => v.socketId !== id);
        videoRef.current = updated;
        return updated;
      });
      setParticipants(prev => {
        const copy = { ...prev }; delete copy[id]; return copy;
      });
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
      showMsg("A participant left the call", "info");
    });

    socketRef.current.on("host-assigned", () => {
      setIsHost(true);
      showMsg("You are now the Host ⭐", "success");
    });

    socketRef.current.on("muted-by-host", () => {
      setAudio(false);
      setMutedByHost(true);
      showMsg("You were muted by the host", "warning");
    });

    socketRef.current.on("kicked", () => {
      showMsg("You were removed from the meeting", "error");
      setTimeout(() => { window.location.href = "/home"; }, 2000);
    });
  };

  // ─── Handle incoming signals ──────────────────────────────────────────────
  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    if (!connections[fromId]) {
      createPeerConnection(fromId, false, usernameMapRef.current);
    }

    const pc = connections[fromId];

    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            return pc.createAnswer()
              .then(desc => pc.setLocalDescription(desc))
              .then(() => {
                socketRef.current.emit("signal", fromId,
                  JSON.stringify({ sdp: pc.localDescription }));
              });
          }
        })
        .catch(e => console.log("SDP error from", fromId, e));
    }

    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(e => console.log("ICE error:", e));
    }
  };

  // ─── Blank stream helper ──────────────────────────────────────────────────
  const createBlankStream = () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const dst = osc.connect(ctx.createMediaStreamDestination());
    osc.start(); ctx.resume();
    const audioTrack = Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    const canvas = Object.assign(document.createElement("canvas"), { width: 640, height: 480 });
    canvas.getContext("2d").fillRect(0, 0, 640, 480);
    const videoTrack = Object.assign(canvas.captureStream().getVideoTracks()[0], { enabled: false });
    return new MediaStream([audioTrack, videoTrack]);
  };

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleVideo   = () => setVideo(v => !v);
  const handleAudio   = () => { setMutedByHost(false); setAudio(a => !a); };
  const handleScreen  = () => setScreen(s => !s);
  const handleEndCall = () => {
    try { window.localStream?.getTracks().forEach(t => t.stop()); } catch {}
    window.location.href = "/home";
  };

  const kickUser = (targetSocketId) => {
    socketRef.current.emit("kick-user", window.location.pathname, targetSocketId);
    showMsg("Participant removed", "success");
  };
  const muteUser = (targetSocketId) => {
    socketRef.current.emit("mute-user", window.location.pathname, targetSocketId);
    showMsg("Participant muted", "success");
  };

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const addMessage = (data, sender, senderSocketId) => {
    setMessages(prev => [...prev, {
      sender,
      data,
      mine: senderSocketId === socketIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  // ── FIX 2: sendMessage now immediately adds the message locally so the
  //    sender sees their own message right away without waiting for server echo.
  const sendMessage = () => {
    if (!message.trim()) return;
    const trimmed = message.trim();

    // Add to local state immediately (instant feedback)
    addMessage(trimmed, username, socketIdRef.current);

    // Emit to server so other participants receive it
    socketRef.current.emit("chat-message", trimmed, username);

    setMessage("");
  };

  // ── FIX 3: openChat now TOGGLES the panel (not always-open) and clears badge
  const openChat = () => {
    setShowChat(prev => {
      const opening = !prev;
      if (opening) setNewMessages(0); // clear badge only when opening
      return opening;
    });
    setShowParticipants(false);
  };

  const connect = () => {
    if (!username.trim()) return showMsg("Enter a username to join", "warning");
    localStorage.setItem("username", username);
    setAskForUsername(false);
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocket();
  };

  const copyMeetingCode = async () => {
    const code = window.location.pathname.replace("/", "");
    await navigator.clipboard.writeText(code);
    showMsg("Meeting code copied!");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOBBY
  // ─────────────────────────────────────────────────────────────────────────
  if (askForUsername) {
    return (
      <div className={styles.lobbyWrapper}>
        <div className="meshBg" />
        <div className={styles.lobbyCard}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
              background: "linear-gradient(135deg,var(--cyan),var(--indigo))",
              display: "grid", placeItems: "center",
              boxShadow: "0 0 24px rgba(0,210,255,0.3)"
            }}>
              <Videocam sx={{ color: "#050b18", fontSize: 26 }} />
            </div>
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.6rem", fontWeight: 800 }}>
              Join Meeting
            </h2>
            <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.85rem" }}>
              Room: <span style={{ color: "var(--cyan)" }}>{window.location.pathname.replace("/", "")}</span>
            </p>
          </div>

          <TextField
            fullWidth label="Your Display Name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && connect()}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2, background: "var(--bg-surface)", color: "var(--text-primary)",
                "& fieldset": { borderColor: "var(--border)" },
                "&:hover fieldset, &.Mui-focused fieldset": { borderColor: "var(--cyan)" },
              },
              "& .MuiInputLabel-root": { color: "var(--text-muted)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "var(--cyan)" },
            }}
          />

          <Button fullWidth variant="contained" onClick={connect}
            sx={{
              mt: 2, height: 48, borderRadius: 2, fontWeight: 700, fontSize: "1rem",
              background: "linear-gradient(135deg,var(--cyan),var(--indigo))", color: "#050b18",
              boxShadow: "0 0 20px rgba(0,210,255,0.25)",
              "&:hover": { boxShadow: "0 0 35px rgba(0,210,255,0.45)" },
            }}
          >Join Now</Button>

          <video ref={localVideoRef} autoPlay muted className={styles.lobbyVideo} />
        </div>

        <Snackbar open={snack.open} autoHideDuration={2500}
          onClose={() => setSnack(s => ({ ...s, open: false }))}>
          <Alert severity={snack.type} variant="filled">{snack.msg}</Alert>
        </Snackbar>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IN CALL
  // ─────────────────────────────────────────────────────────────────────────
  const sidebarOpen = showChat || showParticipants;

  return (
    <div className={styles.meetVideoContainer}>

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.logoSmall}>
            <Videocam sx={{ fontSize: 18, color: "#050b18" }} />
          </div>
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }}>NovaMeet</span>
          <div className={styles.recordingIndicator}>
            <FiberManualRecord sx={{ fontSize: 10, color: "var(--success)", animation: "pulse 2s infinite" }} />
            <span>{fmtDuration(callDuration)}</span>
          </div>
        </div>

        <div className={styles.topBarCenter}>
          <Chip
            icon={<ContentCopy sx={{ fontSize: 14 }} />}
            label={window.location.pathname.replace("/", "")}
            onClick={copyMeetingCode}
            sx={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.78rem",
              "&:hover": { borderColor: "var(--cyan)", color: "var(--cyan)" }
            }}
          />
          {isHost && (
            <Chip
              icon={<AdminPanelSettings sx={{ fontSize: 14 }} />}
              label="Host"
              sx={{
                background: "linear-gradient(135deg,rgba(0,210,255,0.2),rgba(79,127,255,0.2))",
                border: "1px solid var(--border)", color: "var(--cyan)", fontSize: "0.78rem",
              }}
            />
          )}
        </div>

        <div className={styles.topBarRight}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            {videos.length + 1} participant{videos.length !== 0 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main area */}
      <div className={styles.mainArea} style={{ marginRight: sidebarOpen ? 360 : 0 }}>
        <div className={styles.conferenceView}
          style={{ gridTemplateColumns: videos.length <= 1 ? "1fr" : "repeat(2, 1fr)" }}
        >
          {videos.length === 0 ? (
            <div className={styles.waitingBox}>
              <div style={{ textAlign: "center" }}>
                <Videocam sx={{ fontSize: 48, color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
                  Waiting for participants...
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                  Share the meeting code to invite others
                </p>
              </div>
            </div>
          ) : (
            videos.map(v => (
              <div className={styles.remoteCard} key={v.socketId}>
                <video
                  data-socket={v.socketId}
                  ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }}
                  autoPlay playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }}
                />
                <div className={styles.remoteLabel}>
                  <span>{v.username || "Participant"}</span>
                  {hostSocketId === v.socketId && <span className={styles.hostTag}>⭐ Host</span>}
                </div>
                {isHost && v.socketId !== socketIdRef.current && (
                  <div className={styles.hostOverlay}>
                    <Tooltip title="Mute participant">
                      <IconButton size="small" onClick={() => muteUser(v.socketId)}
                        sx={{ background: "rgba(0,0,0,0.5)", color: "white", mr: 0.5 }}>
                        <VolumeOff sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove participant">
                      <IconButton size="small" onClick={() => kickUser(v.socketId)}
                        sx={{ background: "rgba(255,69,96,0.5)", color: "white" }}>
                        <PersonOff sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Self PiP */}
        <div className={styles.selfVideoWrapper}>
          <video ref={localVideoRef} autoPlay muted className={styles.meetUserVideo} />
          <div className={styles.selfLabel}>{username} (You){isHost ? " ⭐" : ""}</div>
        </div>
      </div>

      {/* ── FIX 4: Sidebar — added inline styles to guarantee visibility ── */}
      {sidebarOpen && (
        <div
          className={styles.sidebar}
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            width: 360,
            height: "100vh",
            zIndex: 200,             // above everything
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-card, #0d1b2a)",
            borderLeft: "1px solid var(--border, rgba(255,255,255,0.08))",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className={styles.sidebarHeader}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary, #fff)" }}>
              {showChat ? "Live Chat" : "Participants"}
            </span>
            <IconButton size="small"
              onClick={() => { setShowChat(false); setShowParticipants(false); }}
              sx={{ color: "var(--text-secondary)" }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </div>

          {/* ── CHAT PANEL ── */}
          {showChat && (
            <>
              {/* Messages list */}
              <div
                className={styles.chatMessages}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 0,       // critical for flex scroll to work
                }}
              >
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: "center", color: "var(--text-muted, #666)",
                    marginTop: 60, fontSize: "0.85rem",
                  }}>
                    No messages yet. Say hello! 👋
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: m.mine ? "flex-end" : "flex-start",
                      }}
                    >
                      {/* Sender name — only for others */}
                      {!m.mine && (
                        <span style={{
                          fontSize: "0.72rem",
                          color: "var(--cyan, #00d2ff)",
                          fontWeight: 600,
                          marginBottom: 3,
                          paddingLeft: 4,
                        }}>
                          {m.sender}
                        </span>
                      )}

                      {/* Bubble */}
                      <div style={{
                        maxWidth: "80%",
                        padding: "9px 14px",
                        borderRadius: m.mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: m.mine
                          ? "linear-gradient(135deg, var(--cyan, #00d2ff), var(--indigo, #4f7fff))"
                          : "var(--bg-surface, #1a2535)",
                        color: m.mine ? "#050b18" : "var(--text-primary, #fff)",
                        fontSize: "0.875rem",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        boxShadow: m.mine
                          ? "0 2px 12px rgba(0,210,255,0.25)"
                          : "0 2px 8px rgba(0,0,0,0.2)",
                      }}>
                        {m.data}
                      </div>

                      {/* Timestamp */}
                      {m.time && (
                        <span style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted, #555)",
                          marginTop: 3,
                          paddingRight: m.mine ? 2 : 0,
                          paddingLeft: m.mine ? 0 : 2,
                        }}>
                          {m.time}
                        </span>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div
                className={styles.chatInput}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
                  flexShrink: 0,
                  alignItems: "center",
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      background: "var(--bg-surface, #1a2535)",
                      color: "var(--text-primary, #fff)",
                      "& fieldset": { borderColor: "var(--border, rgba(255,255,255,0.1))" },
                      "&:hover fieldset": { borderColor: "var(--cyan, #00d2ff)" },
                      "&.Mui-focused fieldset": { borderColor: "var(--cyan, #00d2ff)" },
                    },
                    "& input": { color: "var(--text-primary, #fff)" },
                    "& input::placeholder": { color: "var(--text-muted, #555)", fontSize: "0.85rem" },
                  }}
                />
                <IconButton
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  sx={{
                    background: message.trim()
                      ? "linear-gradient(135deg, var(--cyan, #00d2ff), var(--indigo, #4f7fff))"
                      : "var(--bg-surface, #1a2535)",
                    color: message.trim() ? "#050b18" : "var(--text-muted, #555)",
                    borderRadius: 2,
                    flexShrink: 0,
                    transition: "all 0.2s",
                    "&:hover": {
                      background: message.trim()
                        ? "linear-gradient(135deg, var(--indigo, #4f7fff), var(--cyan, #00d2ff))"
                        : "var(--bg-surface, #1a2535)",
                    },
                  }}
                >
                  <Send sx={{ fontSize: 18 }} />
                </IconButton>
              </div>
            </>
          )}

          {/* ── PARTICIPANTS PANEL ── */}
          {showParticipants && (
            <div
              className={styles.participantList}
              style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}
            >
              {/* Self */}
              <div className={styles.participantItem}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
              >
                <Avatar sx={{
                  width: 34, height: 34,
                  background: "linear-gradient(135deg,var(--cyan),var(--indigo))",
                  color: "#050b18", fontSize: "0.8rem", fontWeight: 700,
                }}>
                  {username[0]?.toUpperCase()}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{username} (You)</p>
                  {isHost && <p style={{ color: "var(--cyan)", fontSize: "0.75rem" }}>⭐ Host</p>}
                </div>
              </div>

              {/* Others */}
              {videos.map(v => (
                <div className={styles.participantItem} key={v.socketId}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
                >
                  <Avatar sx={{
                    width: 34, height: 34,
                    background: "var(--bg-hover, #1e2d3d)",
                    color: "var(--text-primary)", fontSize: "0.8rem",
                  }}>
                    {(v.username || "?")[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{v.username || "Participant"}</p>
                    {v.socketId === hostSocketId && (
                      <p style={{ color: "var(--cyan)", fontSize: "0.75rem" }}>⭐ Host</p>
                    )}
                  </div>
                  {isHost && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Tooltip title="Mute">
                        <IconButton size="small" onClick={() => muteUser(v.socketId)}
                          sx={{ color: "var(--text-muted)", "&:hover": { color: "var(--warning)" } }}>
                          <VolumeOff sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton size="small" onClick={() => kickUser(v.socketId)}
                          sx={{ color: "var(--text-muted)", "&:hover": { color: "var(--danger)" } }}>
                          <PersonOff sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Bar */}
      <div className={styles.controlBar}>
        <div className={styles.controlLeft}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{fmtDuration(callDuration)}</span>
        </div>

        <div className={styles.controlCenter}>
          <Tooltip title={audio ? "Mute Mic" : mutedByHost ? "Muted by host" : "Unmute Mic"}>
            <div className={`${styles.controlBtn} ${!audio ? styles.controlBtnOff : ""}`} onClick={handleAudio}>
              {audio ? <Mic /> : <MicOff />}
              {mutedByHost && !audio && <span className={styles.mutedBadge}>muted</span>}
            </div>
          </Tooltip>

          <Tooltip title={video ? "Turn off Camera" : "Turn on Camera"}>
            <div className={`${styles.controlBtn} ${!video ? styles.controlBtnOff : ""}`} onClick={handleVideo}>
              {video ? <Videocam /> : <VideocamOff />}
            </div>
          </Tooltip>

          <Tooltip title="End Call">
            <div className={`${styles.controlBtn} ${styles.controlBtnEnd}`} onClick={handleEndCall}>
              <CallEnd />
            </div>
          </Tooltip>

          {screenAvailable && (
            <Tooltip title={screen ? "Stop Sharing" : "Share Screen"}>
              <div className={`${styles.controlBtn} ${screen ? styles.controlBtnActive : ""}`} onClick={handleScreen}>
                {screen ? <StopScreenShare /> : <ScreenShare />}
              </div>
            </Tooltip>
          )}

          <Tooltip title="Participants">
            <div
              className={`${styles.controlBtn} ${showParticipants ? styles.controlBtnActive : ""}`}
              onClick={() => { setShowParticipants(p => !p); setShowChat(false); }}
            >
              <People />
              {videos.length > 0 && <span className={styles.countBadge}>{videos.length}</span>}
            </div>
          </Tooltip>

          <Tooltip title="Chat">
            <div className={`${styles.controlBtn} ${showChat ? styles.controlBtnActive : ""}`} onClick={openChat}>
              <Badge badgeContent={newMessages} color="error" max={99}>
                <ChatIcon />
              </Badge>
            </div>
          </Tooltip>
        </div>

        <div className={styles.controlRight} />
      </div>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.type} variant="filled" sx={{ borderRadius: "var(--radius-md)" }}>
          {snack.msg}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
