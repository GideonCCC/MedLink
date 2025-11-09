import express from 'express';
import PreCheck from '../../middleware/pre_check.js';
import { getDatabase } from '../../database/connection.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.delete('/appointment/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { userId } = req.user;

    const appointment = await db
      .collection('appointments')
      .findOne({ _id: new ObjectId(id), doctorId: userId });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found or you are not authorized to delete it',
      });
    }

    await db.collection('appointments').deleteOne({ _id: appointment._id });

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/appointment/no-show/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { userId } = req.user;

    const appointment = await db
      .collection('appointments')
      .findOne({ _id: new ObjectId(id), doctorId: userId });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found or you are not authorized to update it',
      });
    }

    await db
      .collection('appointments')
      .updateOne({ _id: appointment._id }, { $set: { status: 'no-show' } });

    res
      .status(200)
      .json({ message: 'Appointment marked as no-show successfully' });
  } catch (error) {
    console.error('Update appointment error:', error);
  }
});

router.get('/current-appointment', async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.user;

    const appointment = await db.collection('appointments').findOne({
      doctorId: userId,
      startDateTime: { $lte: new Date() },
      endDateTime: { $gt: new Date() },
      status: { $ne: 'no-show' },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'No current appointment found' });
    }

    const patient = await db
      .collection('users')
      .findOne({ _id: new ObjectId(appointment.patientId) });

    return res.status(200).json({
      ...appointment,
      patientName: patient.name,
    });
  } catch (error) {
    console.error('Get current appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/past-appointments', async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.user;

    const appointments = await db
      .collection('appointments')
      .find({
        doctorId: userId,
        endDateTime: { $lt: new Date() },
        status: { $in: ['completed', 'cancelled', 'no-show'] },
      })
      .sort({ endDateTime: -1 })
      .toArray();

    const appointmentsWithPatientName = await Promise.all(
      appointments.map(async (appointment) => {
        const patient = await db
          .collection('users')
          .findOne({ _id: new ObjectId(appointment.patientId) });

        return {
          ...appointment,
          patientName: patient.name,
        };
      })
    );

    res.status(200).json({ appointments: appointmentsWithPatientName });
  } catch (error) {
    console.error('Get past appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upcoming-appointments', async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.user;

    const appointments = await db
      .collection('appointments')
      .find({ doctorId: userId, startDateTime: { $gte: new Date() } })
      .sort({ startDateTime: 1 })
      .toArray();

    const appointmentsWithPatientName = await Promise.all(
      appointments.map(async (appointment) => {
        const patient = await db
          .collection('users')
          .findOne({ _id: new ObjectId(appointment.patientId) });

        return {
          ...appointment,
          patientName: patient.name,
        };
      })
    );

    res.status(200).json({ appointments: appointmentsWithPatientName });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my-availability', async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.user;

    const availability = await db
      .collection('availability')
      .findOne({ userId });

    res.status(200).json(availability);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update-availability', PreCheck.availibility, async (req, res) => {
  try {
    const db = getDatabase();
    const { availability } = req.body;

    const { userId } = req.user;

    if (await db.collection('availability').findOne({ userId })) {
      await db
        .collection('availability')
        .updateOne({ userId }, { $set: { availability } });

      return res
        .status(200)
        .json({ message: 'Availability updated successfully' });
    }

    await db.collection('availability').insertOne({
      userId,
      availability,
    });

    res.status(201).json({ message: 'Availability created successfully' });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
