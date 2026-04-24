// src/pages/home.jsx

import React, { useContext, useState } from "react";
import "../App.css";

import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";

import {
  Videocam,
  History,
  Logout,
  Add,
  RocketLaunch,
  ContentCopy,
  Person,
} from "@mui/icons-material";

import {
  Button,
  IconButton,
  TextField,
  Tooltip,
  Avatar,
  Snackbar,
  Alert,
} from "@mui/material";

function HomeComponent() {
  const navigate = useNavigate();

  const { addToUserHistory } = useContext(AuthContext);

  const [meetingCode, setMeetingCode] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    msg: "",
    type: "success",
  });

  const username =
    localStorage.getItem("username") || "User";

  const showMessage = (
    msg,
    type = "success"
  ) => {
    setSnack({
      open: true,
      msg,
      type,
    });
  };

  const generateMeetingCode = () => {
    const code =
      "NM-" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    setMeetingCode(code);
  };

  const copyCode = async () => {
    if (!meetingCode)
      return showMessage(
        "Generate meeting code first",
        "warning"
      );

    await navigator.clipboard.writeText(
      meetingCode
    );

    showMessage("Meeting code copied");
  };

  const joinMeeting = async () => {
    if (!meetingCode.trim()) {
      return showMessage(
        "Enter meeting code",
        "error"
      );
    }

    await addToUserHistory(meetingCode);
    navigate(`/${meetingCode}`);
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/auth");
  };

  return (
    <div className="homePage">
      {/* Navbar */}
      <header className="navBar">
        <div className="navBarLogo">
          <div className="logoIcon">
            <Videocam />
          </div>
          <h2>NovaMeet</h2>
        </div>

        <div className="navActions">
          <Tooltip title="History">
            <IconButton
              onClick={() =>
                navigate("/history")
              }
            >
              <History />
            </IconButton>
          </Tooltip>

          <Avatar
            sx={{
              width: 34,
              height: 34,
            }}
          >
            <Person />
          </Avatar>

          <Button
            color="error"
            startIcon={<Logout />}
            onClick={logoutUser}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main */}
      <section className="meetContainer">
        {/* Left Side */}
        <div className="leftPanel">
          <div className="leftPanelContent">
            <div className="heroBadge">
              <span className="heroBadgeDot"></span>
              Welcome {username}
            </div>

            <h2>
              Start or Join Your{" "}
              <span>Video Meeting</span>
            </h2>

            <p>
              Create instant meeting rooms,
              collaborate with your team and
              connect securely anywhere.
            </p>

            <div className="joinFormRow">
              <TextField
                fullWidth
                label="Meeting Code"
                variant="outlined"
                value={meetingCode}
                onChange={(e) =>
                  setMeetingCode(
                    e.target.value
                  )
                }
              />

              <Button
                variant="contained"
                size="large"
                onClick={joinMeeting}
              >
                Join
              </Button>
            </div>

            <div className="quickActions">
              <button
                className="quickAction"
                onClick={
                  generateMeetingCode
                }
              >
                <Add />
                Generate Code
              </button>

              <button
                className="quickAction"
                onClick={copyCode}
              >
                <ContentCopy />
                Copy
              </button>

              <button
                className="quickAction"
                onClick={joinMeeting}
              >
                <RocketLaunch />
                Start Now
              </button>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="rightPanel">
          <div className="rightPanelVisual">
            <div className="videoPreviewCard">
              <div className="videoGrid">
                <div className="videoThumb">
                  <div className="avatar">
                    Y
                  </div>
                  <span className="videoThumbLabel">
                    You
                  </span>
                  <span className="videoThumbActive"></span>
                </div>

                <div className="videoThumb">
                  <div className="avatar">
                    T
                  </div>
                  <span className="videoThumbLabel">
                    Team
                  </span>
                </div>

                <div className="videoThumb">
                  <div className="avatar">
                    C
                  </div>
                  <span className="videoThumbLabel">
                    Client
                  </span>
                </div>
              </div>

              <div className="videoCardControls">
                <div className="vcBtn">
                  🎤
                </div>
                <div className="vcBtn active">
                  📹
                </div>
                <div className="vcBtn">
                  💬
                </div>
                <div className="vcBtn danger">
                  📞
                </div>
              </div>
            </div>

            <div className="floatingBadge badge1">
              🔒 Secure Room
            </div>

            <div className="floatingBadge badge2">
              ⚡ Fast Connect
            </div>
          </div>
        </div>
      </section>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() =>
          setSnack({
            ...snack,
            open: false,
          })
        }
      >
        <Alert
          severity={snack.type}
          variant="filled"
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default withAuth(HomeComponent);