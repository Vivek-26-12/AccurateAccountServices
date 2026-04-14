// unseenMessagesRoutes.js
const express = require("express");
const router = express.Router();

module.exports = (db) => {
    // Route: GET /unseen-messages/all?user_id=1
    router.get("/unseen-messages/all", async (req, res) => {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        // Object to store all unseen counts
        const unseenCounts = {
            personal_chats: {},
            group_chats: {}
        };

        const personalQuery = `
            SELECT sender_id, COUNT(*) as unseen_count
            FROM PersonalChats
            WHERE receiver_id = ? AND is_seen = FALSE
            GROUP BY sender_id
        `;

        const groupQuery = `
            SELECT group_id, COUNT(*) as unseen_count
            FROM GroupChatMessageSeen
            WHERE user_id = ? AND is_seen = FALSE
            GROUP BY group_id
        `;

        try {
            // Execute both queries in parallel
            const [[personalResults], [groupResults]] = await Promise.all([
                db.query(personalQuery, [user_id]),
                db.query(groupQuery, [user_id])
            ]);

            personalResults.forEach(row => {
                unseenCounts.personal_chats[row.sender_id] = row.unseen_count;
            });

            groupResults.forEach(row => {
                unseenCounts.group_chats[row.group_id] = row.unseen_count;
            });

            res.json(unseenCounts);
        } catch (error) {
            console.error("Error fetching unseen messages summary:", error);
            res.status(500).json({ error: "Database error fetching unseen messages" });
        }
    });

    router.get("/unseen-messages", async (req, res) => {
        const { user_id, group_id } = req.query;
        if (!user_id || !group_id) return res.status(400).json({ error: "Missing params" });

        const query = `
            SELECT COUNT(*) AS unseen_count
            FROM GroupChatMessageSeen
            WHERE user_id = ? AND group_id = ? AND is_seen = FALSE
        `;
        try {
            const [results] = await db.query(query, [user_id, group_id]);
            res.json({ unseen_count: results[0].unseen_count });
        } catch (err) {
            res.status(500).json({ error: "Database error" });
        }
    });

    router.post("/mark-personal-messages-seen", async (req, res) => {
        const { sender_id, receiver_id } = req.body;
        const query = `UPDATE PersonalChats SET is_seen = TRUE WHERE sender_id = ? AND receiver_id = ?`;
        try {
            await db.query(query, [sender_id, receiver_id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Error updating messages" });
        }
    });

    router.post("/mark-group-messages-seen", async (req, res) => {
        const { user_id, group_id } = req.body;
        const query = `UPDATE GroupChatMessageSeen SET is_seen = TRUE WHERE user_id = ? AND group_id = ? AND is_seen = FALSE`;
        try {
            await db.query(query, [user_id, group_id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Error updating messages" });
        }
    });

    router.get("/messages/unseen-count", async (req, res) => {
        const { user_id, receiver_id } = req.query;
        const query = `SELECT COUNT(*) as unseen_count FROM PersonalChats WHERE sender_id = ? AND receiver_id = ? AND is_seen = 0`;
        try {
            const [results] = await db.query(query, [user_id, receiver_id]);
            res.json(results[0]);
        } catch (err) {
            res.status(500).json({ error: "Error fetching unseen count" });
        }
    });

    return router;
};