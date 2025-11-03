const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectToDatabase() {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return db;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  closeDatabase,
};

