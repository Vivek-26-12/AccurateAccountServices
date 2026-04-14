// console.log("Users route file is loaded!");

const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
  const router = express.Router();

  // Fetch all users with their roles
  // Fetch all users with their roles (Paginated)
  router.get("/", (req, res) => {
    // console.log("Received request to fetch all users with roles");
    const results = dataCache.getUsers();
    // console.log(`Fetched ${results.length} users with roles from cache`);
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

  // Fetch a specific user by ID with role
  router.get("/:id", (req, res) => {
    const { id } = req.params;
    const user = dataCache.getUser(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  // Fetch user by auth_id with role
  router.get("/auth/:auth_id", (req, res) => {
    const { auth_id } = req.params;
    const user = dataCache.getUserByAuthId(auth_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  return router;
};