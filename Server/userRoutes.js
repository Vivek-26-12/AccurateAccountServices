// userRoutes.js
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

  /**
   * Fetch profile by auth_id (Unified for Admin, Employee, and Client)
   * This ensures that IDs like 34 (clients) work correctly through this endpoint.
   */
  router.get("/auth/:auth_id", async (req, res) => {
    const { auth_id } = req.params;
    
    try {
      // 1. Try Admin/Employee Cache First
      let profile = dataCache.getUserByAuthId(auth_id);
      if (profile) return res.json(profile);

      // 2. Try Client Cache
      profile = dataCache.getClientByAuthId(auth_id);
      if (profile) return res.json(profile);

      // 3. Fallback to DB - Check USERS first
      const userQuery = `
        SELECT 
          Users.user_id, Users.auth_id, Auth.username, Auth.role, 
          Users.first_name, Users.last_name, Users.email, Users.phone, 
          Users.profile_pic, Users.created_at, Users.updated_at 
        FROM Users 
        INNER JOIN Auth ON Users.auth_id = Auth.auth_id
        WHERE Users.auth_id = ?`;
      
      const [userResults] = await db.query(userQuery, [auth_id]);
      if (userResults.length > 0) return res.json(userResults[0]);

      // 4. Fallback to DB - Check CLIENTS
      const clientQuery = `
        SELECT 
          Clients.client_id, Clients.auth_id, Auth.username, Auth.role,
          Clients.company_name, Clients.contact_person, Clients.email,
          Clients.gstin, Clients.pan_number, Clients.profile_pic,
          Clients.created_at, Clients.updated_at
        FROM Clients
        INNER JOIN Auth ON Clients.auth_id = Auth.auth_id
        WHERE Clients.auth_id = ?`;

      const [clientResults] = await db.query(clientQuery, [auth_id]);
      if (clientResults.length > 0) return res.json(clientResults[0]);

      // Not found anywhere
      return res.status(404).json({ error: "User Profile Not Found" });

    } catch (err) {
      console.error("Database error during unified profile lookup:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};