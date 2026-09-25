import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, GraduationCap, Award, FileText, CheckCircle,
  ShieldCheck, ArrowRight, ChevronRight, Layers, BarChart3,
  Sliders, Send, Download, Sparkles, Building2, Eye, Compass,
  CheckCircle2, Clock, Check
} from 'lucide-react';
import AcademicIntelligenceNetwork from '../../components/landing/AcademicIntelligenceNetwork';

export default function Home() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  // Auto rotate workflow step gently
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWorkflowStep((prev) => (prev + 1) % 7);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const workflowSteps = [
    { id: 'course', title: 'Course Creation', desc: 'Department Head establishes sessional and theory courses from approved curriculum.', icon: BookOpen, role: 'Department Head', color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
    { id: 'teacher', title: 'Teacher Assignment', desc: 'Department Head assigns authorized faculty teachers exclusively. Self-selection is restricted.', icon: Users, role: 'Department Head', color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' },
    { id: 'student', title: 'Student Enrollment', desc: 'Students across series (21, 22, 23, 24) access active semester course schedules.', icon: GraduationCap, role: 'Student', color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400' },
    { id: 'result', title: 'Result Evaluation', desc: 'Teachers enter attendance, quizzes, assignments and laboratory performance in real time.', icon: BarChart3, role: 'Teacher', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' },
    { id: 'request', title: 'Mark Request', desc: 'Students can request full detailed marks from the specific course teacher.', icon: Send, role: 'Student', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' },
    { id: 'detailed', title: 'Detailed Marks', desc: 'Teachers review and approve mark breakdowns with individual rubrics.', icon: Eye, role: 'Teacher', color: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' },
    { id: 'report', title: 'Official Reports', desc: 'Download official Dean-signed RUET format PDF transcripts and Excel tabulation sheets.', icon: FileText, role: 'All Roles', color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' }
  ];

  const features = [
    {
      title: 'Course Management',
      desc: 'Centralized catalog of department sessional and theory courses with semester-wise credits.',
      icon: BookOpen,
      badge: 'Curriculum',
      color: 'border-blue-500/20 hover:border-blue-500/50',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    },
    {
      title: 'Teacher Assignment',
      desc: 'Department Head controls course allocation. Courses instantly populate on assigned faculty portals.',
      icon: Users,
      badge: 'Governance',
      color: 'border-indigo-500/20 hover:border-indigo-500/50',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
    },
    {
      title: 'Student Academic Records',
      desc: 'Series and semester-wise performance history from 1-1, 1-2 through 4-1, 4-2 with SGPA tracking.',
      icon: GraduationCap,
      badge: 'Records',
      color: 'border-cyan-500/20 hover:border-cyan-500/50',
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
    },
    {
      title: 'Mark Requests',
      desc: 'Transparent verification workflow allowing students to request detailed mark breakdowns directly.',
      icon: Send,
      badge: 'Evaluation',
      color: 'border-amber-500/20 hover:border-amber-500/50',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    },
    {
      title: 'Academic Reports',
      desc: 'Generate institutional PDF grade transcripts and XLSX tabulation sheets conforming to RUET standards.',
      icon: Download,
      badge: 'Export',
      color: 'border-emerald-500/20 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    },
    {
      title: 'Department Administration',
      desc: 'Hierarchical scope for Faculty and Department Heads with strict role-governed data isolation.',
      icon: Building2,
      badge: 'Security',
      color: 'border-violet-500/20 hover:border-violet-500/50',
      iconBg: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400',
      badgeBg: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
    }
  ];

  const roles = [
    {
      role: 'Department Head',
      subtitle: 'Department-Level Academic Authority',
      desc: 'Governs departmental curriculum, course teacher allocation, mark requests, and generates comprehensive departmental reports.',
      responsibilities: [
        'Manage departmental courses',
        'Assign teachers to courses',
        'Monitor department activity',
        'Generate official reports'
      ],
      color: 'border-indigo-500/30 hover:border-indigo-500/60',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      btnBg: 'hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
    },
    {
      role: 'Teacher',
      subtitle: 'Course Evaluator & Mentor',
      desc: 'Accesses assigned courses, configures laboratory performance criteria, inputs marks, and verifies student mark breakdown requests.',
      responsibilities: [
        'View assigned courses',
        'Manage student evaluation marks',
        'Process student mark requests',
        'Generate grade sheets'
      ],
      color: 'border-blue-500/30 hover:border-blue-500/60',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      btnBg: 'hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
    },
    {
      role: 'Student',
      subtitle: 'Learner & Academic Achiever',
      desc: 'Inspects registered courses, monitors SGPA & CGPA across all semesters (1-1 to 4-2), and submits formal requests for detailed marks.',
      responsibilities: [
        'View academic records (1-1 to 4-2)',
        'See course teachers & schedules',
        'Request detailed component marks',
        'Download official transcripts'
      ],
      color: 'border-cyan-500/30 hover:border-cyan-500/60',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
      btnBg: 'hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400'
    }
  ];

  return (
    <div className="w-full bg-[#f8fafc] dark:bg-[#0b132b] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* ── 1. CINEMATIC HERO SECTION ─────────────────────────────────── */}
      <section className="relative pt-24 pb-16 sm:pt-28 md:pt-36 md:pb-24 overflow-hidden border-b border-slate-200/70 dark:border-[#1e293b]">
        
        {/* Multi-Color Atmospheric Glow (Electric Blue, Indigo, Cyan) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl 2xl:max-w-[1760px] h-[640px] pointer-events-none opacity-40 dark:opacity-25 z-0">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              {/* RUET Institutional Identity Badge (Blue / Indigo) */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-[#111c38] border border-blue-200 dark:border-blue-900/60 shadow-sm">
                <img src="/labeval_icon.png" alt="LabEval" className="w-5 h-5 object-contain" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 dark:text-blue-400">
                  RUET Lab Performance Evaluation System
                </span>
              </div>

              {/* Main Headline (Multi-Color Gradient) */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  Academic Intelligence, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-400">
                    Simplified.
                  </span>
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal pt-1">
                  Manage courses, teachers, students, academic records and departmental workflows through one unified, intelligent platform.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-[#111c38] hover:bg-slate-50 dark:hover:bg-[#18284e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-semibold text-sm shadow-sm transition-all text-center"
                >
                  Explore Platform
                </a>
              </div>

              {/* Fast Scope Tags */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-3 text-[12px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                  <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" /> Semesters 1-1 to 4-2
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" /> Sessional & Lab Evaluation
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" /> Verified PDF & XLSX
                </span>
              </div>
            </div>

            {/* Hero Right: 2.5D Digital Academic Intelligence Network (Safe-Distance Constellation) */}
            <div className="lg:col-span-6 relative w-full">
              <div className="relative rounded-2xl bg-white/60 dark:bg-[#0f172a]/60 border border-slate-200/90 dark:border-[#1e293b] shadow-2xl backdrop-blur-md overflow-hidden">
                <AcademicIntelligenceNetwork />
              </div>
            </div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <a href="#features" className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex flex-col items-center gap-1">
            <span className="text-[11px] font-medium tracking-wider uppercase">Scroll to explore</span>
            <div className="w-5 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-start justify-center p-1">
              <span className="w-1 h-2 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
          </a>
        </div>
      </section>

      {/* ── 2. MULTI-COLOR METRICS & STATS COUNTERS ─────────────────────── */}
      <section className="py-12 bg-white dark:bg-[#0d1633] border-b border-slate-200/80 dark:border-[#1e293b]">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: 'Active Courses', value: '42', detail: 'Sessional & Lab Catalog', icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600', border: 'border-l-4 border-l-blue-500' },
              { label: 'Faculty Members', value: '31', detail: 'Department Evaluators', icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600', border: 'border-l-4 border-l-indigo-500' },
              { label: 'Enrolled Students', value: '684', detail: 'Series 21, 22, 23 & 24', icon: GraduationCap, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600', border: 'border-l-4 border-l-cyan-500' },
              { label: 'Academic Depts', value: '8', detail: 'Engineering Faculties', icon: Building2, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600', border: 'border-l-4 border-l-amber-500' }
            ].map((stat, idx) => (
              <div key={idx} className={`p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-[#1e293b] bg-[#fbfcfd] dark:bg-[#111c38] flex items-center justify-between ${stat.border} shadow-sm`}>
                <div>
                  <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {stat.label}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    {stat.detail}
                  </div>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES SECTION (Multi-Color Cards) ─────────────────────── */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              Department Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Everything your department needs.
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Designed from the ground up to respect authentic administrative hierarchy, course evaluation policies, and academic records of RUET.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className={`group p-6 rounded-2xl bg-white dark:bg-[#111c38] border ${item.color} dark:border-[#1e293b] hover:-translate-y-1 transition-all duration-200 shadow-sm`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center transition-colors`}>
                    <item.icon size={22} />
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${item.badgeBg}`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 4. ACADEMIC WORKFLOW SECTION (Vibrant Lifecycle) ────────────── */}
      <section id="workflow" className="py-20 bg-white dark:bg-[#0d1633] border-y border-slate-200/80 dark:border-[#1e293b]">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              End-to-End Lifecycle
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              The Connected Academic Flow
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              How academic courses, teachers, students, and evaluation records synchronize through every milestone.
            </p>
          </div>

          {/* Workflow Interactive Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-8">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeWorkflowStep === idx;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveWorkflowStep(idx)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                      : 'bg-[#fbfcfd] dark:bg-[#111c38] border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      0{idx + 1}
                    </span>
                    <Icon size={14} className={isActive ? 'text-white' : ''} style={{ color: isActive ? '#fff' : step.color }} />
                  </div>
                  <div className="text-xs font-bold truncate">{step.title}</div>
                  <div className={`text-[9px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {step.role}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Step Showcase Card */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#f8fafc] dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 uppercase">
                  Stage 0{activeWorkflowStep + 1} &bull; {workflowSteps[activeWorkflowStep].role}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {workflowSteps[activeWorkflowStep].title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {workflowSteps[activeWorkflowStep].desc}
              </p>
            </div>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              Access In Platform <ChevronRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── 5. PLATFORM PREVIEW SECTION ───────────────────────────────── */}
      <section id="preview" className="py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              Department Head Interface
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              An Academic Operating System
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              High-density departmental control center built for rapid course-teacher assignment and monitoring.
            </p>
          </div>

          {/* Mock Browser Frame with Multi-Color Accents */}
          <div className="rounded-2xl border border-slate-300 dark:border-[#1e293b] shadow-2xl bg-white dark:bg-[#0f172a] overflow-hidden max-w-5xl mx-auto">
            {/* Window Topbar */}
            <div className="bg-slate-100 dark:bg-[#15203b] px-4 py-3 border-b border-slate-200 dark:border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                <span className="ml-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  ruet.ac.bd/academic-platform/department-head/dashboard
                </span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Department of ETE &bull; Session 2026
              </span>
            </div>

            {/* Mock Dashboard Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Header inside mockup */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1e293b]">
                <div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    ECE Faculty &bull; Dept of Electronics & Telecommunication Engineering
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Department Head Dashboard
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-md bg-blue-600 text-white font-medium shadow-sm">Assign Course</span>
                  <span className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">Download Tabulation</span>
                </div>
              </div>

              {/* Multi-Colored Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-[#fbfcfd] dark:bg-[#111c38] border-l-4 border-l-blue-500">
                  <span className="text-[10px] text-slate-500 block">Total Sessional</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">42 Courses</span>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-[#fbfcfd] dark:bg-[#111c38] border-l-4 border-l-indigo-500">
                  <span className="text-[10px] text-slate-500 block">Assigned Faculty</span>
                  <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">31 Teachers</span>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-[#fbfcfd] dark:bg-[#111c38] border-l-4 border-l-cyan-500">
                  <span className="text-[10px] text-slate-500 block">Active Semesters</span>
                  <span className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">1-1 to 4-2</span>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-[#fbfcfd] dark:bg-[#111c38] border-l-4 border-l-amber-500">
                  <span className="text-[10px] text-slate-500 block">Pending Requests</span>
                  <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">12 Reviews</span>
                </div>
              </div>

              {/* Mock Table */}
              <div className="border border-slate-200 dark:border-[#1e293b] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-[#111c38] text-slate-500 border-b border-slate-200 dark:border-[#1e293b]">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Course Title</th>
                      <th className="p-2.5">Semester</th>
                      <th className="p-2.5">Assigned Teacher</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e293b]">
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ETE 3202</td>
                      <td className="p-2.5 font-medium">Digital Signal Processing Sessional</td>
                      <td className="p-2.5">3-2</td>
                      <td className="p-2.5">Md Abu Ismail Siddique &bull; Asst. Prof.</td>
                      <td className="p-2.5 text-right"><span className="px-2 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Assigned</span></td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ETE 3206</td>
                      <td className="p-2.5 font-medium">Microwave Engineering Sessional</td>
                      <td className="p-2.5">3-2</td>
                      <td className="p-2.5">Dr. Md. Faruk Hossain &bull; Professor</td>
                      <td className="p-2.5 text-right"><span className="px-2 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Assigned</span></td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-slate-600 dark:text-slate-300">ETE 4104</td>
                      <td className="p-2.5 font-medium">Optical Fiber Communication Sessional</td>
                      <td className="p-2.5">4-1</td>
                      <td className="p-2.5 text-slate-400 italic">Unassigned</td>
                      <td className="p-2.5 text-right"><span className="px-2 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Pending Assignment</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. ROLE ARCHITECTURE SECTION ───────────────────────────────── */}
      <section id="roles" className="py-20 bg-white dark:bg-[#0d1633] border-t border-slate-200/80 dark:border-[#1e293b]">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              Role-Based Access
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for University Roles
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Clear permissions, strict data isolation, and tailored user interfaces for every stakeholder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r, idx) => (
              <div
                key={idx}
                className={`p-7 rounded-2xl bg-[#fbfcfd] dark:bg-[#111c38] border ${r.color} dark:border-[#1e293b] flex flex-col justify-between hover:shadow-lg transition-all`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${r.badgeBg}`}>
                      {r.role}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Role 0{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {r.role}
                    </h3>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                      {r.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {r.desc}
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Key Capabilities:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {r.responsibilities.map((resp, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check size={13} className="text-blue-500 shrink-0" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200/70 dark:border-[#1e293b]">
                  <Link
                    to="/login"
                    className={`w-full py-2.5 rounded-xl bg-white dark:bg-[#15203b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 ${r.btnBg} text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors`}
                  >
                    Enter as {r.role} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. INSTITUTIONAL TRUST & GOVERNANCE ─────────────────────────── */}
      <section className="py-16 bg-[#f8fafc] dark:bg-[#0b132b]">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111c38] border border-slate-200 dark:border-[#1e293b] shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#1e293b]">
              {[
                { title: 'Department-Focused', desc: 'Strict faculty & departmental boundaries', color: 'bg-blue-500' },
                { title: 'Role-Based', desc: 'Department Head, Teacher & Student separation', color: 'bg-indigo-500' },
                { title: 'Secure & Audited', desc: 'Protected mark entry with revision safety', color: 'bg-violet-500' },
                { title: 'Data-Driven', desc: 'Real-time calculation of SGPA & tabulations', color: 'bg-cyan-500' },
                { title: 'Report-Ready', desc: 'Formal RUET Dean-approved PDF & XLSX', color: 'bg-emerald-500' }
              ].map((item, i) => (
                <div key={i} className={`${i > 0 ? 'pt-4 sm:pt-0 sm:pl-4 md:pl-6' : ''}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} mx-auto mb-2`}></div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CALL TO ACTION (Deep Navy & Indigo Aura) ───────────── */}
      <section className="py-20 md:py-28 bg-[#070d1e] dark:bg-[#060a17] relative overflow-hidden text-white border-t border-slate-800">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-5 text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800 text-[11px] font-semibold text-blue-300">
            <Sparkles size={14} className="text-blue-400" />
            Rajshahi University of Engineering & Technology
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to experience smarter <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
              lab performance evaluation?
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Bring courses, teachers, students and academic records together in one unified, institutional platform.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-950/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <span>Enter Lab Performance Evaluation</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
