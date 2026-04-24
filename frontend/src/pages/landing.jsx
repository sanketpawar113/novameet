// src/pages/landing.jsx

import React from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import {
  Videocam,
  Login,
  RocketLaunch,
  Groups,
  Security,
  Speed,
} from "@mui/icons-material";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Videocam />,
      title: "HD Video Meetings",
      desc: "Crystal clear audio & video meetings with real-time connection.",
    },
    {
      icon: <Groups />,
      title: "Multi User Rooms",
      desc: "Host multiple users in one room with live interaction.",
    },
    {
      icon: <Security />,
      title: "Secure Access",
      desc: "Protected rooms with private meeting codes.",
    },
    {
      icon: <Speed />,
      title: "Fast Performance",
      desc: "Optimized WebRTC + Socket.io based conferencing.",
    },
  ];

  return (
    <div className="landingPageContainer">
      {/* Navbar */}
      <nav>
        <div className="navLogo">
          <div className="navLogoIcon">
            <Videocam />
          </div>
          <h2>NovaMeet</h2>
        </div>

        <div className="navlist">
          <div
            className="navItem"
            onClick={() => navigate(`/guest-${Date.now()}`)}
          >
            Join as Guest
          </div>

          <div className="navItem" onClick={() => navigate("/auth")}>
            Register
          </div>

          <div className="navCta" onClick={() => navigate("/auth")}>
            <Login sx={{ fontSize: 18 }} />
            Login
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landingMainContainer">
        {/* Left */}
        <div className="heroText">
          <div className="heroBadge">
            <span className="heroBadgeDot"></span>
            Real Time Video Platform
          </div>

          <h1 className="heroTitle">
            Connect Anywhere with <span className="accent">NovaMeet</span>
          </h1>

          <p className="heroSubtitle">
            Professional real-time video conferencing platform built for
            students, teams, businesses and online meetings.
          </p>

          <div className="heroActions">
            <button
              className="btnPrimary"
              onClick={() => navigate("/auth")}
            >
              <RocketLaunch />
              Get Started
            </button>

            <button
              className="btnSecondary"
              onClick={() => navigate(`/guest-${Date.now()}`)}
            >
              Join Meeting
            </button>
          </div>

          <div className="heroStats">
            <div className="statItem">
              <span className="statValue">99.9%</span>
              <span className="statLabel">Uptime</span>
            </div>

            <div className="statItem">
              <span className="statValue">HD</span>
              <span className="statLabel">Quality</span>
            </div>

            <div className="statItem">
              <span className="statValue">Live</span>
              <span className="statLabel">Chat</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="heroVisual">
          <div className="videoPreviewCard">
            <div className="videoGrid">
              <div className="videoThumb">
                <div className="avatar">A</div>
                <span className="videoThumbLabel">Host</span>
                <span className="videoThumbActive"></span>
              </div>

              <div className="videoThumb">
                <div className="avatar">S</div>
                <span className="videoThumbLabel">Student</span>
              </div>

              <div className="videoThumb">
                <div className="avatar">M</div>
                <span className="videoThumbLabel">Member</span>
              </div>
            </div>

            <div className="videoCardControls">
              <div className="vcBtn">🎤</div>
              <div className="vcBtn active">📹</div>
              <div className="vcBtn">💬</div>
              <div className="vcBtn danger">📞</div>
            </div>
          </div>

          <div className="floatingBadge badge1">🔒 Secure</div>
          <div className="floatingBadge badge2">⚡ Fast Connect</div>
        </div>
      </section>

      {/* Features */}
      <section className="featuresSection">
        <div className="sectionTitle">
          <h2>Why Choose NovaMeet?</h2>
          <p>Everything you need for professional online meetings.</p>
        </div>

        <div className="featuresGrid">
          {features.map((item, index) => (
            <div className="featureCard" key={index}>
              <div className="featureIcon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}