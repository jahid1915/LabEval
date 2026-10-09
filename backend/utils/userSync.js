const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

/**
 * Synchronize central User records with existing Admin, Teacher, and Student documents.
 * Ensures consistent authentication database records across all roles without resetting passwords.
 */
async function syncUsers() {
  try {
    const userCount = await User.countDocuments();
    // 1. Ensure Default System Admin exists (ADMIN / admin123)
    let adminUser = await User.findOne({ loginIdentifierLower: 'admin' }).lean();
    let adminDoc = await Admin.findOne({
      $or: [{ username: 'admin' }, { role: 'super_admin' }, { role: 'admin' }]
    });

    if (!adminUser) {
      const defaultPasswordHash = adminDoc?.password || await User.hashPassword('admin123');
      adminUser = await User.create({
        loginIdentifier: 'ADMIN',
        loginIdentifierLower: 'admin',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        status: 'ACTIVE',
        name: adminDoc?.name || 'System Administrator',
        email: adminDoc?.email || 'admin@ruet.ac.bd',
        phone: adminDoc?.contactNo || '01700000001',
        department: '',
        faculty: '',
        profileRef: adminDoc?._id || null,
        profileModel: adminDoc ? 'Admin' : null,
        mustChangePassword: true,
      });
      console.log('  [UserSync] Default ADMIN User created.');
    }

    if (!adminDoc) {
      adminDoc = await Admin.create({
        name: adminUser.name || 'System Administrator',
        username: 'admin',
        email: adminUser.email || 'admin@ruet.ac.bd',
        contactNo: adminUser.phone || '01700000001',
        password: 'admin123',
        role: 'super_admin',
        designation: 'System Administrator',
        user: adminUser._id,
        status: 'active'
      });
      await User.updateOne({ _id: adminUser._id }, {
        $set: { profileRef: adminDoc._id, profileModel: 'Admin' }
      });
      console.log('  [UserSync] Default Admin document created and linked.');
    } else if (!adminDoc.user) {
      adminDoc.user = adminUser._id;
      await adminDoc.save();
    }

    // If User collection is already populated with adequate records, skip expensive full scans
    if (userCount > 10) {
      console.log(`  [UserSync] Fast startup: ${userCount} authentication records already present.`);
      return;
    }

    console.log('  [UserSync] Performing one-time initial bulk synchronization...');
    // Single-pass Set lookup of existing logins to avoid N+1 queries
    const existingLogins = new Set(
      (await User.find({}, 'loginIdentifierLower').lean()).map(u => u.loginIdentifierLower)
    );

    // 2. Synchronize Department Heads & Admins
    const admins = await Admin.find({}).lean();
    for (const adm of admins) {
      const idStr = (adm.headId || adm.username || '').trim();
      if (!idStr || idStr.toLowerCase() === 'admin') continue;
      const idLower = idStr.toLowerCase();
      if (!existingLogins.has(idLower)) {
        const assignedRole = adm.role === 'department_head' ? 'department_head' : 'admin';
        const created = await User.create({
          loginIdentifier: idStr,
          loginIdentifierLower: idLower,
          passwordHash: adm.password,
          role: assignedRole,
          status: adm.status === 'active' ? 'ACTIVE' : 'INACTIVE',
          name: adm.name,
          email: adm.email || '',
          phone: adm.contactNo || '',
          department: adm.departmentCode || '',
          departmentRef: adm.department || null,
          profileRef: adm._id,
          profileModel: 'Admin',
        });
        existingLogins.add(idLower);
        await Admin.updateOne({ _id: adm._id }, { $set: { user: created._id } });
      }
    }

    // 3. Synchronize Teachers in bulk
    const teachers = await Teacher.find({}).lean();
    for (const t of teachers) {
      const idStr = (t.teacherId || '').trim();
      if (!idStr) continue;
      const idLower = idStr.toLowerCase();
      if (!existingLogins.has(idLower)) {
        const created = await User.create({
          loginIdentifier: idStr.toUpperCase(),
          loginIdentifierLower: idLower,
          passwordHash: t.password,
          role: 'teacher',
          status: t.status === 'active' ? 'ACTIVE' : 'INACTIVE',
          name: t.name,
          email: t.email || '',
          phone: t.contactNo || '',
          department: t.department || '',
          departmentRef: t.departmentRef || null,
          profileRef: t._id,
          profileModel: 'Teacher',
        });
        existingLogins.add(idLower);
        await Teacher.updateOne({ _id: t._id }, { $set: { user: created._id } });
      }
    }

    // 4. Synchronize Students in bulk
    const students = await Student.find({}).lean();
    for (const s of students) {
      const idStr = (s.rollNumber || '').trim();
      if (!idStr) continue;
      const idLower = idStr.toLowerCase();
      if (!existingLogins.has(idLower)) {
        const pwdHash = (s.password && s.password.startsWith('$2'))
          ? s.password
          : await User.hashPassword(s.password || 'password123');
        const created = await User.create({
          loginIdentifier: idStr,
          loginIdentifierLower: idLower,
          passwordHash: pwdHash,
          role: 'student',
          status: s.status === 'active' ? 'ACTIVE' : (s.status === 'suspended' ? 'SUSPENDED' : 'INACTIVE'),
          name: s.name,
          email: s.email || '',
          phone: s.contactNo || '',
          department: s.department || '',
          departmentRef: s.departmentRef || null,
          profileRef: s._id,
          profileModel: 'Student',
        });
        existingLogins.add(idLower);
        await Student.updateOne({ _id: s._id }, { $set: { user: created._id } });
      }
    }

    console.log('  [UserSync] Initial synchronization complete.');
  } catch (err) {
    console.error('  [UserSync] Error in syncUsers:', err.message);
  }
}

module.exports = { syncUsers };
