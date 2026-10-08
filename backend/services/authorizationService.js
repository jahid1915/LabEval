const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const Admin = require('../models/Admin');

/**
 * Resolves unified user capability and role profiles.
 * Central single source of truth for authorization across Admin, Head, Teacher, Student.
 */
const resolveUserContext = async (userOrId) => {
  if (!userOrId) return null;

  let authUser = null;
  if (typeof userOrId === 'string' || (userOrId instanceof mongoose.Types.ObjectId) || (userOrId._id && !userOrId.loginIdentifier)) {
    authUser = await User.findById(userOrId._id || userOrId).select('-passwordHash').lean();
  } else {
    authUser = userOrId;
  }

  if (!authUser) return null;

  const role = authUser.role;
  let teacherProfile = null;
  let departmentHeadProfile = null;

  if (role === 'teacher') {
    teacherProfile = await Teacher.findOne({
      $or: [
        { _id: authUser.profileRef },
        { user: authUser._id },
        { teacherId: authUser.loginIdentifier?.toUpperCase() },
        { email: authUser.email }
      ]
    }).lean();
  } else if (role === 'department_head') {
    // 1. Department Head profile
    const dept = await Department.findOne({
      $or: [
        { code: authUser.department },
        { _id: authUser.departmentRef }
      ]
    }).populate('headTeacher').lean();

    departmentHeadProfile = {
      departmentId: dept?._id || authUser.departmentRef,
      departmentCode: dept?.code || authUser.department,
      facultyId: dept?.faculty || authUser.facultyRef,
      headTeacherId: dept?.headTeacher?._id,
      active: true
    };

    // 2. Head ALSO has a Teacher Profile (Dual-mode capability)
    if (dept?.headTeacher) {
      teacherProfile = dept.headTeacher;
    } else {
      teacherProfile = await Teacher.findOne({
        $or: [
          { _id: authUser.profileRef },
          { user: authUser._id },
          { teacherId: authUser.loginIdentifier?.toUpperCase() },
          { email: authUser.email },
          { department: authUser.department }
        ]
      }).lean();
    }
  }

  const capabilities = {
    canTeach: role === 'teacher' || (role === 'department_head' && !!teacherProfile),
    canManageDepartmentAcademics: role === 'department_head',
    canManageMasterData: role === 'admin' || role === 'super_admin',
    canImportData: role === 'admin' || role === 'super_admin',
    canManageUsers: role === 'admin' || role === 'super_admin',
    canManageSystemConfig: role === 'admin' || role === 'super_admin'
  };

  return {
    userId: authUser._id,
    accountRole: role,
    user: authUser,
    teacherProfile,
    departmentHeadProfile,
    capabilities
  };
};

module.exports = {
  resolveUserContext
};
