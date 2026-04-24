import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, PlusCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const WeeklyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch weekly reports from backend API
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-indigo-600" />
            Weekly Reports
          </h1>
          <p className="text-slate-500 mt-1">Submit and track your weekly project progress</p>
        </div>
        {user.role === 'student' && (
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow cursor-pointer font-medium hover:bg-indigo-700 flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            Submit Report
          </button>
        )}
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        {reports.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div key={report._id} className="p-6 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Week {report.weekNumber}: {report.title}</h3>
                  <p className="text-sm text-slate-500">Status: {report.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No weekly reports submitted yet.</p>
            {user.role === 'student' && (
              <p className="text-sm mt-2 text-indigo-500 cursor-pointer">Click "Submit Report" to add your first update.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WeeklyReports;
