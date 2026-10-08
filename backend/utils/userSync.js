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
    // 1. Ensure Default System Admin exists (ADMIN / admin123)
    let adminUser = await User.findOne({ loginIdentifierLower: 'admin' });
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
        password: 'admin123', // Will be hashed by pre('save')
        role: 'super_admin',
        designation: 'System Administrator',
        user: adminUser._id,
        status: 'active'
      });
      adminUser.profileRef = adminDoc._id;
      adminUser.profileModel = 'Admin';
      await adminUser.save();
      console.log('  [UserSync] Default Admin document created and linked.');
    } else if (!adminDoc.user) {
      adminDoc.user = adminUser._id;
      await adminDoc.save();
    }

    // 2. Synchronize all Department Heads & Other Admins
    const admins = await Admin.find({});
    for (const adm of admins) {
      const identifier = (adm.headId || adm.username || '').trim();
      if (!identifier || identifier.toLowerCase() === 'admin') continue;

      const identifierLower = identifier.toLowerCase();
      let u = await User.findOne({ loginIdentifierLower: identifierLower });
      const assignedRole = adm.role === 'department_head' ? 'department_head' : (adm.role === 'super_admin' ? 'admin' : 'admin');

      if (!u) {
        u = await User.create({
          loginIdentifier: identifier,
          loginIdentifierLower: identifierLower,
          passwordHash: adm.password,
          role: assignedRole,
          status: adm.status === 'active' ? 'ACTIVE' : 'INACTIVE',
          name: adm.name,
          email: adm.email || '',
          phone: adm.contactNo || '',
          department: adm.departmentCode || '',
          departmentRef: adm.department || null,
          faculty: adm.facultyName || '',
          facultyRef: adm.faculty || null,
          profileRef: adm._id,
          profileModel: 'Admin',
        });
      } else {
        // Keep updated
        u.profileRef = adm._id;
        u.profileModel = 'Admin';
        u.role = assignedRole;
        if (adm.departmentCode) u.department = adm.departmentCode;
        await u.save();
      }

      if (!adm.user || !adm.user.equals(u._id)) {
        adm.user = u._id;
        await adm.save();
      }
    }

    // 3. Synchronize Teachers
    const teachers = await Teacher.find({});
    for (const teacher of teachers) {
      const identifier = (teacher.teacherId || '').trim();
      if (!identifier) continue;
      const identifierLower = identifier.toLowerCase();

      let u = await User.findOne({ loginIdentifierLower: identifierLower });
      const status = teacher.status === 'active' ? 'ACTIVE' : 'INACTIVE';

      if (!u) {
        u = await User.create({
          loginIdentifier: identifier.toUpperCase(),
          loginIdentifierLower: identifierLower,
          passwordHash: teacher.password,
          role: 'teacher',
          status,
          name: teacher.name,
          email: teacher.email || '',
          phone: teacher.contactNo || '',
          department: teacher.department || '',
          departmentRef: teacher.departmentRef || null,
          facultyRef: teacher.facultyRef || null,
          profileRef: teacher._id,
          profileModel: 'Teacher',
        });
      } else {
        u.profileRef = teacher._id;
        u.profileModel = 'Teacher';
        if (teacher.department) u.department = teacher.department;
        await u.save();
      }

      if (!teacher.user || !teacher.user.equals(u._id)) {
        teacher.user = u._id;
        await teacher.save();
      }
    }

    // 4. Synchronize Students
    const students = await Student.find({});
    for (const student of students) {
      const identifier = (student.rollNumber || '').trim();
      if (!identifier) continue;
      const identifierLower = identifier.toLowerCase();

      let u = await User.findOne({ loginIdentifierLower: identifierLower });
      let status = 'ACTIVE';
      if (student.status === 'suspended') status = 'SUSPENDED';
      else if (student.status !== 'active') status = 'INACTIVE';

      if (!u) {
        u = await User.create({
          loginIdentifier: identifier,
          loginIdentifierLower: identifierLower,
          passwordHash: student.password,
          role: 'student',
          status,
          name: student.name,
          email: student.email || '',
          phone: student.contactNo || '',
          department: student.department || '',
          departmentRef: student.departmentRef || null,
          facultyRef: student.facultyRef || null,
          profileRef: student._id,
          profileModel: 'Student',
        });
      } else {
        u.profileRef = student._id;
        u.profileModel = 'Student';
        if (student.department) u.department = student.department;
        await u.save();
      }

      if (!student.user || !student.user.equals(u._id)) {
        student.user = u._id;
        await student.save();
      }
    }

    console.log('  [UserSync] Authentication synchronization complete.');
  } catch (err) {
    console.error('  [UserSync] Error synchronizing users:', err);
  }
}

module.exports = { syncUsers };
