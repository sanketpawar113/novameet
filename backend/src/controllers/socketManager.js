import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let roomHosts = {};      // meetingCode → host socketId (first joiner is host)
let usernames = {};      // socketId → username

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join-call", (path, username) => {
            if (connections[path] === undefined) {
                connections[path] = [];
            }

            connections[path].push(socket.id);
            usernames[socket.id] = username || "Guest";
            timeOnline[socket.id] = new Date();

            // First to join becomes host
            const isHost = connections[path].length === 1;
            if (isHost) {
                roomHosts[path] = socket.id;
            }

            // Notify all in room
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit(
                    "user-joined",
                    socket.id,
                    connections[path],
                    usernames,
                    roomHosts[path]
                );
            }

            // Replay messages to new joiner
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; a++) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a]["data"],
                        messages[path][a]["sender"],
                        messages[path][a]["socket-id-sender"]
                    );
                }
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    sender,
                    data,
                    "socket-id-sender": socket.id
                });

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // ─── Host kicks a participant ───────────────────────────────────────
        socket.on("kick-user", (path, targetSocketId) => {
            // Only host can kick
            if (roomHosts[path] === socket.id) {
                io.to(targetSocketId).emit("kicked");
                // Force disconnect signal
                io.to(targetSocketId).emit("user-left", targetSocketId);
            }
        });

        // ─── Host mutes a participant ───────────────────────────────────────
        socket.on("mute-user", (path, targetSocketId) => {
            if (roomHosts[path] === socket.id) {
                io.to(targetSocketId).emit("muted-by-host");
            }
        });

        socket.on("disconnect", () => {
            const diffTime = Math.abs(timeOnline[socket.id] - new Date());
            delete usernames[socket.id];

            for (const [k, v] of JSON.parse(
                JSON.stringify(Object.entries(connections))
            )) {
                for (let a = 0; a < v.length; a++) {
                    if (v[a] === socket.id) {
                        const key = k;

                        // If host left, reassign host to next person
                        if (roomHosts[key] === socket.id) {
                            const remaining = connections[key].filter(
                                (id) => id !== socket.id
                            );
                            if (remaining.length > 0) {
                                roomHosts[key] = remaining[0];
                                io.to(remaining[0]).emit("host-assigned");
                            } else {
                                delete roomHosts[key];
                            }
                        }

                        for (let b = 0; b < connections[key].length; b++) {
                            io.to(connections[key][b]).emit("user-left", socket.id);
                        }

                        const index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        if (connections[key].length === 0) {
                            delete connections[key];
                        }
                    }
                }
            }
        });
    });

    return io;
};