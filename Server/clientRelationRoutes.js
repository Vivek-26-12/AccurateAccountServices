const express = require("express");
const dataCache = require("./dataCache");

const RECENT_EXPIRY_DAYS = 7;

module.exports = (db) => {
    const router = express.Router();

    // 📌 Add Favourite
    router.post("/favourite", async (req, res) => {
        const { user_id, client_id } = req.body;
        try {
            await db.query(`
                INSERT INTO ClientUserRelations (user_id, client_id, relation_type) 
                VALUES (?, ?, 'Favourite')
                ON DUPLICATE KEY UPDATE relation_type = 'Favourite', created_at = NOW()
            `, [user_id, client_id]);
            res.send("Client marked as favourite.");
        } catch (err) {
            console.error("Error adding favourite:", err);
            res.status(500).send("Error adding to favourite.");
        }
    });

    // ❌ Remove Favourite
    router.delete("/favourite", async (req, res) => {
        const { user_id, client_id } = req.body;
        try {
            await db.query(`
                DELETE FROM ClientUserRelations 
                WHERE user_id = ? AND client_id = ? AND relation_type = 'Favourite'
            `, [user_id, client_id]);
            res.send("Client removed from favourite.");
        } catch (err) {
            console.error("Error removing favourite:", err);
            res.status(500).send("Error removing from favourite.");
        }
    });

    // ⚡ Add Recent
    router.post("/recent", async (req, res) => {
        const { user_id, client_id } = req.body;
        try {
            // Cleanup old recents
            await db.query(`
                DELETE FROM ClientUserRelations 
                WHERE relation_type = 'Recent' 
                AND created_at < (NOW() - INTERVAL ? DAY)
            `, [RECENT_EXPIRY_DAYS]);

            await db.query(`
                INSERT INTO ClientUserRelations (user_id, client_id, relation_type) 
                VALUES (?, ?, 'Recent')
                ON DUPLICATE KEY UPDATE created_at = NOW()
            `, [user_id, client_id]);
            res.send("Client added to recent.");
        } catch (err) {
            console.error("Error adding recent:", err);
            res.status(500).send("Error adding to recent.");
        }
    });

    // 📄 Get all relations for a user
    router.get("/:userId", (req, res) => {
        const userId = req.params.userId;
        const results = dataCache.getClientRelations(userId);
        res.json(results);
    });

    return router;
};