const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // console.log("Clients route file is loaded!"); // Debugging log

    // Fetch all clients with their contacts
    router.get("/", (req, res) => {
        // console.log("Received request to fetch all clients");
        const results = dataCache.getClients();
        res.json(results);
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
