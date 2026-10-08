import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { ArrowLeft, User, Mail, Phone, Calendar, CheckCircle2, Shield } from 'lucide-react';

export default function HeadStudentDetailPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);

  const fetchStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/head/students/${id}`);
      if (res.data?.success) {
        setStudent(res.data.student);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading student details...</div>;
  }

  if (!student) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-slate-500">Student not found or access restricted.</p>
        <Link to="/head/students" className="text-xs font-bold text-indigo-600 hover:underline">
          ← Return to Student Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link
        to="/head/students"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Student Roster</span>
      </Link>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
            {student.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {student.name}
            </h1>
            <p className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              Student ID: {student.rollNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.department}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Series</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Series {student.series}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Academic Session</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.session || 'N/A'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Registration Number</span>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{student.registrationNumber || 'N/A'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Semester</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.semester || '1st Semester'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
            <p className="font-bold text-emerald-600 text-sm uppercase">{student.status || 'ACTIVE'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
