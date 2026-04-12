const db = require("./db");

class DataCache {
    constructor() {
        this.users = [];
        this.groups = [];
        this.groupMembers = [];
        this.groupMessages = [];
        this.personalMessages = [];
        this.announcements = [];

        // New Cache Arrays
        this.clients = [];
        this.clientContacts = [];
        this.tasks = [];
        this.folders = [];
        this.folderConnections = [];
        this.importantDocuments = [];
        this.otherDocuments = [];
        this.feedbacks = [];
        this.guestMessages = [];
        this.clientUserRelations = [];
    }

    start(intervalMs = 3000) {
        // console.log(`Starting Data Cache with ${intervalMs}ms interval...`);
        this.refresh();
        setInterval(() => this.refresh(), intervalMs);
    }

    async refresh() {
        try {
            // --- USERS ---
            const userQuery = `
                SELECT 
                    Users.user_id, Users.auth_id, Auth.username, Auth.role, 
                    Users.first_name, Users.last_name, Users.email, Users.phone, 
                    Users.profile_pic, Users.created_at, Users.updated_at 
                FROM Users 
                INNER JOIN Auth ON Users.auth_id = Auth.auth_id
                ORDER BY Users.user_id ASC`;

            // --- GROUPS & MESSAGES ---
            const groupQuery = `SELECT * FROM GroupChats ORDER BY created_at DESC`;
            const groupMembersQuery = `
                SELECT gcm.group_id, u.user_id, u.first_name, u.last_name, u.profile_pic, a.role
                FROM GroupChatMembers gcm
                JOIN Users u ON gcm.user_id = u.user_id
                JOIN Auth a ON u.auth_id = a.auth_id`;
            const groupMsgsQuery = `
                SELECT 
                    gcm.message_id, gcm.group_id, gcm.sender_id, gcm.message, gcm.created_at,
                    u.first_name, u.last_name, u.profile_pic
                FROM GroupChatMessages gcm
                JOIN Users u ON gcm.sender_id = u.user_id
                ORDER BY gcm.created_at ASC`;
            const personalMsgsQuery = `
                SELECT 
                    pc.chat_id, pc.sender_id, pc.receiver_id, pc.message, pc.created_at,
                    u1.first_name as sender_first_name, u1.last_name as sender_last_name, u1.profile_pic as sender_profile_pic,
                    u2.first_name as receiver_first_name, u2.last_name as receiver_last_name, u2.profile_pic as receiver_profile_pic
                FROM PersonalChats pc
                JOIN Users u1 ON pc.sender_id = u1.user_id
                JOIN Users u2 ON pc.receiver_id = u2.user_id
                ORDER BY created_at ASC`;

            // --- CLIENTS & DOCUMENTS ---
            const clientQuery = `
                SELECT Clients.client_id, Clients.auth_id, Auth.username, Auth.role,
                       Clients.company_name, Clients.contact_person, Clients.email,
                       Clients.gstin, Clients.pan_number, Clients.profile_pic,
                       Clients.created_at, Clients.updated_at
                FROM Clients
                INNER JOIN Auth ON Clients.auth_id = Auth.auth_id`;

            const taskQuery = `
                SELECT 
                    t.task_id, t.task_name, t.status, t.due_date, t.created_at, t.priority, t.group_id,
                    t.assigned_by, t.assigned_to,
                    assignedBy.first_name AS assigned_by_first_name, assignedBy.last_name AS assigned_by_last_name,
                    assignedTo.first_name AS assigned_to_first_name, assignedTo.last_name AS assigned_to_last_name,
                    gc.group_name
                FROM Tasks t
                LEFT JOIN Users assignedBy ON t.assigned_by = assignedBy.user_id
                LEFT JOIN Users assignedTo ON t.assigned_to = assignedTo.user_id
                LEFT JOIN GroupChats gc ON t.group_id = gc.group_id
                ORDER BY 
                    CASE WHEN t.priority = 'High' THEN 1
                         WHEN t.priority = 'Medium' THEN 2
                         WHEN t.priority = 'Low' THEN 3
                         ELSE 4 END,
                    t.due_date ASC`;

            const feedbackQuery = `
                SELECT f.feedback_id, f.message, f.created_at, c.company_name, c.contact_person
                FROM Feedback f
                JOIN Clients c ON f.client_id = c.client_id
                ORDER BY f.created_at DESC`;

            // Execute all queries in parallel for maximum performance
            const [
                [users],
                [groups],
                [groupMembers],
                [groupMessages],
                [personalMessages],
                [announcements],
                [clients],
                [clientContacts],
                [tasks],
                [folders],
                [folderConnections],
                [importantDocuments],
                [otherDocuments],
                [feedbacks],
                [guestMessages],
                [clientUserRelations]
            ] = await Promise.all([
                db.query(userQuery),
                db.query(groupQuery),
                db.query(groupMembersQuery),
                db.query(groupMsgsQuery),
                db.query(personalMsgsQuery),
                db.query(`SELECT * FROM Announcements ORDER BY created_at DESC`),
                db.query(clientQuery),
                db.query(`SELECT * FROM ClientContacts`),
                db.query(taskQuery),
                db.query(`SELECT * FROM Folders`),
                db.query(`SELECT * FROM FolderConnections`),
                db.query(`SELECT * FROM ImportantDocuments`),
                db.query(`SELECT * FROM OtherDocuments`),
                db.query(feedbackQuery),
                db.query(`SELECT * FROM GuestMessages ORDER BY created_at DESC`),
                db.query(`SELECT * FROM ClientUserRelations`)
            ]);

            // Update Cache atomatically (all at once)
            this.users = users;
            this.groups = groups;
            this.groupMembers = groupMembers;
            this.groupMessages = groupMessages;
            this.personalMessages = personalMessages;
            this.announcements = announcements;
            this.clients = clients;
            this.clientContacts = clientContacts;
            this.tasks = tasks;
            this.folders = folders;
            this.folderConnections = folderConnections;
            this.importantDocuments = importantDocuments;
            this.otherDocuments = otherDocuments;
            this.feedbacks = feedbacks;
            this.guestMessages = guestMessages;
            this.clientUserRelations = clientUserRelations;

        } catch (error) {
            console.error("❌ DataCache Refresh Error:", error);
        }
    }

    // --- GETTERS (Remain Sync since they access the cache memory) ---

    // USERS
    getUsers() { return this.users; }
    getUser(id) { return this.users.find(u => u.user_id == id); }
    getUserByAuthId(authId) { return this.users.find(u => u.auth_id == authId); }

    // CHATS
    getGroups(userId) {
        const userGroupIds = new Set(this.groupMembers.filter(m => m.user_id == userId).map(m => m.group_id));
        return this.groups
            .filter(g => userGroupIds.has(g.group_id))
            .map(g => ({ ...g, message_count: this.groupMessages.filter(m => m.group_id == g.group_id).length }));
    }
    getAllGroups() {
        return this.groups.map(g => ({ ...g, message_count: this.groupMessages.filter(m => m.group_id == g.group_id).length }));
    }
    getGroupMembers(groupId) { return this.groupMembers.filter(m => m.group_id == groupId); }
    getGroupMessages(groupId) { return this.groupMessages.filter(m => m.group_id == groupId); }
    getPersonalMessages(userId, otherUserId) {
        return this.personalMessages.filter(m =>
            (m.sender_id == userId && m.receiver_id == otherUserId) ||
            (m.sender_id == otherUserId && m.receiver_id == userId)
        );
    }
    getAllAnnouncements() { return this.announcements; }

    // CLIENTS
    getClients() {
        return this.clients.map(client => ({
            ...client,
            contacts: this.clientContacts.filter(c => c.client_id === client.client_id)
        }));
    }
    getClientByAuthId(authId) {
        const client = this.clients.find(c => c.auth_id == authId);
        if (!client) return null;
        return {
            ...client,
            contacts: this.clientContacts.filter(c => c.client_id === client.client_id)
        };
    }

    // CLIENT DATA (Documents & Folders)
    getClientData(clientId) {
        const targetClients = clientId ? this.clients.filter(c => c.client_id == clientId) : this.clients;

        return targetClients.map(client => {
            // Get Check Connections
            const clientConnections = this.folderConnections.filter(fc => fc.client_id == client.client_id);

            // Map Folders
            const clientFolders = clientConnections.map(conn => {
                const folderDef = this.folders.find(f => f.folder_id == conn.folder_id);
                return {
                    folder_id: conn.folder_id,
                    folder_name: folderDef ? folderDef.folder_name : 'Unknown',
                    importantDocuments: [],
                    otherDocuments: []
                };
            });

            const clientImpDocs = this.importantDocuments.filter(d => d.client_id == client.client_id);
            const clientOtherDocs = this.otherDocuments.filter(d => d.client_id == client.client_id);

            // Assign to folders
            clientImpDocs.forEach(doc => {
                if (doc.folder_id) {
                    const f = clientFolders.find(cf => cf.folder_id == doc.folder_id);
                    if (f) f.importantDocuments.push(doc);
                }
            });
            clientOtherDocs.forEach(doc => {
                if (doc.folder_id) {
                    const f = clientFolders.find(cf => cf.folder_id == doc.folder_id);
                    if (f) f.otherDocuments.push(doc);
                }
            });

            return {
                ...client,
                importantDocuments: clientImpDocs, 
                folders: clientFolders,
                otherDocuments: [] 
            };
        });
    }

    // TASKS
    getTasks() { return this.tasks; }
    getUserTasks(userId) { return this.tasks.filter(t => t.assigned_to == userId); }

    // FOLDERS
    getRemainingFolders(clientId) {
        // Folders NOT connected to this client (and not ID 1)
        const connectedFolderIds = new Set(this.folderConnections
            .filter(fc => fc.client_id == clientId)
            .map(fc => fc.folder_id));

        return this.folders.filter(f => f.folder_id != 1 && !connectedFolderIds.has(f.folder_id));
    }

    // FEEDBACK & GUEST MESSAGES
    getAllFeedbacks() { return this.feedbacks; }
    getFeedbackCount() { return this.feedbacks.length; }
    getFeedbackCountYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return this.feedbacks.filter(f => new Date(f.created_at) >= yesterday).length;
    }

    getAllGuestMessages() { return this.guestMessages; }
    getGuestMessageCount() { return this.guestMessages.length; }
    getGuestMessageCountYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return this.guestMessages.filter(m => new Date(m.created_at) >= yesterday).length;
    }

    // CLIENT RELATIONS
    getClientRelations(userId) {
        return this.clientUserRelations
            .filter(r => r.user_id == userId)
            .map(r => {
                const client = this.clients.find(c => c.client_id == r.client_id);
                if (!client) return null;
                return {
                    client_id: r.client_id,
                    relation_type: r.relation_type,
                    company_name: client.company_name,
                    contact_person: client.contact_person,
                    email: client.email,
                    profile_pic: client.profile_pic
                };
            })
            .filter(r => r !== null);
    }
}

module.exports = new DataCache();
