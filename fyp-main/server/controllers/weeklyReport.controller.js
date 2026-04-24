const WeeklyReport = require('../models/WeeklyReport.model');
const Group = require('../models/Group.model');
const Project = require('../models/Project.model');
const { logAction } = require('../utils/logger');
const { createNotification } = require('../utils/notification.utils');

// Student submits a weekly report
exports.submitReport = async (req, res) => {
  try {
    const { weekNumber, title, description, projectId, groupId } = req.body;
    let documentUrl = req.body.documentUrl;

    if (req.file) {
      documentUrl = `/uploads/${req.body.fileType || 'general'}/${req.file.filename}`;
    }

    // Verify group and project
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    
    // Check if user is in the group
    if (!group.members.some(m => m.toString() === req.user._id.toString()) && group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit for this group' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Ensure it's the correct project for the group
    if (project.group.toString() !== groupId.toString()) {
        return res.status(400).json({ success: false, message: 'Project does not belong to this group' });
    }

    // Check if report already exists for this week
    const existingReport = await WeeklyReport.findOne({ group: groupId, weekNumber });
    if (existingReport) {
      return res.status(400).json({ success: false, message: `Report for week ${weekNumber} already submitted` });
    }

    const report = new WeeklyReport({
      project: projectId,
      group: groupId,
      weekNumber,
      title,
      description,
      documentUrl,
      submittedBy: req.user._id,
      status: 'submitted'
    });

    await report.save();

    // Log action
    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'SUBMIT_WEEKLY_REPORT',
      entityType: 'WeeklyReport',
      entityId: report._id,
      description: `Submitted weekly report for week ${weekNumber}`
    });

    // Notify guide if assigned
    const io = req.app.get('io');
    if (group.guide && io) {
      const { notifyUser } = require('../utils/notification.utils');
      await notifyUser(io, {
        recipient: group.guide,
        type: 'report_submitted',
        title: 'New Weekly Report',
        message: `New weekly report submitted by ${group.name} for week ${weekNumber}.`,
        sender: req.user._id,
        relatedGroup: group._id,
        relatedProject: projectId
      });
    }

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Error submitting report:', error);
    if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Report for this week already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get reports for a group (Student view)
exports.getGroupReports = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Check if user is student and in the group, or is guide/coordinator
    if (req.user.role === 'student') {
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        if (!group.members.some(m => m.toString() === req.user._id.toString()) && group.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
    } else if (req.user.role === 'guide') {
        const group = await Group.findById(groupId);
        if (group.guide.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
    }

    const reports = await WeeklyReport.find({ group: groupId })
      .populate('submittedBy', 'fullName')
      .populate('reviewedBy', 'fullName')
      .sort({ weekNumber: -1 });

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('Error getting group reports:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Guide reviews a report
exports.reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, marks } = req.body;

    const report = await WeeklyReport.findById(id).populate('group');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // Security check: Only assigned guide or coordinator/admin can review
    if (req.user.role === 'guide' && report.group.guide?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this group.' });
    }

    report.feedback = feedback;
    report.marks = marks;
    report.status = 'reviewed';
    report.reviewedBy = req.user._id;
    report.reviewedAt = Date.now();

    await report.save();

    // Log action
    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'REVIEW_WEEKLY_REPORT',
      entityType: 'WeeklyReport',
      entityId: report._id,
      description: `Reviewed weekly report for week ${report.weekNumber}`
    });

    // Notify group leader
    const io = req.app.get('io');
    if (io && report.group.leader) {
      const { notifyUser } = require('../utils/notification.utils');
      await notifyUser(io, {
        recipient: report.group.leader,
        type: 'report_reviewed',
        title: 'Weekly Report Reviewed',
        message: `Your weekly report for week ${report.weekNumber} has been reviewed.`,
        sender: req.user._id,
        relatedGroup: report.group._id,
        relatedProject: report.project
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Coordinator gets all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find()
      .populate('group', 'name')
      .populate('project', 'title')
      .populate('submittedBy', 'fullName')
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('Error getting all reports:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
