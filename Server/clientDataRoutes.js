const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    const clientId = req.query.client_id;
    const results = dataCache.getClientData(clientId);
    res.json(clientId ? results[0] || {} : results);
  });

  return router;
};