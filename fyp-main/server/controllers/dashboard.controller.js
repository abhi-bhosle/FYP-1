const Project = require('../models/Project.model');
const Group = require('../models/Group.model');
const User = require('../models/User.model');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {};

    if (req.user.role === 'student') {
      // Student dashboard
      const group = await Group.findOne({ members: req.user._id })
        .populate('project')
        .populate('guide', 'name email')
        .populate('members', 'name email')
        .populate('leader', 'name email');

      if (group) {
        stats.group = group;
        
        stats.totalFiles = 0;
        stats.storageUsed = 0;
        stats.storageQuota = 0;
        stats.storagePercentage = 0;
        stats.recentActivity = [];
        
        if (group.project) {
          const WeeklyReport = require('../models/WeeklyReport.model');
          const Deliverable = require('../models/Deliverable.model');
          const Evaluation = require('../models/Evaluation.model');
          
          stats.reportsSubmitted = await WeeklyReport.countDocuments({ project: group.project._id });
          
          stats.evaluations = await Evaluation.find({ group: group._id })
            .sort({ date: -1 })
            .limit(1);
          
          stats.pendingDeliverables = await Deliverable.countDocuments({ 
            group: group._id,
            status: { $in: ['pending', 'late'] }
          });
        } else {
          stats.reportsSubmitted = 0;
          stats.evaluations = [];
          stats.pendingDeliverables = 0;
        }
      } else {
        // Student not in a group
        stats.totalFiles = 0;
        stats.storageUsed = 0;
        stats.recentActivity = [];
        stats.reportsSubmitted = 0;
        stats.evaluations = [];
        stats.pendingReviews = 0;
        stats.averageGrade = 0;
      }
    } else if (req.user.role === 'guide') {
      // Guide dashboard
      const projects = await Project.find({ guide: req.user._id });
      const projectIds = projects.map(p => p._id);
      
      stats.totalProjects = projects.length;
      stats.activeProjects = projects.filter(p => p.proposalStatus === 'approved').length;
      stats.completedProjects = projects.filter(p => p.progressPercentage >= 100).length;
      
      // Get assigned groups
      const assignedGroups = await Group.find({ guide: req.user._id })
        .populate('members', 'name email')
        .select('name members department year');
      
      const WeeklyReport = require('../models/WeeklyReport.model');
      const Deliverable = require('../models/Deliverable.model');
      
      const groupIds = assignedGroups.map(g => g._id);
      
      stats.pendingReports = await WeeklyReport.countDocuments({ 
        group: { $in: groupIds },
        status: 'submitted' 
      });
      
      stats.pendingDeliverables = await Deliverable.countDocuments({
        group: { $in: groupIds },
        status: 'submitted'
      });
      
      stats.recentProjects = await Project.find({ guide: req.user._id })
        .populate('group', 'name members')
        .limit(5)
        .sort({ updatedAt: -1 });
      
      stats.assignedGroups = assignedGroups;
    } else if (['coordinator', 'admin'].includes(req.user.role)) {
      // Coordinator/Admin dashboard
      stats.totalUsers = await User.countDocuments({ isActive: true });
      stats.totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      stats.totalGuides = await User.countDocuments({ role: 'guide', isActive: true });
      stats.totalCoordinators = await User.countDocuments({ 
        role: { $in: ['coordinator', 'admin'] }, 
        isActive: true 
      });
      
      stats.totalGroups = await Group.countDocuments({ isActive: true });
      stats.totalProjects = await Project.countDocuments();
      
      // Calculate groups with guides assigned
      stats.groupsWithGuides = await Group.countDocuments({ 
        guide: { $ne: null },
        isActive: true 
      });
      
      // Calculate active projects (approved and in development)
      stats.activeProjects = await Project.countDocuments({ proposalStatus: 'approved', phase: { $in: ['DEVELOPMENT', 'SEM1_EVAL', 'SEM2_CONT'] } });
      
      // Calculate completion rate
      const completedProjects = await Project.countDocuments({ progressPercentage: 100 });
      stats.completionRate = stats.totalProjects > 0 
        ? Math.round((completedProjects / stats.totalProjects) * 100) 
        : 0;
      
      stats.projectsByStatus = await Project.aggregate([
        {
          $group: {
            _id: '$proposalStatus',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);
      
      stats.recentProjects = await Project.find()
        .populate('group', 'name')
        .populate('guide', 'name')
        .limit(10)
        .sort({ createdAt: -1 });
      
      stats.pendingApprovals = await Project.countDocuments({ proposalStatus: 'pending' });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const analytics = {
      projectsOverTime: await Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      projectsByDomain: await Project.aggregate([
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      averageProgressByDepartment: await Project.aggregate([
        {
          $lookup: {
            from: 'groups',
            localField: 'group',
            foreignField: '_id',
            as: 'groupData'
          }
        },
        { $unwind: '$groupData' },
        {
          $group: {
            _id: '$groupData.department',
            avgProgress: { $avg: '$progressPercentage' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      evaluationDistribution: []
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

// Get progress analytics (for faculty, coordinator, admin only)
exports.getProgressAnalytics = async (req, res) => {
  try {
    // Check if user has permission
    if (!['guide', 'coordinator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analytics = {};

    // Overall completion rate
    const allProjects = await Project.find();
    const totalProjects = allProjects.length;
    const averageCompletion = totalProjects > 0
      ? allProjects.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / totalProjects
      : 0;

    analytics.overallStats = {
      totalProjects,
      averageCompletion: Math.round(averageCompletion * 10) / 10,
      completedProjects: allProjects.filter(p => p.progressPercentage >= 100).length,
      inProgressProjects: allProjects.filter(p => p.proposalStatus === 'approved' && p.progressPercentage < 100).length,
      proposedProjects: allProjects.filter(p => p.proposalStatus === 'pending').length,
    };

    // Top performing teams
    const topTeams = await Project.find()
      .populate('group', 'name members')
      .sort({ progressPercentage: -1 })
      .limit(10)
      .select('title progressPercentage phase proposalStatus group');

    analytics.topPerformingTeams = topTeams.map(p => ({
      projectTitle: p.title,
      groupName: p.group?.name || 'N/A',
      progress: p.progressPercentage || 0,
      phase: p.phase,
      memberCount: p.group?.members?.length || 0,
    }));

    // Overdue projects (projects with deadlines in the past and not completed)
    const overdueProjects = await Project.find({
      expectedCompletionDate: { $lt: new Date() },
      progressPercentage: { $lt: 100 }
    })
      .populate('group', 'name')
      .populate('guide', 'name')
      .select('title expectedCompletionDate progressPercentage phase proposalStatus group guide');

    analytics.overdueProjects = overdueProjects.map(p => ({
      id: p._id,
      title: p.title,
      groupName: p.group?.name || 'N/A',
      guideName: p.guide?.name || 'N/A',
      deadline: p.expectedCompletionDate,
      progress: p.progressPercentage || 0,
      phase: p.phase,
      daysOverdue: Math.floor((new Date() - new Date(p.expectedCompletionDate)) / (1000 * 60 * 60 * 24)),
    }));

    // Progress distribution
    const progressRanges = [
      { label: '0-20%', min: 0, max: 20 },
      { label: '21-40%', min: 21, max: 40 },
      { label: '41-60%', min: 41, max: 60 },
      { label: '61-80%', min: 61, max: 80 },
      { label: '81-100%', min: 81, max: 100 },
    ];

    analytics.progressDistribution = progressRanges.map(range => ({
      range: range.label,
      count: allProjects.filter(p => {
        const progress = p.progressPercentage || 0;
        return progress >= range.min && progress <= range.max;
      }).length,
    }));

    // Status distribution
    analytics.statusDistribution = [
      { status: 'Pending', count: allProjects.filter(p => p.proposalStatus === 'pending').length },
      { status: 'Approved', count: allProjects.filter(p => p.proposalStatus === 'approved').length },
      { status: 'Rejected', count: allProjects.filter(p => p.proposalStatus === 'rejected').length },
    ];

    // Monthly progress trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyProgress = await Project.aggregate([
      {
        $match: {
          updatedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' }
          },
          avgProgress: { $avg: '$progressPercentage' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    analytics.monthlyProgressTrend = monthlyProgress.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      avgProgress: Math.round(m.avgProgress * 10) / 10,
      projectCount: m.count,
    }));

    // Guide performance (if coordinator/admin)
    if (['coordinator', 'admin'].includes(req.user.role)) {
      const guidePerformance = await Project.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'guide',
            foreignField: '_id',
            as: 'guideData'
          }
        },
        { $unwind: { path: '$guideData', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$guide',
            guideName: { $first: '$guideData.name' },
            totalProjects: { $sum: 1 },
            avgProgress: { $avg: '$progressPercentage' },
            completedProjects: {
              $sum: { $cond: [{ $eq: ['$phase', 'COMPLETED'] }, 1, 0] }
            }
          }
        },
        { $sort: { avgProgress: -1 } },
        { $limit: 10 }
      ]);

      analytics.guidePerformance = guidePerformance.map(g => ({
        guideName: g.guideName || 'Unassigned',
        totalProjects: g.totalProjects,
        avgProgress: Math.round(g.avgProgress * 10) / 10,
        completedProjects: g.completedProjects,
        completionRate: g.totalProjects > 0 
          ? Math.round((g.completedProjects / g.totalProjects) * 100)
          : 0,
      }));
    }

    // Recent activity
    const recentProjects = await Project.find()
      .populate('group', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title progressPercentage phase proposalStatus updatedAt group');

    analytics.recentActivity = recentProjects.map(p => ({
      title: p.title,
      groupName: p.group?.name || 'N/A',
      progress: p.progressPercentage || 0,
      phase: p.phase,
      lastUpdated: p.updatedAt,
    }));

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get progress analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress analytics',
      error: error.message
    });
  }
};
