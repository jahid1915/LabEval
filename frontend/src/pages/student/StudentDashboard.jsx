import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Send, Activity, Lock, Target } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [detailedMarks, setDetailedMarks] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  
  const courseId = 'CSE-2200'; // Hardcoded for prototype demo

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get(`/student/dashboard/${courseId}`);
        setSummary(res.data);
      } catch (err) {
        toast.error('Failed to fetch summary');
      }
    };
    fetchSummary();
  }, [courseId]);

  const handleRequestMarks = async () => {
    try {
      const res = await api.post('/student/request', { courseId, teacherId: 'T-101' });
      setRequestStatus(res.data.status);
      toast.success(`Request ${res.data.status}`);
    } catch (error) {
      toast.error('Failed to request marks');
    }
  };

  const fetchDetailedMarks = async () => {
    try {
      const res = await api.get(`/student/detailed-marks/${courseId}`);
      setDetailedMarks(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch detailed marks');
    }
  };

  const MetricCard = ({ title, value, subtitle, icon, delay, isHidden }) => (
    <motion.div 
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }}
      className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="font-heading font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</h3>
        <div className="flex items-end gap-3">
          <span className={`text-4xl md:text-5xl font-heading font-extrabold ${isHidden ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-white'}`}>
            {value}
          </span>
          {isHidden && <Lock className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />}
        </div>
        <p className="text-sm font-medium mt-3 text-slate-400">{subtitle}</p>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-800 dark:text-white mb-3">Student Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Performance overview for {courseId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <MetricCard 
          title="Attendance" 
          value={summary ? `${summary.attendancePercentage.toFixed(1)}%` : '---'}
          subtitle={summary?.attendancePercentage < 60 ? <span className="flex items-center text-rose-500"><AlertTriangle className="w-4 h-4 mr-1"/> Warning: Below 60%</span> : 'On track'}
          icon={<Activity size={80} />}
          delay={0.1}
        />
        <MetricCard 
          title="Total Marks" 
          value="Hidden"
          subtitle="Request detailed marks to view"
          icon={<Target size={80} />}
          isHidden={true}
          delay={0.2}
        />
        <MetricCard 
          title="Current Grade" 
          value="N/A"
          subtitle="Pending final evaluation"
          icon={<CheckCircle size={80} />}
          isHidden={true}
          delay={0.3}
        />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
      >
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-heading font-bold text-slate-800 dark:text-white mb-3">Detailed Marks Request</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-2xl leading-relaxed">
            Curious about your performance breakdown? You can send a request directly to your course instructor to reveal your detailed scores across Viva, Quizzes, Tests, and other metrics.
          </p>
          
          <div className="flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
            <button 
              className="btn btn-primary px-8 rounded-xl font-semibold shadow-lg shadow-primary/30" 
              onClick={handleRequestMarks}
              disabled={requestStatus === 'Pending' || requestStatus === 'Accepted'}
            >
              <Send className="w-4 h-4 mr-2" />
              Request Breakdown
            </button>
            
            {requestStatus === 'Pending' && <span className="px-6 py-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold rounded-xl flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> Request Pending</span>}
            {requestStatus === 'Rejected' && <span className="px-6 py-3 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-semibold rounded-xl">Request Rejected</span>}
            {requestStatus === 'Accepted' && (
              <button className="btn btn-success text-white px-8 rounded-xl font-semibold shadow-lg shadow-emerald-500/30" onClick={fetchDetailedMarks}>
                <CheckCircle className="w-4 h-4 mr-2"/>
                Reveal Marks
              </button>
            )}
          </div>

          <AnimatePresence>
            {detailedMarks && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-10 overflow-hidden"
              >
                <h3 className="text-xl font-heading font-bold text-slate-800 dark:text-white mb-6">Your Performance Breakdown</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-4 px-6 font-semibold text-slate-600 dark:text-slate-300">Evaluation Metric</th>
                        <th className="py-4 px-6 font-semibold text-slate-600 dark:text-slate-300 text-right">Achieved Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium">Viva Voce</td>
                        <td className="py-4 px-6 text-right font-bold text-lg">{detailedMarks.vivas.reduce((acc, curr) => acc + curr.marks, 0)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium">Quizzes</td>
                        <td className="py-4 px-6 text-right font-bold text-lg">{detailedMarks.quizzes.reduce((acc, curr) => acc + curr.marks, 0)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium">Lab Tests</td>
                        <td className="py-4 px-6 text-right font-bold text-lg">{detailedMarks.tests.reduce((acc, curr) => acc + curr.marks, 0)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium">Projects & Others</td>
                        <td className="py-4 px-6 text-right font-bold text-lg text-primary">{detailedMarks.others.reduce((acc, curr) => acc + curr.marks, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentDashboard;
