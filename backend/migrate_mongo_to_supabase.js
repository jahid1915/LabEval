const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_') || supabaseKey.includes('YOUR_')) {
  console.error('Error: Please configure SUPABASE_URL and SUPABASE_KEY in backend/.env before running migration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let MongoClient;
  try {
    MongoClient = require('mongodb').MongoClient;
  } catch (err) {
    console.error('Error: The "mongodb" driver is not installed. Please run:');
    console.error('  npm install mongodb');
    console.error('and then try running this migration script again.');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db();
    console.log('Connected to MongoDB.');

    // 1. Migrate Courses
    console.log('Migrating courses...');
    const mongoCourses = await db.collection('courses').find({}).toArray();
    console.log(`Found ${mongoCourses.length} courses in MongoDB.`);
    for (const c of mongoCourses) {
      const { error } = await supabase.from('courses').upsert({
        course_id: c.courseId,
        course_name: c.courseName,
        department: c.department,
        created_at: c.createdAt || new Date(),
        updated_at: c.updatedAt || new Date()
      });
      if (error) console.error(`Error migrating course ${c.courseId}:`, error.message);
    }

    const studentIdMap = {};
    const teacherIdMap = {};

    // 2. Migrate Teachers
    console.log('Migrating teachers...');
    const mongoTeachers = await db.collection('teachers').find({}).toArray();
    console.log(`Found ${mongoTeachers.length} teachers in MongoDB.`);
    for (const t of mongoTeachers) {
      const { data: existing } = await supabase.from('teachers').select('id').eq('teacher_id', t.teacherId).maybeSingle();
      let supabaseId;
      if (existing) {
        supabaseId = existing.id;
      } else {
        const { data: created, error } = await supabase.from('teachers').insert({
          name: t.name,
          teacher_id: t.teacherId,
          department: t.department,
          contact_no: t.contactNo || 'N/A',
          password: t.password,
          role: t.role || 'teacher',
          allocated_courses: t.allocatedCourses || [],
          created_at: t.createdAt || new Date(),
          updated_at: t.updatedAt || new Date()
        }).select().single();
        if (error) {
          console.error(`Error migrating teacher ${t.teacherId}:`, error.message);
          continue;
        }
        supabaseId = created.id;
      }
      teacherIdMap[t._id.toString()] = supabaseId;
    }

    // 3. Migrate Students
    console.log('Migrating students...');
    const mongoStudents = await db.collection('students').find({}).toArray();
    console.log(`Found ${mongoStudents.length} students in MongoDB.`);
    for (const s of mongoStudents) {
      const { data: existing } = await supabase.from('students').select('id').eq('roll_number', s.rollNumber).maybeSingle();
      let supabaseId;
      if (existing) {
        supabaseId = existing.id;
      } else {
        const { data: created, error } = await supabase.from('students').insert({
          name: s.name,
          series: s.series,
          roll_number: s.rollNumber,
          department: s.department,
          contact_no: s.contactNo || 'N/A',
          password: s.password,
          role: s.role || 'student',
          enrolled_courses: s.enrolledCourses || [],
          created_at: s.createdAt || new Date(),
          updated_at: s.updatedAt || new Date()
        }).select().single();
        if (error) {
          console.error(`Error migrating student ${s.rollNumber}:`, error.message);
          continue;
        }
        supabaseId = created.id;
      }
      studentIdMap[s._id.toString()] = supabaseId;
    }

    // Generic migrator helper for sub-tables
    const migrateRecords = async (mongoCollectionName, supabaseTableName, recordName) => {
      console.log(`Migrating ${recordName}...`);
      const mongoRecords = await db.collection(mongoCollectionName).find({}).toArray();
      console.log(`Found ${mongoRecords.length} ${recordName} in MongoDB.`);
      
      const toInsert = [];
      for (const r of mongoRecords) {
        const studentId = studentIdMap[r.student?.toString()];
        const teacherId = teacherIdMap[r.teacher?.toString()] || null;
        if (!studentId) {
          continue;
        }
        
        const dateStr = r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const row = {
          student_id: studentId,
          course: r.course,
          date: dateStr,
          teacher_id: teacherId,
          created_at: r.createdAt || new Date(),
          updated_at: r.updatedAt || new Date()
        };

        if (r.dayName !== undefined) row.day_name = r.dayName;
        if (r.status !== undefined) row.status = r.status;
        if (r.marks !== undefined) row.marks = r.marks;
        if (r.type !== undefined) row.type = r.type;

        toInsert.push(row);
      }

      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const { error } = await supabase.from(supabaseTableName).insert(chunk);
        if (error) console.error(`Error inserting chunk for ${supabaseTableName}:`, error.message);
      }
    };

    // 4. Migrate attendance, reports, performances, quizzes, tests, others, requests
    await migrateRecords('attendances', 'attendance', 'attendance records');
    await migrateRecords('reports', 'reports', 'report records');
    await migrateRecords('performances', 'performances', 'performance records');
    await migrateRecords('quizzes', 'quizzes', 'quiz records');
    await migrateRecords('tests', 'tests', 'test records');
    await migrateRecords('others', 'others', 'other records');
    await migrateRecords('requests', 'requests', 'detailed marks requests');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message || error);
  } finally {
    await client.close();
  }
}

run();
