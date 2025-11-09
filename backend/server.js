import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectToDatabase } from './database/connection.js';
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import doctorRoutes from './routes/doctors.js';
import doctorOnlyRoutes from './routes/doctor/doctor.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Set CORS headers manually without using the cors package
app.use((req, res, next) => {
  console.log('FRONTEND_ORIGIN', process.env.FRONTEND_ORIGIN);

  res.header(
    'Access-Control-Allow-Origin',
    process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', requireAuth, requireRole('doctor'), doctorOnlyRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Clinic Appointment Management System API',
    endpoints: {
      health: '/health',
      auth: '/auth',
      appointments: '/api/appointments',
      doctors: '/api/doctors',
    },
    frontend: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/**', (req, res) => {
  console.error('Request:', req.method, req.baseUrl);
  console.error('Body:', req.body);
  console.error('Headers:', req.headers);
  console.error('Params:', req.params);
  console.error('Query:', req.query);
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, _, res) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
