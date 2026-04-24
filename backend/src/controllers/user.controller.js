import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please provide username and password" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token, username: user.username, name: user.name });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or Password" });
        }
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ name, username, password: hashedPassword });
        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        res.json(meetings);
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        // Check if already exists for this user+code combo (avoid duplicates)
        const existing = await Meeting.findOne({ user_id: user.username, meetingCode: meeting_code });

        if (!existing) {
            const newMeeting = new Meeting({
                user_id: user.username,
                host_id: user.username,  // person who creates is the host
                meetingCode: meeting_code,
                isHost: true
            });
            await newMeeting.save();
        }

        res.status(httpStatus.CREATED).json({ message: "Added to history" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ─── HOST-ONLY: Delete a single meeting from history ───────────────────────
const deleteHistoryItem = async (req, res) => {
    const { token, meetingId } = req.body;

    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const meeting = await Meeting.findById(meetingId);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        // Only host (or owner of the record) can delete
        if (meeting.user_id !== user.username) {
            return res.status(403).json({ message: "Access denied. Only the host can delete this record." });
        }

        await Meeting.findByIdAndDelete(meetingId);
        res.json({ message: "Meeting deleted successfully" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ─── HOST-ONLY: Clear all history ──────────────────────────────────────────
const clearAllHistory = async (req, res) => {
    const { token } = req.body;

    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        await Meeting.deleteMany({ user_id: user.username });
        res.json({ message: "All history cleared" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

export { login, register, getUserHistory, addToHistory, deleteHistoryItem, clearAllHistory };