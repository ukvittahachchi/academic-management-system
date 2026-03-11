# Academic Management System

A comprehensive Full-Stack Academic Management System featuring a backend built with Node.js, Express, MySQL, and MongoDB, alongside a modern frontend powered by Next.js and Tailwind CSS.

## 🌟 Prerequisites

Before running the project locally, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (For relational data)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or a MongoDB Atlas cluster, for unstructured metrics)

## ⚙️ Installation & Setup

1. **Clone or Extract the Project**
   Make sure you have extracted the project completely and are in the root directory (`academic-management-system-b25... - Copy - Copy` or similar).

2. **Install All Dependencies**
   The project has a global npm script that installs dependencies for both the frontend and backend simultaneously. Within the root directory, simply run:
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   - Navigate into the `backend` directory.
   - Copy the provided `.env.example` file and rename it to `.env`.
   - Open the new `.env` file and insert your credentials:
     - **MySQL**: Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
     - **MongoDB**: Update `MONGODB_URI` with your connection string.
     - **JWT**: Provide a secure `JWT_SECRET`.
     - **Company Server**: Set `COMPANY_STORAGE_URL` and `STORAGE_API_KEY` if required.

4. **Initialize Database** (Optional but recommended)
   If you need to reset and initially seed your database tables/collections, run the following commands sequentially inside the `/backend` folder:
   ```bash
   cd backend
   npm run db:reset
   npm run seed
   ```
   *(Be careful running `db:reset` in production as it drops existing schema).*

## 🚀 Running the Project

The root directory's `package.json` contains `concurrently` scripts to quickly boot both folders at once.

To run the full stack, use your CLI from the **project root**:

- **Development Mode** (Default):
  ```bash
  npm run dev
  ```
- **Development Mode** (with Turbopack for faster Next.js builds on frontend):
  ```bash
  npm run dev:turbo
  ```
- **Production-Like / Start Mode**:
  ```bash
  npm run start:all
  ```

Once running successfully:
- **Frontend** should be available at: `http://localhost:3000` (default Next.js port)
- **Backend API** will listen on the port defined in `.env` (default is `http://localhost:5000`)

## 📂 Project Structure Overview

- **`/backend`** - Express.js REST API using Mongoose and MySQL2. It contains all API routes, database schemas, controllers, and scripts to reset/seed data.
- **`/frontend`** - Next.js (App Router) React application. It holds all user interface components, pages, context providers, and Tailwind styles.
