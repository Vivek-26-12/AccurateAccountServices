const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // Fetch all clients with their contacts (Paginated)
    router.get("/", async (req, res) => {
        let results = dataCache.getClients();
        
        // DB Fallback if Cache is empty
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

    // Fetch a specific client with their contacts by auth_id (Resilient)
    router.get("/:id", async (req, res) => {
        const { id } = req.params;
        
        // 1. Try Cache
        const cachedClient = dataCache.getClientByAuthId(id);
        if (cachedClient) return res.json(cachedClient);

        // 2. Fallback to DB
        const query = `
            SELECT Clients.client_id, Clients.auth_id, Auth.username, Auth.role,
                   Clients.company_name, Clients.contact_person, Clients.email,
                   Clients.gstin, Clients.pan_number, Clients.profile_pic,
                   Clients.created_at, Clients.updated_at
            FROM Clients
            INNER JOIN Auth ON Clients.auth_id = Auth.auth_id
            WHERE Clients.auth_id = ?`;

        try {
            const [results] = await db.query(query, [id]);
            if (results.length === 0) {
                return res.status(404).json({ error: "Client not found" });
            }
            
            res.json({
                ...results[0],
                contacts: [] 
            });
        } catch (err) {
            console.error("Database error during client fallback:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};
