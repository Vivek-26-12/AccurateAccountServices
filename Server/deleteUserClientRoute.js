const express = require("express");

module.exports = (db, io) => {
    const router = express.Router();

    // DELETE route to delete a user (employee/admin) or a client
    router.delete("/:type/:id", async (req, res) => {
        const { type, id } = req.params;

        if (!["user", "client"].includes(type)) {
            return res.status(400).json({ message: "Invalid type." });
        }

        try {
            await db.beginTransaction();

            if (type === "user") {
                const [user] = await db.query(`SELECT auth_id FROM Users WHERE user_id = ?`, [id]);
                if (user.length === 0) {
                    await db.rollback();
                    return res.status(404).json({ message: "User not found" });
                }

                const authId = user[0].auth_id;

                // Cleanup related data
                await db.query(`DELETE FROM ClientUserRelations WHERE user_id = ?`, [id]);
                await db.query(`DELETE FROM GroupChatMessageSeen WHERE user_id = ?`, [id]);
                await db.query(`DELETE FROM GroupChatMessages WHERE sender_id = ?`, [id]);
                await db.query(`DELETE FROM GroupChatMembers WHERE user_id = ?`, [id]);
                await db.query(`DELETE FROM PersonalChats WHERE sender_id = ? OR receiver_id = ?`, [id, id]);
                await db.query(`DELETE FROM Tasks WHERE assigned_by = ? OR assigned_to = ?`, [id, id]);
                
                try {
                    await db.query(`UPDATE GroupChats SET created_by = NULL WHERE created_by = ?`, [id]);
                } catch (e) {
                    console.warn("Could not nullify GroupChat owner:", e.message);
                }

                await db.query(`DELETE FROM Users WHERE user_id = ?`, [id]);
                await db.query(`DELETE FROM Announcements WHERE auth_id = ?`, [authId]);
                await db.query(`DELETE FROM Auth WHERE auth_id = ?`, [authId]);

            } else if (type === "client") {
                const [client] = await db.query(`SELECT auth_id FROM Clients WHERE client_id = ?`, [id]);
                if (client.length === 0) {
                    await db.rollback();
                    return res.status(404).json({ message: "Client not found" });
                }

                const authId = client[0].auth_id;

                await db.query(`DELETE FROM ClientUserRelations WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM Feedback WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM ClientContacts WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM ImportantDocuments WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM OtherDocuments WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM FolderConnections WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM Clients WHERE client_id = ?`, [id]);
                await db.query(`DELETE FROM Auth WHERE auth_id = ?`, [authId]);
            }

            await db.commit();
            io.emit("user_deleted", { id, type });
            res.status(200).json({ status: "success", message: `${type} deleted successfully.` });

        } catch (err) {
            await db.rollback();
            console.error(`Deletion error for ${type}:`, err.message);
            res.status(500).json({ status: "error", message: "Deletion failed.", details: err.message });
        }
    });

    return router;
};
