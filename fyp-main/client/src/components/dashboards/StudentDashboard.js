import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { getStatusColor } from '../../utils/helpers';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const StudentDashboard = ({ stats }) => {
  if (!stats?.group) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Student Dashboard</h1>
          <p className="text-slate-500 mt-2">Welcome to your academic project workspace</p>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-8 border-l-4 border-l-amber-400">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Awaiting Group Assignment</h3>
              <p className="text-slate-500 mb-4">
                You need to create a group or wait for the coordinator to assign you to one.
              </p>
              <Link
                to="/app/groups"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-button hover:shadow-button-hover transition-all"
              >
                Go to Groups →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase Aware Banner
  const getPhaseBanner = () => {
    if (!stats.group.project) {
      if (!stats.group.guide) {
        return { msg: "Next Step: Wait for the Coordinator to assign a Guide to your group.", icon: Users, color: "bg-slate-50 text-slate-800 border-slate-200", noGuide: true };
      }
      return { msg: "Next Step: Submit your Project Proposal with your chosen Domain.", icon: FileText, color: "bg-blue-50 text-blue-800 border-blue-200" };
    }
    const phase = stats.group.project.phase;
    if (phase === 'PROPOSAL') return { msg: "Phase: Proposal pending guide approval. Prepare your literature review.", icon: Clock, color: "bg-amber-50 text-amber-800 border-amber-200" };
    if (phase === 'DEVELOPMENT') return { msg: "Phase: Development. Make sure you check 'Deliverables' for upcoming FTRs.", icon: FolderKanban, color: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    if (phase === 'SEM1_EVAL') return { msg: "Phase: Sem 1 Evaluation. Upload your Final PPT and Report.", icon: Calendar, color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    return { msg: "Phase: Continuation.", icon: CheckCircle, color: "bg-slate-50 text-slate-800 border-slate-200" };
  }

  const { msg, icon: PhaseIcon, color } = getPhaseBanner();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Student Dashboard</h1>
        <p className="text-slate-500 mt-2">Track your academic project milestone phases</p>
      </div>

      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className={`border rounded-2xl p-5 flex items-center justify-between space-x-4 ${color}`}>
          <div className="flex items-center space-x-4">
            <PhaseIcon className="w-6 h-6" />
            <p className="font-medium text-lg">{msg}</p>
          </div>
          {!stats.group?.project && !getPhaseBanner().noGuide && (
            <Link
              to="/app/projects/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow font-medium transition-all"
            >
              Submit Proposal
            </Link>
          )}
        </div>
      </motion.div>

      {/* Quick Actions specific to deliverables */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/app/reports" className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition border relative">
            <Calendar className="w-5 h-5 text-emerald-600 mr-3" />
            <div>
              <p className="font-semibold text-slate-700">Deliverables & FTRs</p>
              <p className="text-sm text-slate-500">Check deadlines</p>
            </div>
            {stats.pendingDeliverables > 0 && (
              <span className="absolute top-3 right-3 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.pendingDeliverables} pending
              </span>
            )}
          </Link>
          <Link to="/app/weekly-reports" className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-indigo-50 transition border relative">
            <FileText className="w-5 h-5 text-indigo-600 mr-3" />
            <div>
              <p className="font-semibold text-slate-700">Weekly Reports</p>
              <p className="text-sm text-slate-500">{stats.reportsSubmitted || 0} submitted</p>
            </div>
          </Link>
          <Link to="/app/evaluations" className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-violet-50 transition border relative">
            <CheckCircle className="w-5 h-5 text-violet-600 mr-3" />
            <div>
              <p className="font-semibold text-slate-700">Evaluations</p>
              <p className="text-sm text-slate-500">
                {stats.evaluations?.length > 0 ? `Latest: ${stats.evaluations[0].marksObtained}/${stats.evaluations[0].totalMarks}` : 'No evaluations yet'}
              </p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Group Info */}
      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center text-slate-800">
          <Users className="w-6 h-6 mr-2 text-indigo-600" />
          Your Group
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-slate-800">{stats.group.name}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {stats.group.department} • Year {stats.group.year}
            </p>
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.group.members?.map((member) => (
                <div key={member._id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{member.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 truncate">{member.email || 'No email'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stats.group.guide && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-slate-600 mb-2">Project Guide Assigned</p>
              <div className="flex items-center space-x-3 p-4 bg-indigo-50/80 rounded-xl border border-indigo-100">
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{stats.group.guide.name}</p>
                  <p className="text-sm text-slate-500">{stats.group.guide.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
export default StudentDashboard;
