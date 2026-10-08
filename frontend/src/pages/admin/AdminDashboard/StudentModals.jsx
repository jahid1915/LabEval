import React from 'react';
import { X } from 'lucide-react';

const labelClass = "block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5";
const inputClass = "w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function AddStudentModal({
  showAddStudentModal,
  setShowAddStudentModal,
  deptCode,
  studentForm,
  setStudentForm,
  handleCreateStudent,
}) {
  if (!showAddStudentModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Enroll New Student</h3>
          <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleCreateStudent} className="space-y-3.5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input required type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className={inputClass} placeholder="e.g. Alex Johnson" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Roll Number</label>
              <input required type="text" value={studentForm.rollNumber} onChange={e => setStudentForm({...studentForm, rollNumber: e.target.value})} className={inputClass} placeholder="e.g. 2204060" />
            </div>
            <div>
              <label className={labelClass}>Series Batch</label>
              <input required type="text" value={studentForm.series} onChange={e => setStudentForm({...studentForm, series: e.target.value})} className={inputClass} placeholder="e.g. 22" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <input disabled value={deptCode} className={`${inputClass} opacity-70`} />
            </div>
            <div>
              <label className={labelClass}>Contact No</label>
              <input required type="text" value={studentForm.contactNo} onChange={e => setStudentForm({...studentForm, contactNo: e.target.value})} className={inputClass} placeholder="017xxxxxxxx" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input required type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className={inputClass} placeholder="Min 6 chars" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddStudentModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/30">Save Student</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditStudentModal({
  editStudent,
  setEditStudent,
  handleUpdateStudent,
}) {
  if (!editStudent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Edit Student: {editStudent.rollNumber}</h3>
          <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleUpdateStudent} className="space-y-3.5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input required type="text" value={editStudent.name} onChange={e => setEditStudent({...editStudent, name: e.target.value})} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Roll Number</label>
              <input required type="text" value={editStudent.rollNumber} onChange={e => setEditStudent({...editStudent, rollNumber: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Series Batch</label>
              <input required type="text" value={editStudent.series} onChange={e => setEditStudent({...editStudent, series: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Contact No</label>
            <input required type="text" value={editStudent.contactNo} onChange={e => setEditStudent({...editStudent, contactNo: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reset Password (leave blank to keep)</label>
            <input type="password" onChange={e => setEditStudent({...editStudent, password: e.target.value})} className={inputClass} placeholder="New password" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditStudent(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/30">Update Student</button>
          </div>
        </form>
      </div>
    </div>
  );
}
