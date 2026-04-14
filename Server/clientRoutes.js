const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // console.log("Clients route file is loaded!"); // Debugging log

    // Fetch all clients with their contacts (Paginated)
    router.get("/", (req, res) => {
        // console.log("Received request to fetch all clients");
        const results = dataCache.getClients();
        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;

        if (page && limit) {
          const offset = (page - 1) * limit;
          const paginatedResults = results.slice(offset, offset + limit);
          res.json({
            data: paginatedResults,
            pagination: {
              currentPage: page,
              pageSize: limit,
              total: results.length,
              totalPages: Math.ceil(results.length / limit)
            }
          });
        } else {
          res.json(results);
        }
    });

    // Fetch a specific client with their contacts by auth_id
    router.get("/:id", (req, res) => {
        const { id } = req.params;
        const client = dataCache.getClientByAuthId(id);

        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        res.json(client);
    });

    return router;
};
