import React from 'react';
import { X } from 'lucide-react';

const labelClass = "block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5";
const inputClass = "w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function TeacherProfileModal({
  teacherProfileModal,
  setTeacherProfileModal,
  deptCode,
  teacherAssignmentsList,
}) {
  if (!teacherProfileModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm">
              {teacherProfileModal.name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                {teacherProfileModal.name}
              </h3>
              <span className="font-mono text-xs text-purple-600 font-bold">
                {teacherProfileModal.teacherId} &bull; {teacherProfileModal.designation || 'Faculty'}
              </span>
            </div>
          </div>
          <button onClick={() => setTeacherProfileModal(null)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <p><strong>Department:</strong> {teacherProfileModal.department || deptCode}</p>
            <p><strong>Contact No:</strong> {teacherProfileModal.contactNo || 'N/A'}</p>
            <p><strong>Email:</strong> {teacherProfileModal.email || `${teacherProfileModal.teacherId.toLowerCase()}@ruet.ac.bd`}</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-xs uppercase tracking-wider">
              Assigned Courses ({teacherAssignmentsList.length}):
            </h4>
            {teacherAssignmentsList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teacherAssignmentsList.map((a) => (
                  <div key={a._id} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {a.courseCode}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {a.courseName} &bull; Sem: {a.semester} &bull; Session: {a.academicSession}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No courses currently assigned to this faculty member.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setTeacherProfileModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddTeacherModal({
  showAddTeacherModal,
  setShowAddTeacherModal,
  deptCode,
  teacherForm,
  setTeacherForm,
  handleCreateTeacher,
}) {
  if (!showAddTeacherModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Add Department Faculty</h3>
          <button onClick={() => setShowAddTeacherModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleCreateTeacher} className="space-y-3.5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input required type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className={inputClass} placeholder="e.g. Dr. John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Teacher ID</label>
              <input required type="text" value={teacherForm.teacherId} onChange={e => setTeacherForm({...teacherForm, teacherId: e.target.value.toUpperCase()})} className={inputClass} placeholder="e.g. ETE-295" />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <input disabled value={deptCode} className={`${inputClass} opacity-70 cursor-not-allowed`} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Contact Number</label>
            <input required type="text" value={teacherForm.contactNo} onChange={e => setTeacherForm({...teacherForm, contactNo: e.target.value})} className={inputClass} placeholder="e.g. 017xxxxxxxx" />
          </div>
          <div>
            <label className={labelClass}>Initial Password</label>
            <input required type="password" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className={inputClass} placeholder="Min 6 chars" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddTeacherModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/30">Save Faculty</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditTeacherModal({
  editTeacher,
  setEditTeacher,
  deptCode,
  handleUpdateTeacher,
}) {
  if (!editTeacher) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Edit Faculty: {editTeacher.teacherId}</h3>
          <button onClick={() => setEditTeacher(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleUpdateTeacher} className="space-y-3.5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input required type="text" value={editTeacher.name} onChange={e => setEditTeacher({...editTeacher, name: e.target.value})} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <input disabled value={editTeacher.department || deptCode} className={`${inputClass} opacity-70`} />
            </div>
            <div>
              <label className={labelClass}>Contact No</label>
              <input required type="text" value={editTeacher.contactNo} onChange={e => setEditTeacher({...editTeacher, contactNo: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Reset Password (leave blank to keep)</label>
            <input type="password" onChange={e => setEditTeacher({...editTeacher, password: e.target.value})} className={inputClass} placeholder="New password" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditTeacher(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/30">Update Faculty</button>
          </div>
        </form>
      </div>
    </div>
  );
}
