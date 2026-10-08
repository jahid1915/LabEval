/**
 * LabEval — Student Database Cleanup Script
 * 
 * Removes all student-related records from the database while preserving:
 * - Teachers, Admins, Departments, Faculties
 * - Courses, CourseOfferings, TeacherAssignments
 * - ElectiveOfferings (config), AcademicSessions, Series
 * - ImportJobs (historical metadata)
 * - Announcements, AuditLogs, Notifications
 * 
 * Usage: node scripts/cleanup_students.js
 * 
 * WARNING: This is irreversible. All student academic data will be deleted.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

async function cleanup() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LabEval — Student Database Cleanup');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Collections to clear completely (all records reference students)
    const FULL_CLEAR = [
      'students',
      'attendances',
      'requests',
      'finalresults',
      'finalenrollments',
      'electiveselections',
    ];

    // Log counts before deletion
    console.log('── Pre-Cleanup Counts ──────────────────────────────────\n');
    const preCounts = {};
    for (const col of FULL_CLEAR) {
      try {
        const count = await db.collection(col).countDocuments();
        preCounts[col] = count;
        console.log(`  ${col.padEnd(25)} ${count} documents`);
      } catch {
        preCounts[col] = 0;
        console.log(`  ${col.padEnd(25)} (collection not found)`);
      }
    }

    // Count student-specific OTPs
    let studentOtpCount = 0;
    try {
      studentOtpCount = await db.collection('otps').countDocuments({ userModel: 'Student' });
      console.log(`  ${'otps (Student)'.padEnd(25)} ${studentOtpCount} documents`);
    } catch {
      console.log(`  ${'otps (Student)'.padEnd(25)} (collection not found)`);
    }

    // Preserved collections — log for verification
    console.log('\n── Preserved Collections (NOT deleted) ────────────────\n');
    const PRESERVED = ['teachers', 'admins', 'departments', 'faculties', 'courses',
      'courseofferings', 'teacherassignments', 'electiveofferings',
      'academicsessions', 'series', 'importjobs', 'announcements', 'auditlogs',
      'semesters', 'notifications', 'importmappingtemplates'];
    for (const col of PRESERVED) {
      try {
        const count = await db.collection(col).countDocuments();
        console.log(`  ✓ ${col.padEnd(28)} ${count} documents (preserved)`);
      } catch {
        console.log(`  ✓ ${col.padEnd(28)} (not found)`);
      }
    }

    // Perform deletion
    console.log('\n── Deleting Student Data ───────────────────────────────\n');

    let totalDeleted = 0;

    for (const col of FULL_CLEAR) {
      try {
        const result = await db.collection(col).deleteMany({});
        const count = result.deletedCount || 0;
        totalDeleted += count;
        console.log(`  🗑  ${col.padEnd(25)} ${count} deleted`);
      } catch (err) {
        console.log(`  ⚠  ${col.padEnd(25)} skip (${err.message})`);
      }
    }

    // Delete only student-related OTPs
    try {
      const otpResult = await db.collection('otps').deleteMany({ userModel: 'Student' });
      const otpCount = otpResult.deletedCount || 0;
      totalDeleted += otpCount;
      console.log(`  🗑  ${'otps (Student)'.padEnd(25)} ${otpCount} deleted`);
    } catch (err) {
      console.log(`  ⚠  ${'otps (Student)'.padEnd(25)} skip (${err.message})`);
    }

    // Post-cleanup verification
    console.log('\n── Post-Cleanup Verification ───────────────────────────\n');
    for (const col of FULL_CLEAR) {
      try {
        const count = await db.collection(col).countDocuments();
        const icon = count === 0 ? '✅' : '⚠️';
        console.log(`  ${icon} ${col.padEnd(25)} ${count} remaining`);
      } catch {
        console.log(`  ✅ ${col.padEnd(25)} 0 remaining`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Total documents deleted: ${totalDeleted}`);
    console.log('  Student database has been reset successfully.');
    console.log('  Import new students via Admin Panel → Import Students.');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  }
}

cleanup();
