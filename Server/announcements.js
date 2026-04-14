const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // Add announcement
    router.post("/", async (req, res) => {
        const { auth_id, title, message } = req.body;
        const query = "INSERT INTO Announcements (auth_id, title, message) VALUES (?, ?, ?)";

        try {
            const [result] = await db.query(query, [auth_id, title, message]);

            // Fetch and return the complete announcement
            const [results] = await db.query("SELECT * FROM Announcements WHERE announcement_id = ?", [result.insertId]);
            
            if (results.length === 0) {
                return res.status(201).json({
                    announcement_id: result.insertId,
                    auth_id,
                    title,
                    message,
                    created_at: new Date().toISOString()
                });
            }
            res.status(201).json(results[0]);
        } catch (err) {
            console.error("Error adding announcement:", err);
            return res.status(500).json({
                error: "Failed to add announcement",
                details: err.message
            });
        }
    });

    // Get all announcements
    router.get("/", (req, res) => {
        const results = dataCache.getAllAnnouncements();
        res.json(results);
    });

    return router;
};
