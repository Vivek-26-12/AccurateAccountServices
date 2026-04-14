// chatRoutes.js
const express = require("express");
const dataCache = require("./dataCache");

module.exports = (db, io) => {
  const router = express.Router();

  // GET chat messages (personal or group)
  router.get("/messages", (req, res) => {
    const { user_id, other_user_id, group_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Personal chat
    if (other_user_id && !group_id) {
      const results = dataCache.getPersonalMessages(user_id, other_user_id);
      return res.json(results);
    }
    // Group chat
    else if (group_id) {
      const results = dataCache.getGroupMessages(group_id);
      return res.json(results);
    } else {
      res.status(400).json({ error: "Invalid parameters" });
    }
  });

  // POST new message
  router.post("/messages", (req, res) => {
    const { sender_id, receiver_id, group_id, message } = req.body;

    if (!sender_id || !message) {
      return res.status(400).json({ error: "sender_id and message are required" });
    }

    // Personal message
    if (receiver_id && !group_id) {
      const query = "INSERT INTO PersonalChats (sender_id, receiver_id, message) VALUES (?, ?, ?)";
      db.query(query, [sender_id, receiver_id, message], (err, results) => {
        if (err) {

          return res.status(500).json({ error: "Error sending message" });
        }
        if (!err) {
          const chat_id = results.insertId;
          const senderUser = dataCache.getUser(sender_id);
          // Emit socket event to receiver's room
          const messageData = {
            message_id: chat_id,
            sender_id,
            receiver_id,
            message,
            created_at: new Date().toISOString(),
            first_name: senderUser?.first_name,
            last_name: senderUser?.last_name,
            profile_pic: senderUser?.profile_pic
          };
          io.to(`user_${receiver_id}`).emit("receive_message", messageData);
          io.to(`user_${sender_id}`).emit("receive_message", messageData); // Also emit to sender (for other tabs)
        }
        res.json({ success: true, chat_id: results.insertId });
      });
    }
    // Group message
    else if (group_id) {
      const query = "INSERT INTO GroupChatMessages (group_id, sender_id, message) VALUES (?, ?, ?)";
      db.query(query, [group_id, sender_id, message], (err, results) => {
        if (err) {

          return res.status(500).json({ error: "Error sending message" });
        }
        if (!err) {
          const message_id = results.insertId;
          const senderUser = dataCache.getUser(sender_id);
          // Emit socket event to group room
          const messageData = {
            message_id,
            sender_id,
            group_id,
            message,
            created_at: new Date().toISOString(),
            first_name: senderUser?.first_name,
            last_name: senderUser?.last_name,
            profile_pic: senderUser?.profile_pic
          };
          io.to(`group_${group_id}`).emit("receive_message", messageData);
        }
        res.json({ success: true, message_id: results.insertId });
      });
    } else {
      res.status(400).json({ error: "Invalid parameters" });
    }
  });

  // GET user's groups
  router.get("/groups", (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const results = dataCache.getGroups(user_id);
    res.json(results);
  });

  // GET group members
  router.get("/groups/:group_id/members", (req, res) => {
    const { group_id } = req.params;
    const results = dataCache.getGroupMembers(group_id);
    res.json(results);
  });
  // GET all group names
  router.get("/all-groups", (req, res) => {
    // NOTE: This route was returning just names, but dataCache.getAllGroups returns everything.
    // Is this OK? Typically yes. Or we can map it here. Use getAllGroups from cache.
    const results = dataCache.getAllGroups();
    res.json(results);
  });

  // POST create new group
  router.post("/groups", (req, res) => {
    const { group_name, creator_id, members } = req.body;

    if (!group_name || !creator_id || !members || !Array.isArray(members)) {
      return res.status(400).json({ error: "group_name, creator_id, and members array are required" });
    }

    // Start transaction
    db.beginTransaction(err => {
      if (err) {
        return res.status(500).json({ error: "Error creating group" });
      }

      // 1. Create the group
      const createGroupQuery = "INSERT INTO GroupChats (group_name) VALUES (?)";


      db.query(createGroupQuery, [group_name], (err, results) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ error: "Error creating group: " + err.message });
          });
        }

        const group_id = results.insertId;
        const membersToAdd = [...new Set(members)]; // members is just an array of ids now


        // 2. Add members to the group
        const addMembersQuery = "INSERT INTO GroupChatMembers (group_id, user_id) VALUES ?";
        const membersValues = membersToAdd.map(user_id => [group_id, user_id]);

        db.query(addMembersQuery, [membersValues], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ error: "Error adding group members: " + err.message });
            });
          }

          // Commit transaction
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: "Error creating group during commit" });
              });
            }

            res.json({ success: true, group_id });
          });
        });
      });
    });
  });





  // PUT update group (name and members sync)
  router.put("/groups/:group_id", (req, res) => {
    const { group_id } = req.params;
    const { group_name, members } = req.body;

    if (!group_name) {
      return res.status(400).json({ error: "group_name is required" });
    }

    // Update Name
    const updateNameQuery = "UPDATE GroupChats SET group_name = ? WHERE group_id = ?";
    db.query(updateNameQuery, [group_name, group_id], (err) => {
      if (err) {
        return res.status(500).json({ error: "Error updating group name" });
      }

      // Sync Members if provided
      if (members) {
        // 1. Get current members (to avoid full delete/insert if possible, but full delete/insert is easier for sync)
        // Strategy: Delete all for this group, then insert new list.
        const deleteMembersQuery = "DELETE FROM GroupChatMembers WHERE group_id = ?";
        db.query(deleteMembersQuery, [group_id], (err) => {
          if (err) {
            return res.status(500).json({ error: "Error updating members" });
          }

          if (members.length > 0) {
            const insertMembersQuery = "INSERT INTO GroupChatMembers (group_id, user_id) VALUES ?";
            const values = members.map(uid => [group_id, uid]);
            db.query(insertMembersQuery, [values], (err) => {
              if (err) {
                return res.status(500).json({ error: "Error updating members" });
              }
              res.json({ success: true, message: "Group updated successfully" });
            });
          } else {
            res.json({ success: true, message: "Group updated successfully (no members)" });
          }
        });
      } else {
        res.json({ success: true, message: "Group name updated successfully" });
      }
    });
  });

  // POST add member to group
  router.post("/groups/:group_id/members", (req, res) => {
    const { group_id } = req.params;
    const { user_id } = req.body;

    if (!group_id || !user_id) {
      return res.status(400).json({ error: "group_id and user_id are required" });
    }

    const query = "INSERT INTO GroupChatMembers (group_id, user_id) VALUES (?, ?)";
    db.query(query, [group_id, user_id], (err) => {
      if (err) {
        // Ignore duplicate entry error
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(200).json({ message: "User is already a member" });
        }
        return res.status(500).json({ error: "Error adding group member" });
      }
      res.json({ success: true, message: "Member added successfully" });
    });
  });

  // DELETE remove member from group
  router.delete("/groups/:group_id/members/:user_id", (req, res) => {
    const { group_id, user_id } = req.params;

    const query = "DELETE FROM GroupChatMembers WHERE group_id = ? AND user_id = ?";
    db.query(query, [group_id, user_id], (err) => {
      if (err) {
        return res.status(500).json({ error: "Error removing group member" });
      }
      res.json({ success: true, message: "Member removed successfully" });
    });
  });

  // DELETE group (and all associated data)
  router.delete("/groups/:group_id", (req, res) => {
    const { group_id } = req.params;

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ error: "Transaction error" });

      // 1. Delete members
      db.query("DELETE FROM GroupChatMembers WHERE group_id = ?", [group_id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ error: "Error deleting members" }));

        // 2. Delete unseen records
        db.query("DELETE FROM GroupChatMessageSeen WHERE group_id = ?", [group_id], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: "Error deleting seen records" }));

          // 3. Delete messages
          db.query("DELETE FROM GroupChatMessages WHERE group_id = ?", [group_id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: "Error deleting messages" }));

            // 4. Update Tasks (set group_id to null)
            db.query("UPDATE Tasks SET group_id = NULL WHERE group_id = ?", [group_id], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ error: "Error updating tasks" }));

              // 5. Delete Group
              db.query("DELETE FROM GroupChats WHERE group_id = ?", [group_id], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: "Error deleting group" }));

                db.commit(err => {
                  if (err) return db.rollback(() => res.status(500).json({ error: "Commit error" }));
                  res.json({ success: true, message: "Group deleted successfully" });
                });
              });
            });
          });
        });
      });
    });
  });

  // GET all groups (for admin)
  router.get("/groups/all", (req, res) => {
    const results = dataCache.getAllGroups();
    res.json(results);
  });

  return router;
};