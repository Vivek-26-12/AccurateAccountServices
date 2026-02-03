// folderRoutes.js
const express = require("express");
const dataCache = require("./dataCache");
const router = express.Router();

module.exports = (db) => {
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
    router.post("/create", (req, res) => {
        const { folder_name, client_id } = req.body;

        if (!folder_name || folder_name.trim() === "") {
            return res.status(400).json({ error: "Folder name is required" });
        }

        if (!client_id || isNaN(client_id)) {
            return res.status(400).json({ error: "Valid client ID is required" });
        }

        const checkFolderQuery = "SELECT * FROM Folders WHERE folder_name = ?";
        db.query(checkFolderQuery, [folder_name], (err, results) => {
            if (err) {
                console.error("Error checking folder existence:", err);
                return res.status(500).json({ error: "Database error checking folder existence" });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: "Folder with this name already exists. Please choose a different name or connect the existing folder." });
            }

            const insertFolderQuery = "INSERT INTO Folders (folder_name) VALUES (?)";

            db.query(insertFolderQuery, [folder_name], (err, folderResult) => {
                if (err) {
                    console.error("Error inserting folder:", err);
                    return res.status(500).json({ error: "Database error inserting folder" });
                }

                const folder_id = folderResult.insertId;
                const insertConnectionQuery = `
                INSERT INTO FolderConnections (client_id, folder_id)
                VALUES (?, ?)
            `;

                db.query(insertConnectionQuery, [client_id, folder_id], (err) => {
                    if (err) {
                        console.error("Error inserting folder connection:", err);
                        return res.status(500).json({ error: "Database error inserting folder connection" });
                    }

                    const docTypes = ['Balance Sheet', 'Profit and Loss', 'Capital Account'];
                    const values = docTypes.map(type => [type, client_id, folder_id]);

                    const insertDocsQuery = `
                    INSERT INTO ImportantDocuments (doc_type, client_id, folder_id)
                    VALUES ?
                `;

                    db.query(insertDocsQuery, [values], (err) => {
                        if (err) {
                            console.error("Error inserting important documents:", err);
                            return res.status(500).json({ error: "Database error inserting important documents" });
                        }

                        res.status(201).json({
                            message: "Folder and associated records created successfully",
                            folder_id,
                            folder_name,
                        });
                    });
                });
            });
        });
    });

    // ✅ POST link existing folder to client + insert default docs
    router.post("/connect", (req, res) => {
        const { client_id, folder_id } = req.body;

        if (!client_id || isNaN(client_id) || !folder_id || isNaN(folder_id)) {
            return res.status(400).json({ error: "Valid client_id and folder_id are required" });
        }

        const checkQuery = "SELECT * FROM FolderConnections WHERE client_id = ? AND folder_id = ?";

        db.query(checkQuery, [client_id, folder_id], (err, results) => {
            if (err) {
                console.error("Error checking folder connection:", err);
                return res.status(500).json({ error: "Database error checking folder connection" });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: "Folder is already connected to this client" });
            }

            const insertConnectionQuery = `
                INSERT INTO FolderConnections (client_id, folder_id)
                VALUES (?, ?)
            `;

            db.query(insertConnectionQuery, [client_id, folder_id], (err) => {
                if (err) {
                    console.error("Error inserting folder connection:", err);
                    return res.status(500).json({ error: "Database error inserting folder connection" });
                }

                const docTypes = ['Balance Sheet', 'Profit and Loss', 'Capital Account'];
                const values = docTypes.map(type => [type, client_id, folder_id]);

                const insertDocsQuery = `
                INSERT INTO ImportantDocuments (doc_type, client_id, folder_id)
                VALUES ?
            `;

                db.query(insertDocsQuery, [values], (err) => {
                    if (err) {
                        console.error("Error inserting important documents:", err);
                        return res.status(500).json({ error: "Database error inserting important documents" });
                    }

                    res.status(201).json({
                        message: "Folder linked and important documents initialized successfully",
                        client_id,
                        folder_id
                    });
                });
            });
        });
    });

    // ✅ DELETE folder and all related data
    router.delete("/cleanup", (req, res) => {
        const { client_id, folder_id } = req.body;

        if (!client_id || !folder_id) {
            return res.status(400).json({ error: "Missing client_id or folder_id" });
        }

        // Step 1: Delete from OtherDocuments
        const deleteOtherDocsQuery = `DELETE FROM OtherDocuments WHERE client_id = ? AND folder_id = ?`;

        // Step 2: DELETE from ImportantDocuments
        const deleteImpDocsQuery = `DELETE FROM ImportantDocuments WHERE client_id = ? AND folder_id = ?`;

        // Step 3: Delete connection from FolderConnections
        const deleteFolderConnQuery = `DELETE FROM FolderConnections WHERE client_id = ? AND folder_id = ?`;

        db.beginTransaction((err) => {
            if (err) return res.status(500).json({ error: "Transaction start failed", err });

            db.query(deleteOtherDocsQuery, [client_id, folder_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: "Failed deleting OtherDocuments", err }));

                db.query(deleteImpDocsQuery, [client_id, folder_id], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Failed deleting ImportantDocuments", err }));

                    db.query(deleteFolderConnQuery, [client_id, folder_id], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: "Failed deleting FolderConnections", err }));

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ error: "Transaction commit failed", err }));
                            return res.json({ message: "Folder documents cleaned and connection removed successfully." });
                        });
                    });
                });
            });
        });
    });

    // ✅ DELETE document (Important or Other) – with nullify support
    router.delete("/document", (req, res) => {
        const { doc_id, type, only_nullify } = req.body;

        if (!doc_id || !type) {
            return res.status(400).json({ error: "Missing doc_id or type (important | other)" });
        }

        if (type === "important") {
            if (only_nullify) {
                const nullifyQuery = `UPDATE ImportantDocuments SET doc_data = NULL WHERE doc_id = ?`;
                db.query(nullifyQuery, [doc_id], (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: "Failed to nullify important document", err });
                    }
                    return res.json({ message: "Important document data set to NULL" });
                });
            } else {
                const deleteQuery = `DELETE FROM ImportantDocuments WHERE doc_id = ?`;
                db.query(deleteQuery, [doc_id], (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: "Failed to delete important document", err });
                    }
                    return res.json({ message: "Important document deleted" });
                });
            }
        } else if (type === "other") {
            const deleteQuery = `DELETE FROM OtherDocuments WHERE doc_id = ?`;
            db.query(deleteQuery, [doc_id], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to delete other document", err });
                }
                return res.json({ message: "Other document deleted" });
            });
        } else {
            return res.status(400).json({ error: "Invalid type. Use 'important' or 'other'." });
        }
    });

    return router;
};
