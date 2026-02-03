// feedbackRoutes.js
const express = require("express");
const dataCache = require("./dataCache");
const router = express.Router();

module.exports = (db) => {
    // Submit feedback (Only Clients)
    router.post("/submit", (req, res) => {
        const { client_id, message } = req.body;

        if (!client_id || !message) {
            return res.status(400).json({ error: "Client ID and message are required." });
        }

        const query = "INSERT INTO Feedback (client_id, message) VALUES (?, ?)";
        db.query(query, [client_id, message], (err, result) => {
            if (err) {
                console.error("Error submitting feedback:", err);
                return res.status(500).json({ error: "Failed to submit feedback." });
            }
            res.status(201).json({ success: true, message: "Feedback submitted successfully." });
        });
    });

    // Get all feedbacks (For admin)
    router.get("/all", (req, res) => {
        const results = dataCache.getAllFeedbacks();
        res.json(results);
    });

    router.get("/count", (req, res) => {
        const count = dataCache.getFeedbackCount();
        res.status(200).json({ count });
    });

    // ✅ Count of feedbacks from previous day
    // ✅ Count of feedbacks from previous day
    router.get("/count/yesterday", (req, res) => {
        const count = dataCache.getFeedbackCountYesterday();
        res.status(200).json({ count });
    });


    return router;
};
