// src/pages/history.jsx
import React, { useContext, useEffect, useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import {
  Videocam, ArrowBack, AccessTime, CalendarMonth,
  History as HistoryIcon, PlayArrow, DeleteOutline,
  DeleteSweep, AdminPanelSettings,
} from "@mui/icons-material";
import {
  Button, IconButton, CircularProgress,
  Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Snackbar, Alert,
} from "@mui/material";

export default function History() {
  const navigate = useNavigate();
  const { getHistoryOfUser, deleteHistoryItem, clearAllHistory } = useContext(AuthContext);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const username = localStorage.getItem("username");

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const data = await getHistoryOfUser();
      setMeetings(data || []);
    } catch (e) {
      showMsg("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg, type = "success") => setSnack({ open: true, msg, type });

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setMeetings(prev => prev.filter(m => m._id !== id));
      showMsg("Meeting removed from history");
    } catch (e) {
      const msg = e?.response?.data?.message || "Delete failed";
      showMsg(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setConfirmClear(false);
    try {
      await clearAllHistory();
      setMeetings([]);
      showMsg("All history cleared");
    } catch (e) {
      showMsg("Failed to clear history", "error");
    }
  };

  const fmtDate = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fmtTime = d => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="historyPage">
      <div className="meshBg" />

      {/* Header */}
      <header className="navBar">
        <div className="navBarLogo">
          <div className="logoIcon">
            <Videocam sx={{ fontSize: 20, color: "#050b18" }} />
          </div>
          <h2>NovaMeet</h2>
        </div>
        <div className="navActions">
          <Tooltip title="Back to Home">
            <IconButton onClick={() => navigate("/home")} sx={{ color: "var(--text-secondary)" }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      <section className="historyWrapper">
        <div className="historyToolbar">
          <div className="sectionTitle" style={{ margin: 0, textAlign: "left" }}>
            <h2>
              <HistoryIcon sx={{ verticalAlign: "middle", mr: 1, color: "var(--cyan)" }} />
              Meeting History
            </h2>
            <p style={{ marginTop: 6 }}>
              Your previously joined meetings.&nbsp;
              <span style={{ color: "var(--cyan)", fontSize: "0.85rem" }}>
                <AdminPanelSettings sx={{ fontSize: 14, verticalAlign: "middle" }} />
                &nbsp;You are the host — you can delete your own records.
              </span>
            </p>
          </div>

          {meetings.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={() => setConfirmClear(true)}
              sx={{ borderRadius: "var(--radius-md)", fontWeight: 600, borderColor: "rgba(255,69,96,0.4)" }}
            >
              Clear All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="historyLoader">
            <CircularProgress sx={{ color: "var(--cyan)" }} />
          </div>
        ) : meetings.length === 0 ? (
          <div className="emptyHistory">
            <Videocam sx={{ fontSize: 60, color: "var(--text-muted)", mb: 2 }} />
            <h3>No Meetings Yet</h3>
            <p>Start your first meeting to see history here.</p>
            <Button
              variant="contained"
              onClick={() => navigate("/home")}
              sx={{
                mt: 2, borderRadius: "var(--radius-md)", fontWeight: 700,
                background: "linear-gradient(135deg,var(--cyan),var(--indigo))",
                color: "#050b18",
              }}
            >
              Go to Home
            </Button>
          </div>
        ) : (
          <div className="historyGrid">
            {meetings.map((item, idx) => {
              // User is always owner of their own records (enforced on backend)
              const canDelete = item.user_id === username;

              return (
                <div
                  className="historyCard"
                  key={item._id || idx}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  {/* Host badge */}
                  {canDelete && (
                    <span className="hostBadge">⭐ You</span>
                  )}

                  <div className="historyTop">
                    <div className="historyIcon">
                      <Videocam sx={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <span className="historyCode">{item.meetingCode}</span>
                    </div>
                  </div>

                  <div className="historyInfo">
                    <p>
                      <CalendarMonth sx={{ fontSize: 16 }} />
                      {fmtDate(item.date)}
                    </p>
                    <p>
                      <AccessTime sx={{ fontSize: 16 }} />
                      {fmtTime(item.date)}
                    </p>
                  </div>

                  <div className="historyCardActions">
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => navigate(`/${item.meetingCode}`)}
                      sx={{
                        borderRadius: "var(--radius-md)", fontWeight: 700,
                        background: "linear-gradient(135deg,var(--cyan),var(--indigo))",
                        color: "#050b18", flex: 1,
                        "&:hover": { boxShadow: "0 0 20px rgba(0,210,255,0.3)" },
                      }}
                    >
                      Join Again
                    </Button>

                    {/* Only show delete button if user owns this record */}
                    {canDelete && (
                      <Tooltip title="Delete this record (Host only)">
                        <IconButton
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          sx={{
                            border: "1px solid rgba(255,69,96,0.3)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--danger)",
                            "&:hover": { background: "rgba(255,69,96,0.1)" },
                          }}
                        >
                          {deletingId === item._id
                            ? <CircularProgress size={18} sx={{ color: "var(--danger)" }} />
                            : <DeleteOutline sx={{ fontSize: 20 }} />
                          }
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirm clear dialog */}
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        PaperProps={{
          sx: {
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", color: "var(--text-primary)",
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Clear All History?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "var(--text-secondary)" }}>
            This will permanently delete all your meeting records. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmClear(false)}
            sx={{ borderRadius: "var(--radius-md)", color: "var(--text-secondary)" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearAll}
            color="error" variant="contained"
            sx={{ borderRadius: "var(--radius-md)", fontWeight: 700 }}
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open} autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert severity={snack.type} variant="filled" sx={{ borderRadius: "var(--radius-md)" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}
