const mongoose = require('mongoose');
async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval');
    await mongoose.connection.db.dropDatabase();
    console.log("Database dropped successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
clearDB();
