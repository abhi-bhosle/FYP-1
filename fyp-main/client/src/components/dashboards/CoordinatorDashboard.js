import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  UserCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Shield,
  Settings,
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
  { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-700' },
  { iconBg: 'bg-violet-100', iconColor: 'text-violet-600', valueColor: 'text-violet-700' },
  { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueColor: 'text-amber-700' },
];

const CoordinatorDashboard = ({ stats }) => {
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers || 0, sub: `${stats.totalStudents || 0} Students • ${stats.totalGuides || 0} Guides`, icon: Users },
    { label: 'Total Groups', value: stats.totalGroups || 0, sub: 'Active project groups', icon: UserCheck },
    { label: 'Total Projects', value: stats.totalProjects || 0, sub: 'All registered projects', icon: FolderKanban },
    { label: 'Pending Approvals', value: stats.pendingApprovals || 0, sub: 'Require your attention', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Coordinator Dashboard</h1>
        <p className="text-slate-500 mt-2">System overview and management</p>
      </div>

      {/* Main Stats Grid */}
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
          <Settings className="w-6 h-6 mr-2 text-indigo-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { to: '/app/users', icon: Users, label: 'Manage Users', sub: `${stats.totalUsers || 0} users` },
            { to: '/app/groups', icon: UserCheck, label: 'Assign Guides', sub: 'To groups' },
            { to: '/app/projects', icon: FolderKanban, label: 'Review Projects', sub: `${stats.pendingApprovals || 0} pending` },
            { to: '/app/reports', icon: BarChart3, label: 'Manage FTRs', sub: 'Set global deadlines' },
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

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6 border-l-4 border-l-amber-400">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">Pending Project Approvals</h3>
              <p className="text-slate-500 text-sm mb-3">
                {stats.pendingApprovals} project{stats.pendingApprovals !== 1 ? 's' : ''} waiting for approval.
              </p>
              <Link
                to="/app/projects"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-button hover:shadow-button-hover transition-all"
              >
                Review Projects
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            Project Status Distribution
          </h3>
          <div className="space-y-4">
            {stats.projectsByStatus && stats.projectsByStatus.length > 0 ? (
              stats.projectsByStatus.map((item) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-500 capitalize">{item.status.replace('_', ' ')}</span>
                    <span className="font-semibold text-slate-700">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        item.status === 'approved' ? 'bg-emerald-400' :
                        item.status === 'pending' ? 'bg-amber-400' :
                        item.status === 'rejected' ? 'bg-red-400' :
                        'bg-slate-400'
                      }`}
                      style={{ width: `${stats.totalProjects > 0 ? (item.count / stats.totalProjects) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">No project data available</p>
            )}
          </div>
        </motion.div>

        {/* User Distribution */}
        <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-600" />
            User Distribution
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Students', sub: 'Active learners', value: stats.totalStudents || 0, bgColor: 'bg-indigo-500', textColor: 'text-indigo-600', icon: Users },
              { label: 'Guides', sub: 'Project mentors', value: stats.totalGuides || 0, bgColor: 'bg-emerald-500', textColor: 'text-emerald-600', icon: UserCheck },
              { label: 'Coordinators', sub: 'System admins', value: stats.totalCoordinators || 0, bgColor: 'bg-violet-500', textColor: 'text-violet-600', icon: Shield },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center mr-3`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                </div>
                <span className={`text-2xl font-bold ${item.textColor}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Projects */}
      <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
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
            stats.recentProjects.slice(0, 5).map((project) => (
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
                      <span>Group: {project.group?.name}</span>
                      <span>•</span>
                      <span>Guide: {project.guide?.name}</span>
                      <span>•</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                  </div>
                  {project.progressPercentage !== undefined && (
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-indigo-600">
                        {project.progressPercentage}%
                      </div>
                      <div className="text-xs text-slate-400">Progress</div>
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No projects yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Groups with Guides', value: `${stats.groupsWithGuides || 0}/${stats.totalGroups || 0}`, icon: CheckCircle, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', hasProgress: true, progress: ((stats.groupsWithGuides || 0) / (stats.totalGroups || 1)) * 100, barColor: 'bg-emerald-400' },
          { title: 'Active Projects', value: stats.activeProjects || 0, icon: TrendingUp, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100', sub: 'Currently in progress' },
          { title: 'Completion Rate', value: `${stats.completionRate || 0}%`, icon: CheckCircle, iconColor: 'text-violet-600', iconBg: 'bg-violet-100', sub: 'Successfully completed' },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp} custom={8 + i} initial="hidden" animate="visible" className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{item.title}</h3>
              <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {item.value}
            </div>
            {item.hasProgress ? (
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`${item.barColor} h-2.5 rounded-full transition-all`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400">{item.sub}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
