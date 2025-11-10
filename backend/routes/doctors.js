import express from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/connection.js';

const router = express.Router();
const CLINIC_TIME_ZONE = process.env.CLINIC_TIMEZONE || 'America/New_York';

function getTimeZoneOffset(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return (asUTC - date.getTime()) / 60000;
}

function createZonedDate(year, month, day, hour, minute, timeZone) {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getTimeZoneOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offsetMinutes * 60000);
}

function formatTimeInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// Get all specialties (public - no auth required)
router.get('/specialties', async (req, res) => {
  try {
    const db = getDatabase();
    const specialties = await db
      .collection('users')
      .distinct('specialty', { role: 'doctor', specialty: { $ne: null } });

    res.json(specialties.sort());
  } catch (error) {
    console.error('Get specialties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all doctors (public - no auth required)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { specialty } = req.query;

    const query = { role: 'doctor' };
    if (specialty) {
      query.specialty = { $regex: specialty, $options: 'i' };
    }

    const doctors = await db
      .collection('users')
      .find(query, { projection: { hashedPassword: 0 } })
      .toArray();

    res.json(
      doctors.map((doctor) => ({
        id: doctor._id.toString(),
        name: doctor.name,
        specialty: doctor.specialty,
        email: doctor.email,
      }))
    );
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor availability for a specific date (public)
router.get('/:id/availability', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    let doctorObjectId;
    try {
      doctorObjectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid doctor ID' });
    }

    const doctor = await db
      .collection('users')
      .findOne({ _id: doctorObjectId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Parse the date and get start/end of day in local time
    const [year, month, day] = date.split('-').map(Number);
    if ([year, month, day].some((value) => Number.isNaN(value))) {
      return res.status(400).json({ error: 'Invalid date parameter' });
    }
    const startOfDay = createZonedDate(year, month, day, 0, 0, CLINIC_TIME_ZONE);
    const startOfNextDay = createZonedDate(year, month, day + 1, 0, 0, CLINIC_TIME_ZONE);

    // Get all appointments for this doctor on this date
    const appointments = await db
      .collection('appointments')
      .find({
        doctorId: id,
        startDateTime: { $gte: startOfDay, $lt: startOfNextDay },
        status: { $ne: 'cancelled' },
      })
      .toArray();

    // Optionally include patient-specific appointments to avoid conflicts
    let patientAppointments = [];
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        patientAppointments = await db
          .collection('appointments')
          .find({
            patientId: decoded.userId,
            startDateTime: { $gte: startOfDay, $lt: startOfNextDay },
            status: { $ne: 'cancelled' },
          })
          .toArray();
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    // Generate available 30-minute slots from 8 AM to 6 PM
    const slots = [];
    const startHour = 8;
    const endHour = 18;
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = createZonedDate(year, month, day, hour, minute, CLINIC_TIME_ZONE);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

        // Skip if slot is less than 1 hour from now
        // This allows same-day appointments as long as they're at least 1 hour ahead
        if (slotStart < oneHourFromNow) {
          continue;
        }

        // Check if this slot conflicts with any appointment
        const isDoctorBooked = appointments.some((apt) => {
          const aptStart = new Date(apt.startDateTime);
          const aptEnd = new Date(apt.endDateTime);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        const isPatientBooked = patientAppointments.some((apt) => {
          const aptStart = new Date(apt.startDateTime);
          const aptEnd = new Date(apt.endDateTime);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !isDoctorBooked && !isPatientBooked,
          time: formatTimeInZone(slotStart, CLINIC_TIME_ZONE),
        });
      }
    }

    res.json({
      doctor: {
        id: doctor._id.toString(),
        name: doctor.name,
        specialty: doctor.specialty,
      },
      date: date,
      slots,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
