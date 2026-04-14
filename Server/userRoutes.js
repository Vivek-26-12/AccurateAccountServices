// console.log("Users route file is loaded!");

const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
  const router = express.Router();

  // Fetch all users with their roles (Paginated)
  router.get("/", (req, res) => {
    const results = dataCache.getUsers();
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

  // Fetch user by auth_id with role (Resilient with DB fallback)
  router.get("/auth/:auth_id", async (req, res) => {
    const { auth_id } = req.params;
    
    // 1. Try Cache First (Fastest)
    const cachedUser = dataCache.getUserByAuthId(auth_id);
    if (cachedUser) {
      return res.json(cachedUser);
    }

    // 2. Fallback to DB (If cache is hydrating or missing entry)
    const query = `
      SELECT 
        Users.user_id, Users.auth_id, Auth.username, Auth.role, 
        Users.first_name, Users.last_name, Users.email, Users.phone, 
        Users.profile_pic, Users.created_at, Users.updated_at 
      FROM Users 
      INNER JOIN Auth ON Users.auth_id = Auth.auth_id
      WHERE Users.auth_id = ?`;

    try {
      const [results] = await db.query(query, [auth_id]);

      if (results.length === 0) {
        return res.status(404).json({ error: "User Profile Not Found" });
      }

      res.json(results[0]);
    } catch (err) {
      console.error("Database error during user auth fallback:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};