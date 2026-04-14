const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // Fetch all clients sweepingly (Paginated)
    router.get("/", async (req, res) => {
        let results = dataCache.getClients();
        
        if (results.length === 0) {
          try {
            const [rows] = await db.query(`
              SELECT Clients.*, Auth.username, Auth.role
              FROM Clients
              INNER JOIN Auth ON Clients.auth_id = Auth.auth_id
            `);
            results = rows;
          } catch (err) {
            console.error("Client list fallback error:", err);
          }
        }

        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;

        if (page && limit) {
          const offset = (page - 1) * limit;
          return res.json({
            data: results.slice(offset, offset + limit),
            pagination: { currentPage: page, pageSize: limit, total: results.length, totalPages: Math.ceil(results.length / limit) }
          });
        }
        res.json(results);
    });

    // Fetch a specific client by client_id (Primary ID for lookups)
    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        
        // 1. Try Cache using the client_id primary key
        let client = dataCache.getClient(id);
        if (client) return res.json(client);

        // 2. Fallback to DB (Check by client_id)
        const query = `
            SELECT Clients.*, Auth.username, Auth.role
            FROM Clients
            INNER JOIN Auth ON Clients.auth_id = Auth.auth_id
            WHERE Clients.client_id = ?`;

        try {
            const [results] = await db.query(query, [id]);
            if (results.length > 0) return res.json(results[0]);

            // 3. Last Resort: Try by auth_id (for backwards compatibility during transition)
            const [authResults] = await db.query(`
                SELECT Clients.*, Auth.username, Auth.role
                FROM Clients
                INNER JOIN Auth ON Clients.auth_id = Auth.auth_id
                WHERE Clients.auth_id = ?`, [id]);
            
            if (authResults.length > 0) return res.json(authResults[0]);

            return res.status(404).json({ error: "Client profile not found" });
        } catch (err) {
            console.error("Database error during client fetch:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};
