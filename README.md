# Clinic Appointment Management System

A lightweight scheduling application where patients can book, view, reschedule, and cancel appointments. This is a full-stack web application built with React and Node.js.

## Authors

- Shaobo (Ben) Chen
- Chirag Suthar

## Class Link

CS5610 Web Development - Project 03

## Project Objective

Create a clinic appointment management system that allows patients to:
- Browse available appointment times
- Book new appointments
- View upcoming appointments
- Reschedule existing appointments
- Cancel appointments
- View appointment history with filtering and pagination

The application features role-based authentication, with separate dashboards for patients and doctors (doctor features to be implemented).

## Screenshots

### Login Page
The application starts with a clean, modern login page inspired by Carbon Health's design. Users can sign in or register for a new account.

### Patient Dashboard
Upon login, patients see their dashboard with upcoming appointments and quick access to book new appointments.

### Appointment Booking
Patients can select a doctor and choose their preferred appointment time with an intuitive booking form.

### Appointment History
View all past and upcoming appointments with filtering by status, date range, and pagination support.

## Technology Stack

### Frontend
- React 18.2.0 (with Hooks)
- React Router DOM 6.20.0
- Vite 5.0.8
- CSS (component-scoped)
- PropTypes for type checking

### Backend
- Node.js
- Express 4.18.2
- MongoDB Node.js Driver 6.3.0 (no Mongoose)
- JWT for authentication
- bcryptjs for password hashing

### Database
- MongoDB Atlas
- Collections: `users`, `appointments`

## Project Structure

```
Project03/
├── backend/
│   ├── database/
│   │   └── connection.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   └── doctors.js
│   ├── scripts/
│   │   ├── seed.js
│   │   └── cleanup.js
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   ├── Patient/
│   │   │   └── Shared/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## Instructions to Build

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB instance)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```env
   PORT=3001
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/clinic_appointments?retryWrites=true&w=majority
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```

   **Important:** Replace `<username>` and `<password>` with your MongoDB Atlas credentials. Never commit the `.env` file to version control.

4. Seed the database:
   ```bash
   npm run seed
   ```

   This will create:
   - Test patient: `emily@patient.com` / `password123`
   - 50 additional patients
   - 15 doctors
   - 650+ appointments

5. Start the backend server:
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

### Production Build

To create a production build of the frontend:

```bash
cd frontend
npm run build
```

The built files will be in the `dist/` directory.

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Appointments (Patient)
- `POST /api/appointments` - Create a new appointment
- `GET /api/appointments` - Get patient's appointments (with filters)
- `PUT /api/appointments/:id` - Update/reschedule an appointment
- `DELETE /api/appointments/:id` - Cancel an appointment

### Doctors
- `GET /api/doctors` - Get list of all doctors

## Features Implemented

### Patient Features
- ✅ User registration and login
- ✅ Browse and book appointments
- ✅ View upcoming appointments on dashboard
- ✅ Reschedule appointments
- ✅ Cancel appointments
- ✅ View appointment history with:
  - Filter by status (upcoming, completed, cancelled, no-show)
  - Filter by date range
  - Pagination
- ✅ Prevent double-booking
- ✅ Only allow booking future appointments

### Security
- ✅ JWT-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Role-based route protection
- ✅ Environment variables for secrets

### Code Quality
- ✅ ESLint configuration
- ✅ Prettier formatting
- ✅ PropTypes for all React components
- ✅ Component-scoped CSS
- ✅ Each component in its own file
- ✅ No prohibited libraries (no Mongoose, Axios, CORS middleware)

## Database Schema

### Users Collection
```javascript
{
  "_id": ObjectId,
  "email": String,
  "hashedPassword": String,
  "role": "patient" | "doctor",
  "name": String,
  "phone": String (optional),
  "dob": Date (optional),
  "specialty": String (optional, doctors only),
  "createdAt": Date
}
```

### Appointments Collection
```javascript
{
  "_id": ObjectId,
  "patientId": String,
  "doctorId": String,
  "startDateTime": Date,
  "endDateTime": Date,
  "reason": String (optional),
  "status": "upcoming" | "completed" | "cancelled" | "no-show",
  "createdAt": Date,
  "updatedAt": Date (optional)
}
```

### Indexes
- `appointments`: `{ patientId: 1, startDateTime: 1 }`
- `appointments`: `{ doctorId: 1, startDateTime: 1 }`
- `appointments`: Text index on `reason`

## Testing

1. Register a new patient account or use the test account:
   - Email: `emily@patient.com`
   - Password: `password123`

2. Login and explore the patient dashboard

3. Book a new appointment by selecting a doctor and time

4. View your appointment history with various filters

5. Try rescheduling or cancelling an upcoming appointment

## License

MIT License - See LICENSE file for details

## Notes

- The application uses fetch API instead of Axios
- MongoDB native driver is used instead of Mongoose
- No CORS middleware is used (proxied through Vite in development)
- All React components use hooks
- Each component has its own CSS file
- PropTypes are defined for all components
- The design is inspired by Carbon Health's clean, modern interface

