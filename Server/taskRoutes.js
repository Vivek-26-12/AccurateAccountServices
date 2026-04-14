const express = require("express");
const dataCache = require("./dataCache");
const router = express.Router();

module.exports = (db) => {
  // GET / - Fetch all tasks
  router.get("/", async (req, res) => {
    let results = dataCache.getTasks();
    
    // DB Fallback if cache is empty
    if (results.length === 0) {
      try {
        const [rows] = await db.query(`
          SELECT t.*, assignedBy.first_name AS assigned_by_first_name, assignedTo.first_name AS assigned_to_first_name, gc.group_name
          FROM Tasks t
          LEFT JOIN Users assignedBy ON t.assigned_by = assignedBy.user_id
          LEFT JOIN Users assignedTo ON t.assigned_to = assignedTo.user_id
          LEFT JOIN GroupChats gc ON t.group_id = gc.group_id
        `);
        results = rows;
      } catch (err) {
        console.error("Task list fallback error:", err);
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

  // GET /user/:userId
  router.get("/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const results = dataCache.getUserTasks(userId);
    res.json(results);
  });

  // POST /tasks
  router.post("/", async (req, res) => {
    const { task_name, assigned_by, assigned_to, group_id, due_date, status, priority } = req.body;
    const query = `INSERT INTO Tasks (task_name, assigned_by, assigned_to, group_id, due_date, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await db.query(query, [task_name, assigned_by, assigned_to || null, group_id || null, due_date, status || 'Pending', priority || 'Medium']);
      res.json({ message: "Task created", task_id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: "Error creating task" });
    }
  });

  // PUT /tasks/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { task_name, assigned_by, assigned_to, group_id, due_date, status, priority } = req.body;
    const query = `UPDATE Tasks SET task_name = ?, assigned_by = ?, assigned_to = ?, group_id = ?, due_date = ?, status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE task_id = ?`;
    try {
      await db.query(query, [task_name, assigned_by, assigned_to || null, group_id || null, due_date, status, priority || 'Medium', id]);
      res.json({ message: "Task updated" });
    } catch (err) {
      res.status(500).json({ error: "Error updating task" });
    }
  });

  // DELETE /tasks/:id
  router.delete("/:id", async (req, res) => {
    try {
      await db.query(`DELETE FROM Tasks WHERE task_id = ?`, [req.params.id]);
      res.json({ message: "Task deleted" });
    } catch (err) {
      res.status(500).json({ error: "Error deleting task" });
    }
  });

  return router;
};