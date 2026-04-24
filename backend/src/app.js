import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

// Load .env only in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const server = createServer(app);

// Socket.IO
connectToSocket(server);

// Port
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ extended: true, limit: "40kb" }));

// Home Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NOVAMEET API Running 🚀",
  });
});

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/v1/users", userRoutes);

// MongoDB URL
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/zoom";

// Start Server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB Connected Successfully");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.log("❌ MongoDB Connection Failed");
    console.log(error.message);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Server shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Server terminated...");
  await mongoose.connection.close();
  process.exit(0);
});