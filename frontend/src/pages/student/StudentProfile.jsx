import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  User, Mail, Phone, Building2, GraduationCap, Hash,
  Calendar, RefreshCw, AlertCircle, Shield, BookOpen,
  BadgeCheck, MapPin, Droplets
} from 'lucide-react';
import RuetLogo from '../../components/RuetLogo';

function InfoRow({ icon: Icon, label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
        <p className={`text-[13px] font-semibold text-slate-800 dark:text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    active: { color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Active' },
    graduated: { color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', label: 'Graduated' },
    inactive: { color: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', label: 'Inactive' },
    suspended: { color: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', label: 'Suspended' },
  };
  const cfg = config[status] || config.active;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.color}`}>
      <BadgeCheck size={10} />
      {cfg.label}
    </span>
  );
}

export default function StudentProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/student/profile');
      setProfile(data);
    } catch (err) {
      // Fall back to auth context user info if API fails
      if (user) {
        setProfile({
          name: user.name,
          rollNumber: user.rollNumber,
          registrationNumber: user.registrationNumber || '',
          email: user.email || '',
          contactNo: user.contactNo || '',
          series: user.series,
          department: user.department,
          departmentName: user.departmentName || user.department,
          facultyName: user.facultyName || '',
          semester: user.semester || '',
          session: user.session || '',
          regularStatus: 'Regular',
          status: 'active'
        });
      } else {
        setError(err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="w-48 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-32 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
        <button onClick={fetchProfile} className="mt-3 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-sm font-medium">
          Try Again
        </button>
      </div>
    );
  }

  const p = profile;

  return (
    <div className="space-y-5 pb-16 max-w-3xl">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600" />
        
        <div className="px-6 pb-5">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {p?.avatarUrl
                ? <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-full" />
                : getInitials(p?.name)
              }
            </div>
            <div className="flex items-center gap-2 mb-0">
              {p?.status && <StatusBadge status={p.status} />}
              <button
                onClick={fetchProfile}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          <h1 className="text-[18px] font-bold text-slate-900 dark:text-white mb-0.5">{p?.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold">Roll: {p?.rollNumber}</span>
            {p?.regularStatus && (
              <>
                <span>·</span>
                <span>{p.regularStatus}</span>
              </>
            )}
            {p?.series && (
              <>
                <span>·</span>
                <span>Series {p.series}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Academic Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">Academic Info</h2>
          </div>
          <div className="space-y-0">
            <InfoRow icon={Hash} label="Roll / Student ID" value={p?.rollNumber} mono />
            <InfoRow icon={Hash} label="Registration No." value={p?.registrationNumber} mono />
            <InfoRow icon={Building2} label="Department" value={p?.departmentName || p?.department} />
            <InfoRow icon={BookOpen} label="Faculty" value={p?.facultyName} />
            <InfoRow icon={GraduationCap} label="Series / Batch" value={p?.series ? `Series ${p.series}` : null} />
            <InfoRow icon={Calendar} label="Current Semester" value={p?.semester} />
            <InfoRow icon={Calendar} label="Academic Session" value={p?.session} />
            {p?.section && <InfoRow icon={Hash} label="Section" value={p.section} />}
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">Personal Info</h2>
          </div>
          <div className="space-y-0">
            <InfoRow icon={Mail} label="Email" value={p?.email} />
            <InfoRow icon={Phone} label="Contact" value={p?.contactNo} />
            {p?.gender && <InfoRow icon={User} label="Gender" value={p.gender} />}
            {p?.bloodGroup && <InfoRow icon={Droplets} label="Blood Group" value={p.bloodGroup} />}
            {p?.address && <InfoRow icon={MapPin} label="Address" value={p.address} />}
          </div>
        </div>
      </div>

      {/* Account Security Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={15} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">Account Info</h2>
        </div>
        <div className="flex flex-wrap gap-4 text-[12px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Role:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold">Student</span>
          </div>
          {p?.createdAt && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">Member since:</span>
              <span>{new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-600">
          To change your password, use the <strong>"Change Password"</strong> option in the sidebar. Your initial password is your registration number.
        </p>
      </div>
    </div>
  );
}
