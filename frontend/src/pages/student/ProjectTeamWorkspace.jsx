import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import {
  FolderGit2, Users, CheckCircle2, Circle, Clock, Send,
  TrendingUp, Award, MessageSquare, Activity, Plus, RefreshCw,
  ExternalLink, ChevronLeft, ShieldCheck, UserCheck, Flame
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export default function ProjectTeamWorkspace() {
  const { projectId } = useParams();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'milestones' | 'activity' | 'chat'

  // Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef(null);

  // Activities & Milestones
  const [activities, setActivities] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [progress, setProgress] = useState(0);

  // New Milestone Modal
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' });
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  // New Activity Log Modal
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activityType: 'GENERAL_UPDATE',
    description: ''
  });
  const [submittingActivity, setSubmittingActivity] = useState(false);

  const socketRef = useRef(null);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/workspace`);
      if (res.data?.success) {
        setWorkspace(res.data);
        setMilestones(res.data.project?.milestones || []);
        setProgress(res.data.stats?.progressPercent || 0);
        setActivities(res.data.activities || []);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load project workspace');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Socket.IO Real-Time Integration (Sections 35, 40, 41, 42)
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const socketUrl = apiUrl
      ? apiUrl.replace(/\/api\/?$/, '')
      : window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join project room with auth info
      socket.emit('join:project', {
        projectId,
        token,
        userInfo: {
          userId: user?._id || user?.userId,
          name: user?.name,
          role: user?.role,
          rollNumber: user?.rollNumber || user?.loginIdentifier
        }
      });
    });

    // Real-Time Online Presence updates
    socket.on('project:presenceUpdated', (data) => {
      if (data.projectId === projectId) {
        setOnlineMembers(data.members || []);
      }
    });

    // Real-Time Milestone & Progress updates
    socket.on('project:milestoneUpdated', (data) => {
      if (data.projectId === projectId) {
        setProgress(data.progress);
        setMilestones((prev) =>
          prev.map((m) => (m._id === data.milestone._id ? data.milestone : m))
        );
        if (data.activity) {
          setActivities((prev) => [data.activity, ...prev]);
        }
        toast.info(`Milestone update: ${data.milestone.title} (${data.progress}% complete)`);
      }
    });

    socket.on('project:milestoneCreated', (data) => {
      if (data.projectId === projectId) {
        setProgress(data.progress);
        setMilestones((prev) => [...prev, data.milestone]);
        if (data.activity) {
          setActivities((prev) => [data.activity, ...prev]);
        }
      }
    });

    // Real-Time Activity updates
    socket.on('project:activityCreated', (data) => {
      if (data.projectId === projectId) {
        setActivities((prev) => [data.activity, ...prev]);
      }
    });

    // Real-Time Messages
    socket.on('project:messageReceived', (data) => {
      if (data.projectId === projectId) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    return () => {
      socket.emit('leave:project', { projectId });
      socket.disconnect();
    };
  }, [projectId, user]);

  const handleToggleMilestone = async (milestoneId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/projects/${projectId}/milestones/${milestoneId}`, {
        status: nextStatus
      });
      if (res.data?.success) {
        setProgress(res.data.progress);
        setMilestones((prev) =>
          prev.map((m) => (m._id === milestoneId ? res.data.milestone : m))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update milestone');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;

    setSubmittingMilestone(true);
    try {
      const res = await api.post(`/projects/${projectId}/milestones`, milestoneForm);
      if (res.data?.success) {
        toast.success('Milestone added!');
        setShowAddMilestone(false);
        setMilestoneForm({ title: '', description: '', dueDate: '' });
        fetchWorkspace();
      }
    } catch (err) {
      toast.error('Failed to add milestone');
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.description.trim()) return;

    setSubmittingActivity(true);
    try {
      const res = await api.post(`/projects/${projectId}/activities`, activityForm);
      if (res.data?.success) {
        toast.success('Activity logged to team timeline!');
        setShowLogActivity(false);
        setActivityForm({ activityType: 'GENERAL_UPDATE', description: '' });
      }
    } catch (err) {
      toast.error('Failed to log activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      await api.post(`/projects/${projectId}/messages`, { message: newMessage.trim() });
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm">Connecting to real-time project workspace...</p>
      </div>
    );
  }

  const proj = workspace?.project || {};
  const stats = workspace?.stats || {};
  const chartData = workspace?.chartData || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Header Banner ─────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                {proj.activityType}
              </span>
              <span className="px-3 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full">
                Session {proj.academicSession} • Series {proj.series}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Collaboration
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {proj.title}
            </h1>
            {proj.description && (
              <p className="text-sm text-slate-300 max-w-3xl">{proj.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Supervisor: <strong className="text-white">{proj.primarySupervisorName}</strong></span>
              <span>Department: <strong className="text-white">{proj.departmentCode}</strong></span>
              <span>Team Size: <strong className="text-emerald-400">{proj.students?.length || 0} Members</strong></span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center min-w-[160px] p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Progress</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-emerald-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Real-time Chart & Milestones & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real-Time Project Activity Chart (Section 36) */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Real-Time Project Progress & Velocity
                </h3>
                <p className="text-xs text-slate-400">Progression curve based on verified database milestones</p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {milestones.filter(m => m.status === 'completed').length} of {milestones.length} Milestones Done
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="stage" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#34d399' }}
                  />
                  <Area type="monotone" dataKey="progress" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#progressGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workspace Tabs: Milestones vs Timeline Activity */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`text-sm font-bold pb-2 transition border-b-2 ${
                    activeTab === 'overview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Milestones ({milestones.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`text-sm font-bold pb-2 transition border-b-2 ${
                    activeTab === 'activity' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Recent Activity Stream ({activities.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddMilestone(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Milestone
                </button>
                <button
                  onClick={() => setShowLogActivity(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Log Activity
                </button>
              </div>
            </div>

            {/* TAB: Milestones Checklist */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No milestones registered.</p>
                ) : (
                  milestones.map((m) => {
                    const isCompleted = m.status === 'completed';
                    return (
                      <div
                        key={m._id}
                        onClick={() => handleToggleMilestone(m._id, m.status)}
                        className={`flex items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                          <div>
                            <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                              {m.title}
                            </h4>
                            {m.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                            )}
                            {m.completedBy && isCompleted && (
                              <p className="text-[11px] text-emerald-400/80 mt-1">
                                Completed by {m.completedBy} • {new Date(m.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB: Activity Stream (Section 37) */}
            {activeTab === 'activity' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No activity logged yet.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act._id} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-200 font-medium">{act.description}</p>
                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                          <span>{act.studentName}</span>
                          {act.studentRoll && <span>• {act.studentRoll}</span>}
                          <span>• {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Team Presence & Live Chat (Sections 35, 43) */}
        <div className="space-y-6">
          {/* Team Members List with Real-Time Online Badges (Section 35) */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Project Team Members
            </h3>

            <div className="space-y-2.5">
              {proj.students?.map((s) => {
                const isOnline = onlineMembers.some(u => 
                  u.rollNumber?.toUpperCase() === s.rollNumber?.toUpperCase() ||
                  String(u.userId) === String(s.student?._id || s.student)
                );

                return (
                  <div key={s.rollNumber} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-slate-600'}`} />
                      <div>
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{s.rollNumber}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'
                    }`}>
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Supervisor Badge */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">SUPERVISOR</p>
                <p className="font-semibold text-slate-200">{proj.primarySupervisorName}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-semibold">
                FACULTY
              </span>
            </div>
          </div>

          {/* Persisted Real-Time Team Chat (Section 43) */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-lg space-y-4 flex flex-col h-96">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Team Discussion & Notes
            </h3>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {messages.length === 0 ? (
                <p className="text-slate-500 text-center py-10">No messages yet. Say hello to your team!</p>
              ) : (
                messages.map((m) => {
                  const isMe = String(m.sender) === String(user?._id || user?.userId) || m.senderName === user?.name;
                  return (
                    <div key={m._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">{m.senderName}</span>
                        {m.senderRoll && <span className="font-mono">({m.senderRoll})</span>}
                      </div>
                      <div className={`p-2.5 rounded-2xl max-w-[85%] break-words ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Type a team message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMessage.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Add New Milestone
            </h3>
            <form onSubmit={handleAddMilestone} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Milestone Title</label>
                <input
                  type="text"
                  placeholder="e.g. Prototype Hardware Assembly"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMilestone}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showLogActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Log Team Activity
            </h3>
            <form onSubmit={handleLogActivity} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Activity Type</label>
                <select
                  value={activityForm.activityType}
                  onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="PROPOSAL_SUBMITTED">Proposal Submitted</option>
                  <option value="LITERATURE_REVIEW">Literature Review Completed</option>
                  <option value="METHODOLOGY_UPDATE">Methodology Updated</option>
                  <option value="CODE_COMMIT">Source Code / Simulation Updated</option>
                  <option value="DATASET_UPLOAD">Dataset Uploaded</option>
                  <option value="REPORT_SUBMITTED">Draft Report Submitted</option>
                  <option value="GENERAL_UPDATE">General Update</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Uploaded revised literature review section..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogActivity(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingActivity}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                >
                  Post Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
