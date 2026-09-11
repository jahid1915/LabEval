const LeaveRequest = require('../models/LeaveRequest');
const Teacher = require('../models/Teacher');
const TeacherAssignment = require('../models/TeacherAssignment');

const syncTeacherDutyStatuses = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Find all active/approved leave requests that cover today
    const activeLeaves = await LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: new Date() },
      endDate: { $gte: today }
    });

    const onLeaveTeacherIds = activeLeaves.map(l => l.teacher.toString());

    // Update teachers who should be ON_LEAVE
    if (onLeaveTeacherIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: onLeaveTeacherIds }, dutyStatus: { $ne: 'ON_LEAVE' } },
        { dutyStatus: 'ON_LEAVE' }
      );
    }

    // 2. Only reset teachers whose approved leave request in system has ended
    const expiredLeaves = await LeaveRequest.find({
      status: 'approved',
      endDate: { $lt: today }
    });
    const expiredTeacherIds = expiredLeaves.map(l => l.teacher?.toString()).filter(Boolean);
    for (const tId of expiredTeacherIds) {
      if (!onLeaveTeacherIds.includes(tId)) {
        await Teacher.updateOne({ _id: tId, dutyStatus: 'ON_LEAVE' }, { dutyStatus: 'ON_DUTY' });
      }
    }

    // 3. Check temporary teacher assignments that have expired
    const expiredAssignments = await TeacherAssignment.find({
      isTemporary: true,
      status: 'active',
      endDate: { $lt: today }
    });

    for (const assign of expiredAssignments) {
      assign.status = 'expired';
      await assign.save();
    }
  } catch (err) {
    console.error('Duty status sync error:', err.message);
  }
};

module.exports = { syncTeacherDutyStatuses };
