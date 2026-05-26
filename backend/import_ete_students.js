require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');

const studentsData = [
  { "rollNumber": "2204001", "name": "Fatin Awsaf Amin" },
  { "rollNumber": "2204002", "name": "Sheikh Tanjim Ahmed" },
  { "rollNumber": "2204003", "name": "Md. Mahe Alam" },
  { "rollNumber": "2204004", "name": "Afifa Tasnim Haque" },
  { "rollNumber": "2204005", "name": "Most.Nafisa Tabassum" },
  { "rollNumber": "2204006", "name": "Md Iftaker Rahaman Radit" },
  { "rollNumber": "2204007", "name": "Talha Mahmud Siam Khan" },
  { "rollNumber": "2204008", "name": "Md. Mahir Shahriar" },
  { "rollNumber": "2204009", "name": "Farhan Hasin Fahim" },
  { "rollNumber": "2204010", "name": "Md. Rakib Hasan" },
  { "rollNumber": "2204011", "name": "Md. Lohan Ali" },
  { "rollNumber": "2204012", "name": "Bhismodev Saha Dhairjo" },
  { "rollNumber": "2204014", "name": "Ajraf Fahim" },
  { "rollNumber": "2204015", "name": "MD. Sawgatul Alam" },
  { "rollNumber": "2204016", "name": "Md. Tarik Jamil" },
  { "rollNumber": "2204017", "name": "Obaidul Islam Aontor" },
  { "rollNumber": "2204018", "name": "Samiha Tabassum Anika" },
  { "rollNumber": "2204019", "name": "MD. Muraduzzaman Sifat" },
  { "rollNumber": "2204020", "name": "Md. Atique Ashfak Arib" },
  { "rollNumber": "2204023", "name": "Amit Kamar Das" },
  { "rollNumber": "2204024", "name": "Mohammad Naim" },
  { "rollNumber": "2204025", "name": "Samiha Noshin Samiha" },
  { "rollNumber": "2204026", "name": "Abir Hossain Bhuiyan" },
  { "rollNumber": "2204027", "name": "S M Anik Hasan" },
  { "rollNumber": "2204028", "name": "Md. Jahid Hasan" },
  { "rollNumber": "2204029", "name": "Mst. Sahida Sultana" },
  { "rollNumber": "2204030", "name": "Tanim Shahriar Mitul" },
  { "rollNumber": "2204031", "name": "Faria Mozahid Othoy" },
  { "rollNumber": "2204032", "name": "Md Shoab Aktar" },
  { "rollNumber": "2204033", "name": "Jannatul Ferdaus" },
  { "rollNumber": "2204034", "name": "Md. Tareq Rahman" },
  { "rollNumber": "2204035", "name": "SM Tamjid" },
  { "rollNumber": "2204036", "name": "Pratick Chakraborty Dibba" },
  { "rollNumber": "2204037", "name": "Md. Khalid Hossen" },
  { "rollNumber": "2204038", "name": "Md. Anik Hassan" },
  { "rollNumber": "2204039", "name": "Muammar Ilham" },
  { "rollNumber": "2204040", "name": "Sanzidul Islam" },
  { "rollNumber": "2204041", "name": "Md. Sohanur Rahman Sohan" },
  { "rollNumber": "2204042", "name": "Mohaiminul Islam" },
  { "rollNumber": "2204043", "name": "Md Farhan Labib" },
  { "rollNumber": "2204044", "name": "Arnob Das Ricky" },
  { "rollNumber": "2204045", "name": "Tanmoy Debnath" },
  { "rollNumber": "2204046", "name": "Oritree Zaman" },
  { "rollNumber": "2204047", "name": "Tawfiq Ahmed Rafi" },
  { "rollNumber": "2204048", "name": "MD Mehedy Hasan" },
  { "rollNumber": "2204049", "name": "Md Mahabub Hasan Hridoy" },
  { "rollNumber": "2204050", "name": "Fahat Tasnim Lamisa" },
  { "rollNumber": "2204051", "name": "Ranesh Das Rik" },
  { "rollNumber": "2204052", "name": "Tasfiul Mostafa" },
  { "rollNumber": "2204053", "name": "Shahriar Shahid Shuvo" },
  { "rollNumber": "2204054", "name": "Fatema Tuz Johra" },
  { "rollNumber": "2204055", "name": "Adnan Sakib Esha" },
  { "rollNumber": "2204056", "name": "MD Symul Haque" },
  { "rollNumber": "2204057", "name": "Faria Mahjabin Jime" },
  { "rollNumber": "2204058", "name": "MD MOSHFIKUR RAHMAN TOSHUN" },
  { "rollNumber": "2204059", "name": "Iftakhar Mahmud Tamim" },
  { "rollNumber": "2204060", "name": "Imrul Islam Emon" }
];

async function importStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval');
    
    console.log("Deleting all existing student records from the database...");
    const deleteResult = await Student.deleteMany({});
    console.log(`Successfully deleted ${deleteResult.deletedCount} student records.`);
    
    for (const data of studentsData) {
      const student = new Student({
        name: data.name,
        rollNumber: data.rollNumber,
        department: 'ETE',
        series: '22',
        contactNo: 'N/A',
        password: 'password123',
        role: 'student'
      });
      await student.save();
      console.log(`Imported ${data.rollNumber} - ${data.name}`);
    }
    
    console.log(`Successfully imported ${studentsData.length} students into MongoDB!`);
    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error.message || error);
    process.exit(1);
  }
}

importStudents();
