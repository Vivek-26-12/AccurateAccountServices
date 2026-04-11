# 🚀 Accurate Account Services Project

> **Enterprise-Grade Scalable Dashboard Architecture for Secure Account Management & Processing**
> Built with **TypeScript** (84.2%) | **Node.js** | **MySQL**

---

## 🏗️ System Architecture

A robust full-stack implementation utilizing a modern 3-tier architecture:

- **Frontend:** React 18 + TypeScript 5.5 + Vite 5.4 for a lightning-fast UI.
- **Backend:** Express.js 4.21 + Node.js handling RESTful APIs and Socket.io events.
- **Database:** MySQL 8.0+ ensuring ACID compliance and transactional integrity.

---

## ✨ Key Technical Features

### 🔐 Role-Based Access Control (RBAC)
- **Multi-tier Permissions**: Granular access levels for Admins, Managers, and Users.
- **Dynamic UI**: Role-aware rendering using custom React hooks to hide/show features based on permissions.
- **Security**: JWT-based stateless authentication with bcrypt password hashing.

### 💰 Secure Account Processing
- **Data Integrity**: Parameterized queries via `mysql2` to prevent SQL Injection.
- **Validation**: Strict schema validation for account transactions and service delivery.
- **Environment Security**: Comprehensive `.env` management to protect database and API credentials.

### ⚡ Real-Time Data Handling
- **Bi-directional Communication**: Integrated **Socket.io v4.8.3** for instant dashboard updates.
- **Live Status Tracking**: Real-time account status changes synced across all active client sessions.

---

## 🛠️ Tech Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 18.3.1 | Component-driven UI |
| **Language** | TypeScript | 5.5.3 | Type-safe development |
| **Build Tool** | Vite | 5.4.2 | High-performance bundling |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first responsive design |
| **UI Library** | Material-UI | 7.0.1 | Professional dashboard components |
| **Backend** | Express.js | 4.21.2 | RESTful API Framework |
| **Database** | MySQL | 3.14.0 | Reliable relational storage |
| **Real-Time** | Socket.io | 4.8.3 | WebSocket communication |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone [https://github.com/Vivek-26-12/AccurateAccountServicesProject.git](https://github.com/Vivek-26-12/AccurateAccountServicesProject.git)
cd AccurateAccountServicesProject
npm install
````

### 2\. Configure Environment

Create a `.env` file in the `Server/` directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=accurate_accounts
JWT_SECRET=your_secret_key
```

### 3\. Run Development

**Start Backend:**

```bash
cd Server
npm run dev
```

**Start Frontend:**

```bash
# From root directory
npm run dev
```

-----

## 📤 Deployment

  - **Frontend**: Optimized for [Vercel](https://vercel.com) (configuration included in `vercel.json`).
  - **Backend**: Ready for Node.js environments like Railway, Render, or AWS EC2.

-----

## 👤 Author

**Vivek Dhanwani** [🐙 GitHub Profile](https://github.com/Vivek-26-12) | [📧 Support](mailto:vivekdhanwani2004@gmail.com)

\<div align="center"\>
\<i\>Maintained with ⚡ by Vivek-26-12 | Status: ✅ Active Development\</i\>
\</div\>

```

```
