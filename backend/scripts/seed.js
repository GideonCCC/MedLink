require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const specialties = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
];

const reasons = [
  'Annual checkup',
  'Flu symptoms',
  'Cough and cold',
  'Back pain',
  'Headache',
  'Skin rash',
  'Follow-up appointment',
  'Vaccination',
  'Blood pressure check',
  'Medication refill',
];

const statuses = ['upcoming', 'completed', 'cancelled', 'no-show'];

async function seed() {
  let client;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    console.log('Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('appointments').deleteMany({});

    console.log('Creating users...');
    const users = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create 1 test patient (Emily)
    const emily = {
      email: 'emily@patient.com',
      hashedPassword,
      role: 'patient',
      name: 'Emily Smith',
      phone: '555-0100',
      dob: new Date('1997-05-15'),
      createdAt: new Date(),
    };
    const emilyResult = await db.collection('users').insertOne(emily);
    users.push({ ...emily, _id: emilyResult.insertedId });

    // Create 40-60 patients
    for (let i = 1; i <= 50; i++) {
      const patient = {
        email: `patient${i}@example.com`,
        hashedPassword,
        role: 'patient',
        name: `Patient ${i}`,
        phone: `555-${String(1000 + i).padStart(4, '0')}`,
        dob: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        createdAt: new Date(),
      };
      const result = await db.collection('users').insertOne(patient);
      users.push({ ...patient, _id: result.insertedId });
    }

    // Create 10-20 doctors
    const doctors = [];
    for (let i = 1; i <= 15; i++) {
      const doctor = {
        email: `doctor${i}@example.com`,
        hashedPassword,
        role: 'doctor',
        name: `Dr. ${['Michael', 'Sarah', 'James', 'Emma', 'David', 'Lisa', 'Robert', 'Jennifer'][i % 8]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][i % 8]}`,
        phone: `555-${String(2000 + i).padStart(4, '0')}`,
        specialty: specialties[i % specialties.length],
        createdAt: new Date(),
      };
      const result = await db.collection('users').insertOne(doctor);
      doctors.push({ ...doctor, _id: result.insertedId });
    }

    console.log(`Created ${users.length} users and ${doctors.length} doctors`);

    // Create appointments
    console.log('Creating appointments...');
    const appointments = [];
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Generate at least 600 patient-owned appointments
    for (let i = 0; i < 650; i++) {
      const patient = users[Math.floor(Math.random() * users.length)];
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];

      // Random date between 1 year ago and 1 year ahead
      const randomTime =
        oneYearAgo.getTime() +
        Math.random() * (oneYearAhead.getTime() - oneYearAgo.getTime());
      const startDateTime = new Date(randomTime);

      // Round to nearest 15 minutes and set reasonable hours (8 AM - 6 PM)
      const hours = 8 + Math.floor(Math.random() * 10);
      const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min appointment

      // Assign status based on time
      let status;
      if (startDateTime < now) {
        // Past appointments
        status = statuses[Math.floor(Math.random() * 3) + 1]; // completed, cancelled, or no-show
      } else {
        // Future appointments
        status = Math.random() > 0.1 ? 'upcoming' : 'cancelled'; // 90% upcoming, 10% cancelled
      }

      const appointment = {
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        startDateTime,
        endDateTime,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        status,
        createdAt: new Date(),
      };

      appointments.push(appointment);
    }

    // Insert appointments in batches
    const batchSize = 100;
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = appointments.slice(i, i + batchSize);
      await db.collection('appointments').insertMany(batch);
      console.log(`Inserted ${Math.min(i + batchSize, appointments.length)} appointments...`);
    }

    // Create indexes
    console.log('Creating indexes...');
    await db.collection('appointments').createIndex({ patientId: 1, startDateTime: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1, startDateTime: 1 });
    await db.collection('appointments').createIndex({ reason: 'text' });

    console.log(`\nSeed completed successfully!`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Doctors: ${doctors.length}`);
    console.log(`- Appointments: ${appointments.length}`);
    console.log(`\nTest patient login: emily@patient.com / password123`);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seed();

