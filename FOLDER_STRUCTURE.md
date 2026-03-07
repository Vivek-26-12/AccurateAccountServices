# 📂 Full Project Architecture & File Directory

This document provides a comprehensive map of the **Accurate Account Services** codebase, including server-side APIs and client-side React components.

---

## 🖥️ Server (Node.js / Express)
The backend handles database management, real-time messaging, file processing, and security.

### 📍 Main Entry & Core
- **Server/index.js**: Entry point; initializes Express, Socket.io, database pooling, and global middlewares (CORS, JSON, Helmet).
- **Server/db.js**: Configures MySQL connection pooling and exports the database instance (`db`) and logger.
- **Server/dataCache.js**: Advanced in-memory caching system that synchronizes database state with real-time Socket.io broadcasts.

### 🛡️ Middleware (`Server/middleware/`)
- **authMiddleware.js**: Validates JWT tokens in headers (`Authorization` and `x-auth-token`) for protected routes.
- **roleMiddleware.js**: Handles RBAC (Role-Based Access Control) to restrict routes by user role (Admin, Employee, Client).

### 🛣️ API Routes
- **Server/authRoutes.js**: handles `/auth` - Logic for User/Client login and JWT generation.
- **Server/registerRoutes.js**: handles `/register` - Logic for new user and client account creation.
- **Server/userRoutes.js**: handles `/users` - Retrieval and management of user profile data.
- **Server/clientRoutes.js**: handles `/clients` - CRUD operations for managing client profiles.
- **Server/clientDataRoutes.js**: handles `/client-data` - Specialized routes for client-specific metadata.
- **Server/chatRoutes.js**: handles `/chat` - Messaging logic, history retrieval, and attachment handling.
- **Server/announcements.js**: handles `/announcements` - System-wide broadcasts and administrative notices.
- **Server/taskRoutes.js**: handles `/tasks` - Project management logic, status transitions, and assignments.
- **Server/folderRoutes.js**: handles `/folders` - Document hierarchy management and folder permissions.
- **Server/uploadImportantRoutes.js**: handles `/upload-important` - Secure endpoints for sensitive document processing.
- **Server/uploadOtherRoutes.js**: handles `/upload-other` - Cloudinary signature generation and general file uploads.
- **Server/clientRelationRoutes.js**: handles `/client-relations` - Maps clients to folders and managing team assignments.
- **Server/feedbackRoutes.js**: handles `/feedback` - Capturing and reviewing user and client feedback.
- **Server/guestMessageRoutes.js**: handles `/guest-messages` - External messages from the public contact form.
- **Server/unseenMessagesRoutes.js**: handles `/unseen-messages` - Tracking and clearing unread message notification counts.
- **Server/deleteUserClientRoute.js**: Special logic for cascaded deletions of users, clients, and their related data.
- **Server/updateRoutes.js**: General-purpose utility routes for batch updates across entities.

### 📜 Scripts
- **Server/scripts/seedAdmin.js**: Utility script to initialize the first admin user in a fresh database.

---

## 🌐 Frontend (React / TypeScript)
The client-side focuses on role-based dashboards, interactive document management, and real-time collaboration.

### 📍 Core Files
- **src/main.tsx**: React DOM initialization and root rendering.
- **src/App.tsx**: Main routing container using `react-router-dom` and context provider wrapping.
- **src/config.ts**: Central configuration for API URLs based on environment (Dev vs Production).
- **src/cloudinaryUploads.tsx**: Shared logic for direct-to-cloud file uploading and signature handling.
- **src/index.css**: Global styling including tailwind utilities and custom animations.

### 💾 Data & State Management (`src/Data/`)
- **AuthData.tsx**: Global Authentication Context; manages JWTs, login/logout, and Axios interceptors.
- **UserData.tsx**: Context provider for managing internal staff/admin data.
- **Client.ts**: Type definitions and interfaces for Client entities.
- **ClientData.tsx**: Context provider for synchronization and fetching of client profiles.
- **ProfileData.tsx**: Handles personal profile state and photo update logic.
- **UnseenMessagesContext.tsx**: tracks real-time unread message counts across the app.
- **initialUsers.ts**: Mock data for development and initial testing phases.

### 🧩 Components (`src/components/`)
- **Chat.tsx**: Massive, real-time message interface with socket integration and file sharing.
- **Navbar.tsx**: Navigation component that adapts based on the user's role and auth status.
- **LoginPopup.tsx**: Axios-powered authentication modal with error handling.
- **ProtectedRoute.tsx**: Security wrapper that redirects unauthenticated users to the home page.
- **Hero.tsx / Footer.tsx / Testimonials.tsx**: landing page UI components.
- **ProfileUser.tsx / ProfileClient.tsx**: specialized profile display and editing cards.
- **MessagesPopup.tsx**: Quick-access notifications for new messages.
- **FeedbackForm.tsx**: Interactive modal for submitting system feedback.
- **StatusBadge.tsx**: Visual status indicator used in tables and dashboards.

### 📄 Pages & Views (`src/pages/`)
- **Home.tsx**: Public landing page for guest users.
- **AdminDashboard.tsx**: High-level overview for administrators including stats and system health.
- **EmployeeDashboard.tsx**: Workflow hub for staff members focusing on assigned clients and tasks.
- **ClientDashboard.tsx**: Private portal for clients to see their documents and message staff.
- **DocumentsMain.tsx**: The primary interface for the digital file system.
  - **Documents/ClientCard.tsx**: Card view for navigating client folders.
  - **Documents/FolderButton.tsx / DocumentButton.tsx**: Icons and logic for folder/file interaction.
  - **Documents/SearchBar.tsx / FilterTabs.tsx**: Tools for finding documents across the system.
- **ManageUsersMain.tsx**: Powerful administrative table for managing staff and permissions.
  - **ManageUsers/UserTable.tsx**: Responsive table for listing and filtering users.
  - **ManageUsers/forms/UserForm.tsx**: Comprehensive form for adding/editing employees.
  - **ManageUsers/forms/ClientForm.tsx**: specialized form for client onboarding.
  - **ManageUsers/forms/GroupForm.tsx**: logic for creating client-relation groups.
  - **ManageUsers/ViewUserModal.tsx**: read-only detail views for staff.
- **TaskDashboard.tsx**: Kanban-style or list view for managing work progress.
  - **TasksPage/TaskForm.tsx**: logic for creating and assigning complex tasks.
  - **TasksPage/TaskCard.tsx**: Draggable or interactive display for individual task units.
- **Contact.tsx / About.tsx / FAQ.tsx**: informative public-facing pages.

---

## 🛠️ Configuration & Build
- **vercel.json**: Backend-proxy and hosting configuration for Vercel.
- **vite.config.ts**: Build pipeline and development server settings.
- **tsconfig.json**: strict TypeScript compilation rules for type safety.
- **eslint.config.js**: Linting rules to maintain code quality and consistency.
