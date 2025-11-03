require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanup() {
  let client;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    console.log('Cleaning up database...');
    await db.collection('users').deleteMany({});
    await db.collection('appointments').deleteMany({});
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

cleanup();

