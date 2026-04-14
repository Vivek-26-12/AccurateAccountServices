const express = require("express");
const dataCache = require("./dataCache");
const router = express.Router();

module.exports = (db) => {
  // GET /tasks - Fetch all tasks with details (Paginated)
  router.get("/tasks", (req, res) => {
    const results = dataCache.getTasks();
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
  // GET /tasks/user/:userId - Fetch tasks assigned to a specific user
  router.get("/tasks/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const results = dataCache.getUserTasks(userId);
    res.json(results);
  });


  // POST /tasks - Create a new task
  router.post("/tasks", (req, res) => {
    const { task_name, assigned_by, assigned_to, group_id, due_date, status, priority } = req.body;

    const query = `
      INSERT INTO Tasks (task_name, assigned_by, assigned_to, group_id, due_date, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [
        task_name,
        assigned_by,
        assigned_to || null,
        group_id || null,
        due_date,
        status || 'Pending',
        priority || 'Medium'
      ],
      (err, result) => {
        if (err) {
          console.error("Error creating task:", err);
          return res.status(500).json({ error: "Error creating task" });
        }
        res.json({
          message: "Task created successfully",
          task_id: result.insertId,
          priority: priority || 'Medium'
        });
      }
    );
  });


  // PUT /tasks/:id - Update a task
  router.put("/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { task_name, assigned_by, assigned_to, group_id, due_date, status, priority } = req.body;

    const query = `
      UPDATE Tasks
      SET 
        task_name = ?, 
        assigned_by = ?, 
        assigned_to = ?, 
        group_id = ?, 
        due_date = ?, 
        status = ?, 
        priority = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE task_id = ?
    `;

    db.query(
      query,
      [
        task_name,
        assigned_by,
        assigned_to || null,
        group_id || null,
        due_date,
        status,
        priority || 'Medium',
        id
      ],
      (err) => {
        if (err) {
          console.error("Error updating task:", err);
          return res.status(500).json({ error: "Error updating task" });
        }
        res.json({
          message: "Task updated successfully",
          priority: priority || 'Medium'
        });
      }
    );
  });

  // DELETE /tasks/:id - Delete a task
  router.delete("/tasks/:id", (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM Tasks WHERE task_id = ?`;

    db.query(query, [id], (err) => {
      if (err) {
        console.error("Error deleting task:", err);
        return res.status(500).json({ error: "Error deleting task" });
      }
      res.json({ message: "Task deleted successfully" });
    });
  });

  return router;
};