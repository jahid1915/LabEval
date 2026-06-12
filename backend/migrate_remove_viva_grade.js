/**
 * Migration: Remove Board Viva & Grade data, add assessmentConfig to courses
 *
 * Run with: node backend/migrate_remove_viva_grade.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment. Check backend/.env');
  process.exit(1);
}

const DEFAULT_CONFIG = {
  performance: 5,
  quiz:        30,
  report:      10,
  attendance:  5,
  test:        20,
  others:      5,
};

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // ── 1. Drop the viva collection (Board Viva data) ────────────────
  try {
    const collections = await db.listCollections({ name: 'vivas' }).toArray();
    if (collections.length > 0) {
      await db.collection('vivas').drop();
      console.log('🗑️  Dropped collection: vivas');
    } else {
      console.log('ℹ️  Collection "vivas" does not exist — skipping');
    }
  } catch (err) {
    console.warn('⚠️  Could not drop vivas collection:', err.message);
  }

  // ── 2. Update FinalResult documents — remove grade fields ─────────
  try {
    const frResult = await db.collection('finalresults').updateMany(
      {},
      {
        $unset: { vivaMarks: '', grade: '', gradePoint: '' }
      }
    );
    console.log(`📝 FinalResult: updated ${frResult.modifiedCount} documents (removed vivaMarks, grade, gradePoint)`);
  } catch (err) {
    console.warn('⚠️  FinalResult migration error:', err.message);
  }

  // ── 3. Update Course documents — add assessmentConfig where missing ─
  try {
    const crResult = await db.collection('courses').updateMany(
      { assessmentConfig: { $exists: false } },
      {
        $set: { assessmentConfig: DEFAULT_CONFIG }
      }
    );
    console.log(`📝 Course: added assessmentConfig to ${crResult.modifiedCount} documents`);
  } catch (err) {
    console.warn('⚠️  Course migration error:', err.message);
  }

  // ── 4. Summary ────────────────────────────────────────────────────
  console.log('\n✅ Migration complete!');
  console.log('   - Board Viva data removed');
  console.log('   - Grade/GradePoint fields removed from FinalResult');
  console.log('   - Default assessmentConfig added to all courses');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
