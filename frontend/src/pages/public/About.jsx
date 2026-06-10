import { motion } from 'framer-motion';

const About = () => {
  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-slate-900 dark:text-white mb-8">About LabEval RUET System</h1>
        
        <div className="prose prose-lg text-slate-600 dark:text-slate-350">
          <p className="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
            LabEval RUET is a specialized Laboratory Performance Tracking System developed exclusively for Rajshahi University of Engineering & Technology (RUET).
          </p>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-8">
            <h2 className="text-2xl font-heading font-bold text-slate-800 dark:text-white mb-4">Our Mission</h2>
            <p className="text-slate-600 dark:text-slate-300">
              The primary goal of LabEval RUET is to transition traditional, paper-based laboratory assessments into a streamlined, secure, and fully transparent digital environment. By automating data entry, attendance tracking, and complex grade calculations, LabEval RUET empowers instructors to focus more on teaching and less on administrative overhead.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/40">
              <h3 className="text-xl font-heading font-bold text-blue-900 dark:text-blue-200 mb-3">For Instructors</h3>
              <ul className="space-y-2 text-blue-800 dark:text-blue-300 text-sm">
                <li>• Record daily attendance effortlessly</li>
                <li>• Track lab report submissions</li>
                <li>• Grade continuous performance</li>
                <li>• Auto-calculate final lab grades</li>
                <li>• Export official result sheets (PDF/Excel)</li>
              </ul>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/40">
              <h3 className="text-xl font-heading font-bold text-emerald-900 dark:text-emerald-200 mb-3">For Students</h3>
              <ul className="space-y-2 text-emerald-800 dark:text-emerald-300 text-sm">
                <li>• View attendance percentages in real-time</li>
                <li>• Track submitted vs missing reports</li>
                <li>• Request detailed marks breakdown securely</li>
                <li>• Stay informed about academic standing</li>
              </ul>
            </div>
          </div>
          
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-12">
            Developed in 2026. Version 2.0.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default About;
