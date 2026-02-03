// guestMessageRoutes.js
const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // Route to add a guest message
    router.post("/", (req, res) => {
        const { guest_name, guest_email, message } = req.body;

        if (!guest_name || !guest_email || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const query = `
            INSERT INTO GuestMessages (guest_name, guest_email, message)
            VALUES (?, ?, ?)
        `;

        db.query(query, [guest_name, guest_email, message], (err, result) => {
            if (err) {
                console.error("Error inserting guest message:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            res.status(201).json({ message: "Message sent successfully!" });
        });
    });

    // Route to get all guest messages (admin use)
    router.get("/", (req, res) => {
        const results = dataCache.getAllGuestMessages();
        res.status(200).json(results);
    });

    router.get("/count", (req, res) => {
        const count = dataCache.getGuestMessageCount();
        res.status(200).json({ count });
    });

    router.get("/count/yesterday", (req, res) => {
        const count = dataCache.getGuestMessageCountYesterday();
        res.status(200).json({ count });
    });

    return router;
};
