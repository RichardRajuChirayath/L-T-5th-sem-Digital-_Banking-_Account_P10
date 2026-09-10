const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    console.log('[MongoDB] Connecting to primary database URI...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.warn(`\n⚠️  [MongoDB Notice] Remote Atlas connection failed: ${error.message}`);
    console.log('⚡ [MongoDB Fallback] Starting in-memory MongoDB engine for seamless local development, testing & viva...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          startupTimeout: 60000
        }
      });
      const localUri = memoryServer.getUri();
      console.log(`[MongoDB] Local InMemory Engine active at: ${localUri}`);

      await mongoose.connect(localUri);
      console.log('[MongoDB] Connected to in-memory instance. Auto-seeding initial database...');

      // Auto seed default data so application is instantly ready
      const seedModule = require('../scripts/seed-memory');
      await seedModule();
      console.log('[MongoDB] Initial mock data seeded successfully!\n');
    } catch (localErr) {
      console.error('[MongoDB Error] Both remote and local memory fallback failed:', localErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
