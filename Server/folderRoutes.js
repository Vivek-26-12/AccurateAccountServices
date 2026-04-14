// folderRoutes.js
const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db) => {
    const router = express.Router();

    // ✅ GET remaining folders for a client
    router.get("/remaining/:clientId", (req, res) => {
        const clientId = parseInt(req.params.clientId);

        if (isNaN(clientId)) {
            return res.status(400).json({ error: "Invalid client ID" });
        }

        const results = dataCache.getRemainingFolders(clientId);
        res.json(results);
    });

    // ✅ POST create folder and link to client
    router.post("/create", async (req, res) => {
        const { folder_name, client_id } = req.body;

        if (!folder_name || folder_name.trim() === "") {
            return res.status(400).json({ error: "Folder name is required" });
        }

        if (!client_id || isNaN(client_id)) {
            return res.status(400).json({ error: "Valid client ID is required" });
        }

        try {
            // Check if folder exists
            const [results] = await db.query("SELECT * FROM Folders WHERE folder_name = ?", [folder_name]);

            let folder_id;
            if (results.length > 0) {
                // Folder exists, use it
                folder_id = results[0].folder_id;
            } else {
                // Create new folder
                const [insertResult] = await db.query("INSERT INTO Folders (folder_name) VALUES (?)", [folder_name]);
                folder_id = insertResult.insertId;
            }

            // Check if connection already exists
            const [connResults] = await db.query("SELECT * FROM FolderConnections WHERE client_id = ? AND folder_id = ?", [client_id, folder_id]);
            
            if (connResults.length > 0) {
                return res.status(400).json({ error: "Folder is already connected to this client" });
            }

            // Create connection
            await db.query("INSERT INTO FolderConnections (client_id, folder_id) VALUES (?, ?)", [client_id, folder_id]);

            // Initialize default important docs
            const docTypes = ['Balance Sheet', 'Profit and Loss', 'Capital Account'];
            const values = docTypes.map(type => [type, client_id, folder_id]);

            await db.query("INSERT INTO ImportantDocuments (doc_type, client_id, folder_id) VALUES ?", [values]);

            res.status(201).json({
                message: "Folder and associated records created successfully",
                folder_id,
                folder_name,
            });

        } catch (err) {
            console.error("Error in folder creation flow:", err);
            res.status(500).json({ error: "Internal server error during folder creation" });
        }
    });

    // ✅ POST link existing folder to client
    router.post("/connect", async (req, res) => {
        const { client_id, folder_id } = req.body;

        if (!client_id || !folder_id) {
            return res.status(400).json({ error: "client_id and folder_id are required" });
        }

        try {
            const [results] = await db.query("SELECT * FROM FolderConnections WHERE client_id = ? AND folder_id = ?", [client_id, folder_id]);

            if (results.length > 0) {
                return res.status(400).json({ error: "Folder is already connected to this client" });
            }

            await db.query("INSERT INTO FolderConnections (client_id, folder_id) VALUES (?, ?)", [client_id, folder_id]);

            const docTypes = ['Balance Sheet', 'Profit and Loss', 'Capital Account'];
            const values = docTypes.map(type => [type, client_id, folder_id]);

            await db.query("INSERT INTO ImportantDocuments (doc_type, client_id, folder_id) VALUES ?", [values]);

            res.status(201).json({
                message: "Folder linked successfully",
                client_id,
                folder_id
            });
        } catch (err) {
            console.error("Error connecting folder:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // ✅ DELETE folder and all related data
    router.delete("/cleanup", async (req, res) => {
        const { client_id, folder_id } = req.body;

        if (!client_id || !folder_id) {
            return res.status(400).json({ error: "Missing client_id or folder_id" });
        }

        try {
            await db.beginTransaction();
            await db.query("DELETE FROM OtherDocuments WHERE client_id = ? AND folder_id = ?", [client_id, folder_id]);
            await db.query("DELETE FROM ImportantDocuments WHERE client_id = ? AND folder_id = ?", [client_id, folder_id]);
            await db.query("DELETE FROM FolderConnections WHERE client_id = ? AND folder_id = ?", [client_id, folder_id]);
            await db.commit();
            res.json({ message: "Folder documents cleaned and connection removed successfully." });
        } catch (err) {
            await db.rollback();
            console.error("Cleanup error:", err);
            res.status(500).json({ error: "Cleanup failed" });
        }
    });

    // ✅ DELETE document (Important or Other)
    router.delete("/document", async (req, res) => {
        const { doc_id, type, only_nullify } = req.body;

        if (!doc_id || !type) {
            return res.status(400).json({ error: "Missing doc_id or type" });
        }

        try {
            if (type === "important") {
                if (only_nullify) {
                    await db.query("UPDATE ImportantDocuments SET doc_data = NULL WHERE doc_id = ?", [doc_id]);
                } else {
                    await db.query("DELETE FROM ImportantDocuments WHERE doc_id = ?", [doc_id]);
                }
            } else if (type === "other") {
                await db.query("DELETE FROM OtherDocuments WHERE doc_id = ?", [doc_id]);
            }
            res.json({ success: true });
        } catch (err) {
            console.error("Document action error:", err);
            res.status(500).json({ error: "Action failed" });
        }
    });

    return router;
};
