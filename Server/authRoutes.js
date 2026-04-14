const express = require("express");

module.exports = (db) => {
    const router = express.Router();

    // Authentication route (Refactored for async/await)
    router.post("/", async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        const query = `
            SELECT 
                Auth.auth_id, Auth.username, Auth.password, Auth.role,
                Users.user_id, Clients.client_id
            FROM Auth
            LEFT JOIN Users ON Auth.auth_id = Users.auth_id
            LEFT JOIN Clients ON Auth.auth_id = Clients.auth_id
            WHERE Auth.username = ?`;

        try {
            // Using promise-based query
            const [results] = await db.query(query, [username]);

            if (results.length === 0) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const user = results[0];

            // Note: In production, use bcrypt.compare instead of plain text comparison
            if (user.password !== password) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Success
            res.json({ message: "Login successful", user });
        } catch (err) {
            console.error("❌ Database error during login:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    return router;
};
