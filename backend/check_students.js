const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval');

const Student = require('./models/Student');

async function check() {
  const students = await Student.find({}).sort({ rollNumber: 1 });
  console.log(`Total students: ${students.length}`);
  const group1 = students.filter(s => {
    const last3 = parseInt(s.rollNumber.slice(-3));
    return last3 >= 1 && last3 <= 30;
  });
  const group2 = students.filter(s => {
    const last3 = parseInt(s.rollNumber.slice(-3));
    return last3 >= 31 && last3 <= 60;
  });
  console.log(`Group 1 count: ${group1.length}`);
  console.log(`Group 2 count: ${group2.length}`);
  if (group2.length === 0) {
    console.log("Sample roll numbers:", students.map(s => s.rollNumber).slice(30, 40));
  }
  process.exit();
}
check();
