import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Zap, BarChart3, ChevronRight } from 'lucide-react';

const Home = () => {
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const fadeUp = {
    hidden: { y: 30, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="w-full">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-10 z-0"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 dark:opacity-30 animate-blob z-0"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 dark:opacity-30 animate-blob animation-delay-2000 z-0"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial="hidden" 
            animate="show" 
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-primary font-semibold text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Version 2.0 Now Live
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-8">
              Laboratory Evaluation <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Reimagined.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              LabSync RUET is the official, next-generation performance tracking platform designed specifically for the rigorous academic environment of RUET.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-focus text-white rounded-full font-bold shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2 group">
                Access Portal 
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full font-bold shadow-sm transition-all text-center">
                Explore Features
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900/50 relative z-10 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900 dark:text-white mb-4">Everything you need to manage lab courses.</h2>
            <p className="text-slate-550 dark:text-slate-400 font-medium text-lg">Powerful features built for both instructors and students to streamline the entire laboratory evaluation process.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { icon: <Activity className="text-blue-500 dark:text-blue-400" size={32} />, title: "Real-time Tracking", desc: "Monitor daily attendance, lab reports, and continuous performance effortlessly.", bg: "bg-blue-50 dark:bg-blue-950/40" },
              { icon: <Zap className="text-amber-500 dark:text-amber-400" size={32} />, title: "Automated Grading", desc: "Instantly calculate final grades based on customizable weightages for quizzes and vivas.", bg: "bg-amber-50 dark:bg-amber-950/40" },
              { icon: <ShieldCheck className="text-emerald-500 dark:text-emerald-400" size={32} />, title: "Secure Access", desc: "Role-based authentication ensures data integrity and privacy for every user.", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
              { icon: <BarChart3 className="text-purple-500 dark:text-purple-400" size={32} />, title: "Instant Reports", desc: "Export final comprehensive results to PDF or Excel with a single click.", bg: "bg-purple-50 dark:bg-purple-950/40" }
            ].map((feature, idx) => (
              <motion.div key={idx} variants={fadeUp} className="glass-card p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className={`w-16 h-16 ${feature.bg} rounded-2xl flex items-center justify-center mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold font-heading text-slate-800 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-6">Ready to digitize your lab?</h2>
          <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">Join the instructors and students already using LabSync RUET to simplify their academic workflow.</p>
          <Link to="/login" className="inline-block px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-white/10">
            Sign In to LabSync RUET
          </Link>
        </div>
      </section>
      
    </div>
  );
};

export default Home;
