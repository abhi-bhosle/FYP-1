import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { getStatusColor, formatDate } from '../../utils/helpers';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const statCardConfig = [
  { iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', valueColor: 'text-indigo-700' },
  { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueColor: 'text-amber-700' },
  { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700' },
  { iconBg: 'bg-violet-100', iconColor: 'text-violet-600', valueColor: 'text-violet-700' },
];

const GuideDashboard = ({ stats }) => {
  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects || 0, sub: 'All assigned projects', icon: FolderKanban },
    { label: 'Active Projects', value: stats.activeProjects || 0, sub: 'Currently in progress', icon: Clock },
    { label: 'Completed', value: stats.completedProjects || 0, sub: 'Successfully finished', icon: CheckCircle },
    { label: 'Pending Reviews', value: stats.pendingReports || 0, sub: 'Reports to review', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Guide Dashboard</h1>
        <p className="text-slate-500 mt-2">Monitor and manage your assigned projects</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{card.label}</p>
                <p className={`text-3xl font-bold mt-2 ${statCardConfig[i].valueColor}`}>{card.value}</p>
                <p className="text-slate-400 text-xs mt-2">{card.sub}</p>
              </div>
              <div className={`w-14 h-14 ${statCardConfig[i].iconBg} rounded-2xl flex items-center justify-center`}>
                <card.icon className={`w-7 h-7 ${statCardConfig[i].iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center text-slate-800">
          <Award className="w-6 h-6 mr-2 text-indigo-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to: '/app/weekly-reports', icon: FileText, label: 'Review Weekly Reports', sub: `${stats.pendingReports || 0} pending` },
            { to: '/app/reports', icon: CheckCircle, label: 'Grade Deliverables', sub: `${stats.pendingDeliverables || 0} pending` },
            { to: '/app/evaluations', icon: Award, label: 'Final Evaluations', sub: 'Semester marks' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-all duration-300 border border-slate-100 hover:border-indigo-200 group"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <action.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">{action.label}</p>
                <p className="text-sm text-slate-400">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Projects */}
      <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center text-slate-800">
            <FolderKanban className="w-6 h-6 mr-2 text-indigo-600" />
            Recent Projects
          </h2>
          <Link to="/app/projects" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors">
            View All →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.recentProjects?.length > 0 ? (
            stats.recentProjects.map((project) => (
              <Link
                key={project._id}
                to={`/app/projects/${project._id}`}
                className="block p-6 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-slate-700">{project.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status || project.phase)}`}>
                        {(project.status || project.phase || '').replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {project.group?.name}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>
                  {project.progressPercentage !== undefined && (
                    <div className="ml-4 w-32">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Progress</span>
                        <span className="text-indigo-600 font-medium">{project.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No projects assigned yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pending Reports Alert */}
      {stats.pendingReports > 0 && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6 border-l-4 border-l-amber-400">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">Pending Report Reviews</h3>
              <p className="text-slate-500 text-sm mb-3">
                You have {stats.pendingReports} report{stats.pendingReports !== 1 ? 's' : ''} waiting for your review.
              </p>
              <Link
                to="/app/reports"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-button hover:shadow-button-hover transition-all"
              >
                Review Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
            Project Status Distribution
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-500">In Progress</span>
                <span className="font-semibold text-amber-600">{stats.activeProjects || 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-amber-400 h-2.5 rounded-full transition-all"
                  style={{ width: `${((stats.activeProjects || 0) / (stats.totalProjects || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-500">Completed</span>
                <span className="font-semibold text-emerald-600">{stats.completedProjects || 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-emerald-400 h-2.5 rounded-full transition-all"
                  style={{ width: `${((stats.completedProjects || 0) / (stats.totalProjects || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-600" />
            Assigned Groups
          </h3>
          <div className="space-y-2">
            {stats.assignedGroups && stats.assignedGroups.length > 0 ? (
              stats.assignedGroups.slice(0, 5).map((group) => (
                <Link
                  key={group._id}
                  to={`/app/groups/${group._id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <span className="font-medium text-slate-700">{group.name}</span>
                  <span className="text-sm text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.members?.length || 0} members</span>
                </Link>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">No groups assigned yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuideDashboard;
