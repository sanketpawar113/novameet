// src/pages/authentication.jsx
// Optimized Final Version - Attractive + Responsive + Clean Structure

import React, {
  useContext,
  useState,
} from "react";
import "../App.css";

import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";

import {
  Person,
  AlternateEmail,
  Lock,
  Visibility,
  VisibilityOff,
  Videocam,
  ArrowForward,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function Authentication() {
  const navigate = useNavigate();

  const {
    handleLogin,
    handleRegister,
  } = useContext(AuthContext);

  const [mode, setMode] =
    useState("login");

  const [form, setForm] =
    useState({
      name: "",
      username: "",
      password: "",
    });

  const [showPass, setShowPass] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [snack, setSnack] =
    useState({
      open: false,
      msg: "",
      type: "success",
    });

  /* ===================== */
  /* Helpers               */
  /* ===================== */

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

  const updateField = (
    key,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFields = () => {
    setForm({
      name: "",
      username: "",
      password: "",
    });
  };

  /* ===================== */
  /* Submit                */
  /* ===================== */

  const submitHandler =
    async () => {
      const {
        name,
        username,
        password,
      } = form;

      if (
        !username.trim() ||
        !password.trim()
      ) {
        return showMessage(
          "Please fill all fields",
          "error"
        );
      }

      if (
        mode === "register" &&
        !name.trim()
      ) {
        return showMessage(
          "Enter full name",
          "error"
        );
      }

      try {
        setLoading(true);

        if (
          mode === "login"
        ) {
          await handleLogin(
            username,
            password
          );

          showMessage(
            "Login Successful"
          );

          navigate("/home");
        } else {
          await handleRegister(
            name,
            username,
            password
          );

          showMessage(
            "Account Created Successfully"
          );

          setMode("login");
          resetFields();
        }
      } catch (error) {
        showMessage(
          error?.response?.data
            ?.message ||
            "Something went wrong",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

  /* ===================== */
  /* UI                    */
  /* ===================== */

  return (
    <div className="authPage">
      {/* LEFT PANEL */}

      <div className="authLeft">
        <div className="authBrand">
          <div className="authLogo">
            <Videocam />
          </div>

          <h1>NovaMeet</h1>
        </div>

        <div className="heroBadge">
          Smart Video Platform
        </div>

        <h2>
          Connect with{" "}
          <span>
            Teams,
            Friends,
            Clients
          </span>
        </h2>

        <p>
          Secure HD video
          meetings with live
          chat, meeting
          history and smooth
          collaboration from
          anywhere.
        </p>

        <div className="authPoints">
          <span>
            ✔ HD Video Calls
          </span>
          <span>
            ✔ Live Chat Rooms
          </span>
          <span>
            ✔ Responsive UI
          </span>
          <span>
            ✔ Meeting History
          </span>
        </div>
      </div>

      {/* RIGHT PANEL */}

      <div className="authRight">
        <Paper
          elevation={0}
          className="authCard"
        >
          <Typography
            variant="h4"
            fontWeight="800"
            mb={1}
          >
            {mode ===
            "login"
              ? "Welcome Back"
              : "Create Account"}
          </Typography>

          <Typography
            color="text.secondary"
            mb={3}
          >
            {mode ===
            "login"
              ? "Login to continue your meetings"
              : "Create account to start using NovaMeet"}
          </Typography>

          {/* Name */}

          {mode ===
            "register" && (
            <TextField
              fullWidth
              label="Full Name"
              margin="normal"
              value={
                form.name
              }
              onChange={(
                e
              ) =>
                updateField(
                  "name",
                  e.target
                    .value
                )
              }
              InputProps={{
                startAdornment:
                  (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
              }}
            />
          )}

          {/* Username */}

          <TextField
            fullWidth
            label="Username"
            margin="normal"
            value={
              form.username
            }
            onChange={(
              e
            ) =>
              updateField(
                "username",
                e.target
                  .value
              )
            }
            InputProps={{
              startAdornment:
                (
                  <InputAdornment position="start">
                    <AlternateEmail />
                  </InputAdornment>
                ),
            }}
          />

          {/* Password */}

          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type={
              showPass
                ? "text"
                : "password"
            }
            value={
              form.password
            }
            onChange={(
              e
            ) =>
              updateField(
                "password",
                e.target
                  .value
              )
            }
            InputProps={{
              startAdornment:
                (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
              endAdornment:
                (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPass(
                          !showPass
                        )
                      }
                    >
                      {showPass ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
            }}
          />

          {/* Button */}

          <Button
            fullWidth
            variant="contained"
            size="large"
            endIcon={
              <ArrowForward />
            }
            sx={{
              mt: 3,
              height: 52,
              borderRadius: 3,
              fontWeight: 700,
            }}
            onClick={
              submitHandler
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Please wait..."
              : mode ===
                "login"
              ? "Login"
              : "Register"}
          </Button>

          <Divider
            sx={{
              my: 3,
            }}
          />

          {/* Switch */}

          <Box
            textAlign="center"
          >
            <Typography variant="body2">
              {mode ===
              "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </Typography>

            <Button
              sx={{
                mt: 1,
                fontWeight: 700,
              }}
              onClick={() =>
                setMode(
                  mode ===
                    "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {mode ===
              "login"
                ? "Create Account"
                : "Login Here"}
            </Button>
          </Box>
        </Paper>
      </div>

      {/* Snackbar */}

      <Snackbar
        open={snack.open}
        autoHideDuration={
          3000
        }
        onClose={() =>
          setSnack({
            ...snack,
            open: false,
          })
        }
      >
        <Alert
          severity={
            snack.type
          }
          variant="filled"
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}