import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../database/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create appointment (patient only)
router.post('/', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const db = getDatabase();
    const { doctorId, startDateTime, endDateTime, reason } = req.body;
    const patientId = req.user.userId;

    if (!doctorId || !startDateTime || !endDateTime) {
      return res
        .status(400)
        .json({ error: 'doctorId, startDateTime, and endDateTime required' });
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Check if time is at least 1 hour from now
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (start < oneHourFromNow) {
      return res.status(400).json({ error: 'Appointments must be booked at least 1 hour in advance' });
    }

    // Check if doctor exists
    let doctorObjectId;
    try {
      doctorObjectId = new ObjectId(doctorId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid doctor ID' });
    }

    const doctor = await db
      .collection('users')
      .findOne({ _id: doctorObjectId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check for conflicts (patient or doctor double-booking)
    const conflict = await db.collection('appointments').findOne({
      $or: [
        {
          patientId,
          startDateTime: { $lt: end },
          endDateTime: { $gt: start },
          status: { $ne: 'cancelled' },
        },
        {
          doctorId,
          startDateTime: { $lt: end },
          endDateTime: { $gt: start },
          status: { $ne: 'cancelled' },
        },
      ],
    });

    if (conflict) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    const appointment = {
      patientId,
      doctorId: doctorId.toString(),
      startDateTime: start,
      endDateTime: end,
      reason: reason || null,
      status: 'upcoming',
      createdAt: new Date(),
    };

    const result = await db.collection('appointments').insertOne(appointment);
    const inserted = await db
      .collection('appointments')
      .findOne({ _id: result.insertedId });

    res.status(201).json({
      id: inserted._id.toString(),
      patientId: inserted.patientId,
      doctorId: inserted.doctorId,
      startDateTime: inserted.startDateTime,
      endDateTime: inserted.endDateTime,
      reason: inserted.reason,
      status: inserted.status,
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get appointments (patient only)
router.get('/', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const db = getDatabase();
    const patientId = req.user.userId;
    const { status, from, to, page = 1, limit = 20 } = req.query;

    const query = { patientId };

    if (status) {
      query.status = status;
    }

    if (from || to) {
      query.startDateTime = {};
      if (from) {
        query.startDateTime.$gte = new Date(from);
      }
      if (to) {
        query.startDateTime.$lte = new Date(to);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [appointments, total] = await Promise.all([
      db
        .collection('appointments')
        .find(query)
        .sort({ startDateTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      db.collection('appointments').countDocuments(query),
    ]);

    // Populate doctor information
    const appointmentsWithDoctors = await Promise.all(
      appointments.map(async (apt) => {
        let doctorObjectId;
        try {
          doctorObjectId = new ObjectId(apt.doctorId);
        } catch (error) {
          return {
            id: apt._id.toString(),
            patientId: apt.patientId,
            doctorId: apt.doctorId,
            doctorName: 'Unknown',
            doctorSpecialty: null,
            startDateTime: apt.startDateTime,
            endDateTime: apt.endDateTime,
            reason: apt.reason,
            status: apt.status,
          };
        }

        const doctor = await db
          .collection('users')
          .findOne(
            { _id: doctorObjectId },
            { projection: { name: 1, specialty: 1 } }
          );
        return {
          id: apt._id.toString(),
          patientId: apt.patientId,
          doctorId: apt.doctorId,
          doctorName: doctor?.name || 'Unknown',
          doctorSpecialty: doctor?.specialty || null,
          startDateTime: apt.startDateTime,
          endDateTime: apt.endDateTime,
          reason: apt.reason,
          status: apt.status,
        };
      })
    );

    res.json({
      appointments: appointmentsWithDoctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment (reschedule - patient only)
router.put('/:id', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { startDateTime, endDateTime, reason } = req.body;
    const patientId = req.user.userId;

    let appointmentObjectId;
    try {
      appointmentObjectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    // Check appointment exists and belongs to patient
    const appointment = await db.collection('appointments').findOne({
      _id: appointmentObjectId,
      patientId,
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Can only reschedule upcoming appointments
    if (appointment.status !== 'upcoming') {
      return res
        .status(400)
        .json({ error: 'Can only reschedule upcoming appointments' });
    }

    const update = {};

    if (startDateTime || endDateTime) {
      const start = startDateTime
        ? new Date(startDateTime)
        : appointment.startDateTime;
      const end = endDateTime ? new Date(endDateTime) : appointment.endDateTime;

      // Check if time is at least 1 hour from now
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      if (start < oneHourFromNow) {
        return res
          .status(400)
          .json({ error: 'Appointments must be rescheduled to at least 1 hour in advance' });
      }

      // Check for conflicts
      const conflict = await db.collection('appointments').findOne({
        _id: { $ne: appointmentObjectId },
        $or: [
          {
            patientId,
            startDateTime: { $lt: end },
            endDateTime: { $gt: start },
            status: { $ne: 'cancelled' },
          },
          {
            doctorId: appointment.doctorId,
            startDateTime: { $lt: end },
            endDateTime: { $gt: start },
            status: { $ne: 'cancelled' },
          },
        ],
      });

      if (conflict) {
        return res.status(409).json({ error: 'Time slot already booked' });
      }

      update.startDateTime = start;
      update.endDateTime = end;
    }

    if (reason !== undefined) {
      update.reason = reason;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    update.updatedAt = new Date();

    await db
      .collection('appointments')
      .updateOne({ _id: appointmentObjectId }, { $set: update });

    const updated = await db
      .collection('appointments')
      .findOne({ _id: appointmentObjectId });

    res.json({
      id: updated._id.toString(),
      patientId: updated.patientId,
      doctorId: updated.doctorId,
      startDateTime: updated.startDateTime,
      endDateTime: updated.endDateTime,
      reason: updated.reason,
      status: updated.status,
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel appointment (patient only)
router.delete('/:id', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const patientId = req.user.userId;

    let appointmentObjectId;
    try {
      appointmentObjectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    // Check appointment exists and belongs to patient
    const appointment = await db.collection('appointments').findOne({
      _id: appointmentObjectId,
      patientId,
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Can only cancel upcoming appointments
    if (appointment.status !== 'upcoming') {
      return res
        .status(400)
        .json({ error: 'Can only cancel upcoming appointments' });
    }

    await db
      .collection('appointments')
      .updateOne(
        { _id: appointmentObjectId },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
