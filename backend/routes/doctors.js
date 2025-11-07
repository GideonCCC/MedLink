import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../database/connection.js';

const router = express.Router();

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
    const selectedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all appointments for this doctor on this date
    const appointments = await db
      .collection('appointments')
      .find({
        doctorId: id,
        startDateTime: { $gte: selectedDate, $lt: nextDay },
        status: { $ne: 'cancelled' },
      })
      .toArray();

    // Generate available 30-minute slots from 8 AM to 6 PM
    const slots = [];
    const startHour = 8;
    const endHour = 18;
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        // Skip if slot is less than 1 hour from now
        // This allows same-day appointments as long as they're at least 1 hour ahead
        if (slotStart < oneHourFromNow) {
          continue;
        }

        // Check if this slot conflicts with any appointment
        const isBooked = appointments.some((apt) => {
          const aptStart = new Date(apt.startDateTime);
          const aptEnd = new Date(apt.endDateTime);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !isBooked,
          time: slotStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        });
      }
    }

    res.json({
      doctor: {
        id: doctor._id.toString(),
        name: doctor.name,
        specialty: doctor.specialty,
      },
      date: selectedDate.toISOString().split('T')[0],
      slots,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
