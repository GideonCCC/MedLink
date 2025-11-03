const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const db = getDatabase();
    const { email, password, role, name, phone, dob, specialty } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (role !== 'patient' && role !== 'doctor') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      email,
      hashedPassword,
      role,
      name,
      phone: phone || null,
      dob: dob || null,
      specialty: role === 'doctor' ? specialty || null : null,
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(user);

    // Generate JWT
    const token = jwt.sign(
      { userId: result.insertedId.toString(), role, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email,
        role,
        name,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const db = getDatabase();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but server can track if needed)
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const db = getDatabase();
    let userObjectId;
    try {
      userObjectId = new ObjectId(req.user.userId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await db
      .collection('users')
      .findOne({ _id: userObjectId }, { projection: { hashedPassword: 0 } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
      dob: user.dob,
      specialty: user.specialty,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

