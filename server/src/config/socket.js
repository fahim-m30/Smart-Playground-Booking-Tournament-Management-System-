const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initializeSocket = (httpServer) => {
    io = new Server(httpServer, { cors: { origin: true, credentials: true } });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Authentication required"));
            socket.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            return next();
        } catch (_) { return next(new Error("Invalid authentication")); }
    });
    io.on("connection", (socket) => {
        socket.join(`user:${socket.user.userId}`);
        socket.join("dashboard");
    });
    return io;
};

const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
const emitDashboardUpdate = (payload) => io?.to("dashboard").emit("dashboard:update", payload);

module.exports = { initializeSocket, emitToUser, emitDashboardUpdate };
