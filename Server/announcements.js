const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // Add announcement
    // In your announcements route file
    router.post("/", (req, res) => {
        const { auth_id, title, message } = req.body;
        const query = "INSERT INTO Announcements (auth_id, title, message) VALUES (?, ?, ?)";

        db.query(query, [auth_id, title, message], (err, result) => {
            if (err) {
                console.error("Error adding announcement:", err);
                return res.status(500).json({
                    error: "Failed to add announcement",
                    details: err.message // Include more error details
                });
            }

            // Fetch and return the complete announcement
            db.query("SELECT * FROM Announcements WHERE announcement_id = ?", [result.insertId], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(201).json({
                        announcement_id: result.insertId,
                        auth_id,
                        title,
                        message,
                        created_at: new Date().toISOString()
                    });
                }
                res.status(201).json(results[0]);
            });
        });
    });

    // Get all announcements
    router.get("/", (req, res) => {
        const results = dataCache.getAllAnnouncements();
        res.json(results);
    });

    return router;
};
