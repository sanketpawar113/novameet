import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
    {
        user_id: { type: String },           // username of the person who joined
        host_id: { type: String },           // username of the host (creator)
        meetingCode: { type: String, required: true },
        isHost: { type: Boolean, default: false },
        date: { type: Date, default: Date.now, required: true }
    }
)

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };