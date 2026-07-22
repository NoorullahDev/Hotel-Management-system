# 🏨 Hotel Management System (HMS)

A comprehensive, modern Hotel Management System built with a robust web stack and packaged as a powerful desktop application using **Electron**.

## 🏗️ Architecture & Tech Stack

This project is structured as a monorepo containing three main components:

1. **`hms-desktop` (Electron App)** 
   - The primary desktop client application for hotel staff.
   - Built with **Electron**, providing a native application experience for seamless operations.

2. **`hms-frontend` (Web Portal)**
   - The modern user interface and dashboard components.
   - Built with **React** and **Next.js**.

3. **`hms-backend` (API & Server)**
   - The core business logic, database management, and API endpoints.
   - Built with **Node.js**, **Express**, and **Prisma ORM**.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Installation & Running Locally

Because this is a multi-component system, you will need to start the backend, frontend, and desktop environments. Open three separate terminal windows and run the following:

**1. Start the Backend server:**
```bash
cd hms-backend
npm install
npm run dev
```

**2. Start the Frontend UI:**
```bash
cd hms-frontend
npm install
npm run dev
```

**3. Launch the Electron Desktop App:**
```bash
cd hms-desktop
npm install
npm start
```

*(Note: Ensure your database environment variables are correctly configured in `hms-backend/.env` before starting the server.)*

> [!IMPORTANT]
> **Default Admin Credentials**
> If you have seeded the database (`npx prisma db seed`), the default admin user is created with:
> - **Username:** `admin`
> - **Password:** `xQ9!mP2#vK8y`
> 
> **You MUST log in and change this password immediately as your very first action.**

---

## 📋 Key Features
- **Dashboard & Analytics:** Real-time overview of hotel occupancy and revenue.
- **Room Management:** Monitor room statuses, types, and housekeeping schedules.
- **Booking & Reservations:** Seamless check-ins, check-outs, and guest management.
- **Restaurant & POS:** Integrated orders and menu management for the hotel restaurant.
- **Billing & Invoices:** Automated billing and PDF invoice generation.

## 📄 Documentation
Detailed system specifications and requirements can be found in the included document:
`Hotel_Management_System_SRS_WebStack_v3.pdf`
