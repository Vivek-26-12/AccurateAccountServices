const express = require("express");
const router = express.Router();

module.exports = (db) => {

  // ➕ Create a new other document
  router.post("/other/create", async (req, res) => {
    const { client_id, folder_id, doc_name, fileUrl } = req.body;
  
    if (!client_id || !doc_name) {
      return res.status(400).json({ success: false, message: "Missing required fields: client_id and doc_name are mandatory" });
    }
  
    const insertSql = `
      INSERT INTO OtherDocuments (client_id, folder_id, doc_name, doc_data)
      VALUES (?, ?, ?, ?)
    `;
    const fileData = fileUrl && fileUrl.trim() !== "" ? fileUrl : null;
  
    try {
      const [result] = await db.query(insertSql, [client_id, folder_id, doc_name, fileData]);
      res.status(201).json({
        success: true,
        message: "Other document inserted successfully",
        insertedId: result.insertId,
      });
    } catch (err) {
      console.error("Insert error:", err);
      res.status(500).json({ success: false, message: "Failed to insert document" });
    }
  });
  

  // 🔁 Update an existing document
  router.post("/other/update", async (req, res) => {
    const { doc_id, fileUrl } = req.body;

    if (!doc_id || !fileUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      const [results] = await db.query("SELECT * FROM OtherDocuments WHERE doc_id = ?", [doc_id]);
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }

      await db.query("UPDATE OtherDocuments SET doc_data = ? WHERE doc_id = ?", [fileUrl, doc_id]);
      res.json({ success: true, message: "Other document updated successfully" });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ success: false, message: "Database error" });
    }
  });

  // 🔍 Get document by doc_id
  router.get("/other/get/:doc_id", async (req, res) => {
    try {
      const [results] = await db.query("SELECT * FROM OtherDocuments WHERE doc_id = ?", [req.params.doc_id]);
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      res.json({ success: true, data: results[0] });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch document" });
    }
  });

  // 🔍 Get all documents for a client
  router.get("/other/getByClient/:client_id", async (req, res) => {
    try {
      const [results] = await db.query("SELECT * FROM OtherDocuments WHERE client_id = ?", [req.params.client_id]);
      res.json({ success: true, documents: results });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch documents" });
    }
  });

  return router;
};
