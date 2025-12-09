# MedLink — Clinic Appointment Management System

MedLink is a full-stack scheduling platform that streamlines communication between patients and doctors. Patients can discover available time slots, book or reschedule appointments, and track visit history. Doctors configure their availability, review upcoming visits, and monitor past appointments. Conflict detection prevents double-booking for both parties, and JWT-protected routes tailor the experience by role.
- **Demo:** https://medlink-1dn6.onrender.com/
## Authors

- Shaobo (Ben) Chen  
- Chirag Suthar

## Course Information

- **Course:** CS5610 Web Development – Project 03  
- **Section:** [https://johnguerra.co/classes/webDevelopment_online_fall_2025/Links](https://johnguerra.co/classes/webDevelopment_online_fall_2025/) <!-- replace with the real section link -->  
- **Design Document:** https://docs.google.com/document/d/1fkzGFEovRiusWywCq3syP4W_1nU3qZ7ew6RF9wr5KZ8/edit?usp=sharing <!-- replace with the actual design document URL -->

---

## Table of Contents

1. [Project Highlights](#project-highlights)  
2. [Core Features](#core-features)  
3. [System Architecture](#system-architecture)  
4. [Technology Stack](#technology-stack)  
5. [Getting Started](#getting-started)  
6. [Database & Seed Data](#database--seed-data)  
7. [API Overview](#api-overview)  
8. [Testing Guide](#testing-guide)  
9. [Quality & Tooling](#quality--tooling)  
10. [License](#license)

---

## Project Highlights

- **Role-based UX:** Patients and doctors see personalized dashboards once authenticated via JWT.
- **Availability-aware booking:** The frontend availability modal only presents time slots that are conflict-free for both the doctor _and_ the current patient.
- **Scheduling safeguards:** Bookings must be at least one hour in the future, and rescheduling enforces the same rules with immediate feedback.
- **Comprehensive history:** Patients filter historical appointments by date range, status (upcoming, completed, cancelled, no-show), and doctor.
- **Doctor tooling:** Doctors manage recurring availability, monitor upcoming visits, and audit past appointments from dedicated pages.
- **Hard cancelation:** Cancelling an appointment performs a hard delete so upcoming views stay uncluttered.

---

## Core Features

### Patient Experience
- Browse doctors and filtered availability slots.
- Book appointments with a modal time-slot picker (auto-calculates end time).
- Reschedule existing appointments without leaving the form.
- Cancel appointments with confirmation (records removed from upcoming list).
- Dashboard lists upcoming appointments soonest-first with quick reschedule/cancel actions.
- History page supports sort/pagination and multiple filters.

### Doctor Experience
- Manage weekly availability windows.
- Review upcoming appointments with patient metadata.
- Inspect past appointments (completed/cancelled/no-show).
- Routes are protected by doctor-role middleware.

### Security & Compliance
- JWT authentication and bcrypt password hashing.
- Custom Express middleware for authentication and role authorization.
- `.env` keeps secrets out of version control.
- No prohibited libraries (Axios, Mongoose, CORS middleware) per assignment rules.

---

## System Architecture

```
MedLink/
├── backend/               # Node + Express + MongoDB API
│   ├── database/          # Mongo connection helper
│   ├── middleware/        # Auth & role guards
│   ├── routes/            # auth, appointments, doctors, doctor-only
│   ├── scripts/           # seed.js, cleanup.js
│   └── server.js          # Express bootstrap
└── frontend/              # React + Vite SPA
    ├── components/        # Login, Patient, Doctor, Shared views
    ├── context/           # AuthProvider (JWT aware)
    ├── utils/             # apiClient wrapper
    └── App.jsx            # Router configuration
```

---

## Technology Stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 18, React Router 6, Vite 5, PropTypes, component-scoped CSS |
| Backend    | Node.js, Express 4, MongoDB driver 6, jsonwebtoken, bcryptjs, dotenv |
| Tooling    | ESLint, Prettier, npm scripts (dev/start/seed/cleanup) |
| Database   | MongoDB (Atlas or local) with `users`, `appointments`, `availability` collections |

---

## Getting Started

### Prerequisites
- **Node.js** v16+ and npm (or yarn)
- **MongoDB** connection string (Atlas cluster or local instance)
- **Git** (for cloning the repository)

### Step-by-Step Setup Instructions

#### 1. Clone and Navigate to Project
```bash
git clone <repository-url>
cd MedLink
```

#### 2. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create environment file:
```bash
# Create .env file in the backend directory
# You can copy from ENV_SETUP.md or create manually
```

**Required `.env` variables:**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/clinic_appointments
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/clinic_appointments
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
```

**Seed the database** (optional but recommended for testing):
```bash
npm run cleanup   # Clears existing data
npm run seed      # Creates 1,000+ synthetic records
```

**Start the backend server:**
```bash
npm start         # Server runs on http://localhost:3001
```

#### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev       # Server runs on http://localhost:3000 (Vite)
```

The application will automatically open in your browser.

#### 4. Production Build

To build for production:
```bash
cd frontend
npm run build
# Outputs optimized static bundle to frontend/dist
```

To preview the production build:
```bash
npm run preview
```

### Screenshot

![MedLink Application Screenshot](submission/Screenshot%202025-11-10%20at%2011.16.24%20AM.png)

*Screenshot showing the MedLink home page with booking interface*

---

## Database & Seed Data

Running `npm run seed` (backend) creates:
- 1 test patient (`emily@patient.com` / `password123`)
- 50 additional patients
- 15 doctors
- 1,000+ appointments (synthetic data for testing)

To reseed:
```bash
npm run cleanup
npm run seed
```
Collections used:
- **users** – stores patients and doctors (with role + specialty metadata)
- **appointments** – visit details with status lifecycle
- **availability** – doctor availability windows

Indexes include compound lookups on `patientId/startDateTime` and `doctorId/startDateTime` to support scheduling queries.

---

## API Overview

### Authentication
| Method | Endpoint        | Description                  |
| ------ | --------------- | ---------------------------- |
| POST   | `/auth/register`| Register a new patient or doctor |
| POST   | `/auth/login`   | Authenticate and receive JWT |
| GET    | `/auth/me`      | Fetch current user profile (JWT required) |

### Patient Endpoints
| Method | Endpoint                                               | Description                               |
| ------ | ------------------------------------------------------ | ----------------------------------------- |
| GET    | `/api/doctors`                                        | List available doctors                     |
| GET    | `/api/doctors/:id/availability?date=YYYY-MM-DD`       | Doctor availability (conflicts filtered)  |
| POST   | `/api/appointments`                                   | Book appointment                          |
| GET    | `/api/appointments?status=&from=&to=&page=&limit=`    | Retrieve appointments with filters        |
| PUT    | `/api/appointments/:id`                               | Reschedule existing appointment           |
| DELETE | `/api/appointments/:id`                               | Cancel appointment (hard delete)          |

### Doctor Endpoints (Role: doctor)
| Method | Endpoint                             | Description                       |
| ------ | -------------------------------------| --------------------------------- |
| GET    | `/api/doctor/my-availability`        | Fetch availability configuration  |
| POST   | `/api/doctor/update-availability`    | Create/update availability        |
| GET    | `/api/doctor/upcoming-appointments`  | Doctor view of future visits      |
| GET    | `/api/doctor/past-appointments`      | Historical visits                 |

---

## Testing Guide

1. Start the backend and frontend (`npm start` / `npm run dev`).
2. Log in as the seeded patient (`emily@patient.com / password123`).
3. Use “Book Visit” to select a doctor and choose an available slot; confirm the booking.
4. Verify the new appointment appears at the top of `/patient/dashboard`.
5. Reschedule the appointment via the card’s quick action and confirm the updated time.
6. Cancel the appointment and ensure it disappears from the upcoming list.
7. Log in as a doctor (e.g., `doctor1@example.com / password123`) to edit availability and confirm the patient view updates.

---

## Quality & Tooling

- **Linting:** `.eslintrc.json` in both backend and frontend; run `npm run lint` (frontend) to check for errors.
- **Formatting:** `.prettierrc` ensures consistent styling; run `npm run format` to format all code.
- **PropTypes:** Every React component exports PropTypes to document props.
- **Accessibility:** Full keyboard navigation support, ARIA labels, semantic HTML, and focus indicators.
- **Design:** Consistent color palette, custom typography (Inter font), and responsive layout.
- **No unused scaffolding:** Project structure trimmed to active components/routes.
- **Secrets:** `.env` is ignored; do not commit credentials.

---

## License

Distributed under the [MIT License](LICENSE). Replace the placeholders above (course section and design doc) before submission.

