const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/labeval';

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ Primary MongoDB Connection failed (${error.message}). Attempting fallback to local instance...`);
    }
  }

  try {
    const fallbackConn = await mongoose.connect(fallbackUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`✅ Fallback Local MongoDB Connected: ${fallbackConn.connection.host}`);
    return fallbackConn;
  } catch (err) {
    console.warn(`⚠️ Local MongoDB is not running (${err.message}).`);
    console.warn(`👉 To use real-time database operations, ensure MongoDB or Atlas cluster is reachable.`);
  }
};

module.exports = connectDB;
