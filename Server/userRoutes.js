// console.log("Users route file is loaded!");

const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
  const router = express.Router();

  // Fetch all users with their roles
  router.get("/", (req, res) => {
    // console.log("Received request to fetch all users with roles");
    const results = dataCache.getUsers();
    // console.log(`Fetched ${results.length} users with roles from cache`);
    res.json(results);
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