const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    const clientId = req.query.client_id;
    const results = dataCache.getClientData(clientId);
    
    // If a specific clientId was requested, return it directly
    if (clientId) {
      return res.json(results[0] || {});
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (page && limit) {
      const offset = (page - 1) * limit;
      const paginatedResults = results.slice(offset, offset + limit);
      return res.json({
        data: paginatedResults,
        pagination: {
          currentPage: page,
          pageSize: limit,
          total: results.length,
          totalPages: Math.ceil(results.length / limit)
        }
      });
    }

    res.json(results);
  });

  return router;
};