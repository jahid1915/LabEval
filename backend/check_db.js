const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval');
    
    const students = await Student.find({}).lean();
    const teachers = await Teacher.find({}).lean();
    
    console.log("=== STUDENTS ===");
    console.log(JSON.stringify(students, null, 2));
    
    console.log("\n=== TEACHERS ===");
    console.log(JSON.stringify(teachers, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDB();
