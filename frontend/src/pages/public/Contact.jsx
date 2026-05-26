import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MapPin, Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Message sent! We will get back to you shortly.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="pt-32 pb-24 max-w-6xl mx-auto px-6">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-slate-900 dark:text-white mb-4">Get in Touch</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">Have questions about the LabSync RUET system? We're here to help.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        
        {/* Contact Info */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-800 dark:text-white text-lg">Location</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Rajshahi University of Engineering & Technology (RUET)<br/>Rajshahi 6204, Bangladesh</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-800 dark:text-white text-lg">Email Support</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">support.labsync@ruet.ac.bd</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-800 dark:text-white text-lg">Phone</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">+880 1234 567890</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="glass-card p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350 ml-1 mb-1 block">Full Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-750 dark:text-white font-medium transition-all shadow-sm" 
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350 ml-1 mb-1 block">Email Address</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-750 dark:text-white font-medium transition-all shadow-sm" 
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350 ml-1 mb-1 block">Message</label>
              <textarea 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows="4"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-750 dark:text-white font-medium transition-all shadow-sm resize-none" 
                placeholder="How can we help you?"
              ></textarea>
            </div>
            <button type="submit" className="w-full py-4 bg-primary hover:bg-primary-focus text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
              Send Message
              <Send size={18} />
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default Contact;
