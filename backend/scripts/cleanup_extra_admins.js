require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function cleanupExtraAdmins() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const User = require('../models/User');
  const Admin = require('../models/Admin');

  // 1. Delete extra admins
  const toDelete = ['demo-admin', 'qa-admin'];
  const userDel = await User.deleteMany({ loginIdentifierLower: { $in: toDelete } });
  console.log(`Deleted ${userDel.deletedCount} user(s) from User collection.`);

  const adminDel = await Admin.deleteMany({ username: { $in: toDelete } });
  console.log(`Deleted ${adminDel.deletedCount} doc(s) from Admin collection.`);

  // 2. Ensure only single Admin doc with role 'admin' exists in Admin collection
  await Admin.updateOne(
    { username: 'admin' },
    { $set: { role: 'admin', email: 'admin@ruet.ac.bd' } }
  );

  // 3. Ensure User document for 'admin' is configured with adminpassword
  const adminHash = await bcrypt.hash('adminpassword', 10);
  await User.updateOne(
    { loginIdentifierLower: 'admin' },
    {
      $set: {
        loginIdentifier: 'admin',
        loginIdentifierLower: 'admin',
        role: 'admin',
        email: 'admin@ruet.ac.bd',
        passwordHash: adminHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: 'ACTIVE'
      }
    }
  );

  // 4. Verification
  const users = await User.find({}).lean();
  const remainingAdminUsers = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
  console.log('\n--- VERIFICATION: Admin Users in User collection ---');
  console.log(`Count: ${remainingAdminUsers.length}`);
  remainingAdminUsers.forEach(u => {
    console.log(`- Login ID: ${u.loginIdentifier} | Email: ${u.email} | Role: ${u.role}`);
  });

  const remainingAdminDocs = await Admin.find({ role: 'admin' }).lean();
  console.log('\n--- VERIFICATION: Admin docs in Admin collection ---');
  console.log(`Count: ${remainingAdminDocs.length}`);
  remainingAdminDocs.forEach(a => {
    console.log(`- Username: ${a.username} | Email: ${a.email} | Role: ${a.role}`);
  });

  // Verify password login works
  const adminUser = await User.findOne({ loginIdentifierLower: 'admin' });
  const isMatch = await bcrypt.compare('adminpassword', adminUser.passwordHash);
  console.log(`\nPassword 'adminpassword' match test: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);

  await mongoose.disconnect();
  console.log('\nDatabase cleanup complete.');
}

cleanupExtraAdmins().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
