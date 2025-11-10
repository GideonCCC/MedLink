import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectToDatabase } from './database/connection.js';
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import doctorRoutes from './routes/doctors.js';
import doctorOnlyRoutes from './routes/doctor/doctor.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const hasFrontendBuild = fs.existsSync(frontendDistPath);

app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', requireAuth, requireRole('doctor'), doctorOnlyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Clinic Appointment Management System API',
    endpoints: {
      health: '/health',
      auth: '/auth',
      appointments: '/api/appointments',
      doctors: '/api/doctors',
    },
  });
});

// Serve frontend build if available
if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

// SPA fallback for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return next();
  }

  if (!hasFrontendBuild || req.method !== 'GET') {
    return next();
  }

  return res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

// 404 handler for API/non-matched routes
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).send('Not found');
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
