// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

// Database connection pool (Refactored)
const db = require("./db");

// Route imports
const authRoutes = require("./authRoutes");
const clientRoutes = require("./clientRoutes");
const userRoutes = require("./userRoutes");
const registerRoute = require("./registerRoutes");
const clientDataRoutes = require("./clientDataRoutes");
const uploadImportantRoutes = require("./uploadImportantRoutes");
const uploadOtherRoutes = require("./uploadOtherRoutes");
const updateRoutes = require("./updateRoutes");
const folderRoutes = require("./folderRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const chatRoutes = require("./chatRoutes");
const taskRoutes = require("./taskRoutes");
const guestMessageRoutes = require("./guestMessageRoutes");
const announcementsRouter = require('./announcements');
const clientRelationRoutes = require("./clientRelationRoutes");
const deleteUserClientRoutes = require("./deleteUserClientRoute");
const unseenMessagesRoutes = require("./unseenMessagesRoutes");
const dataCache = require("./dataCache");

// Start Data Cache Polling
dataCache.start();

// Add this to Server/index.js
// Keep-Alive: Ping the DB every 5 minutes to prevent Aiven from sleeping
setInterval(async () => {
    try {
        await db.query('SELECT 1');
        console.log('Database heartbeat sent to Aiven');
    } catch (err) {
        console.error('Heartbeat failed:', err.message);
    }
}, 5 * 60 * 1000);

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    },
});

// Socket.io Connection Handler
io.on("connection", (socket) => {
    socket.on("join_room", (room) => {
        socket.join(room);
    });

    socket.on("leave_room", (room) => {
        socket.leave(room);
    });
});

// Root Route
app.get("/", (req, res) => {
    res.send("Node.js server is running and database is connected via pool!");
});

// Mount Routes (Passing the promise-based pool)
app.use("/auth", authRoutes(db));
app.use("/clients", clientRoutes(db));
app.use("/users", userRoutes(db));
app.use("/", registerRoute(db));
app.use("/clientDataRoutes", clientDataRoutes(db));
app.use("/", uploadImportantRoutes(db));
app.use("/", uploadOtherRoutes(db));
app.use("/update", updateRoutes(db));
app.use("/folders", folderRoutes(db));
app.use("/feedback", feedbackRoutes(db));
app.use("/chats", chatRoutes(db, io));
app.use("/", unseenMessagesRoutes(db));
app.use("/", taskRoutes(db));
app.use("/guest-messages", guestMessageRoutes(db));
app.use('/announcements', announcementsRouter(db));
app.use("/client-relations", clientRelationRoutes(db));
app.use("/delete", deleteUserClientRoutes(db, io));

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});