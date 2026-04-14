const express = require("express");
const router = express.Router();

module.exports = (db) => {
  router.post("/uploadimportant", async (req, res) => {
    const { doc_id, fileUrl } = req.body;

    if (!doc_id || !fileUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      const [results] = await db.query("SELECT * FROM ImportantDocuments WHERE doc_id = ?", [doc_id]);
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }

      await db.query("UPDATE ImportantDocuments SET doc_data = ? WHERE doc_id = ?", [fileUrl, doc_id]);
      res.json({ success: true, message: "Updated successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  return router;
};
