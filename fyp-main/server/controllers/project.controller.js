const Project = require('../models/Project.model');
const Group = require('../models/Group.model');
const { notifyUser, notifyMultipleUsers } = require('../utils/notification.utils');

// Create project proposal
exports.createProjectProposal = async (req, res) => {
  try {
    const { title, description, domain, researchPapers } = req.body;

    if (!req.user.group) {
      return res.status(400).json({ success: false, message: 'You must be in a group to submit a proposal' });
    }

    const group = await Group.findById(req.user.group);

    if (group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only group leader can submit project proposal' });
    }

    if (group.project) {
      return res.status(400).json({ success: false, message: 'Group already has a project proposal' });
    }

    if (!group.guide) {
      return res.status(400).json({ success: false, message: 'Please wait for a guide to be assigned' });
    }

    const project = await Project.create({
      title,
      description,
      domain,
      researchPapers: researchPapers || [],
      group: group._id,
      guide: group.guide,
      phase: 'PROPOSAL',
      proposalStatus: 'pending'
    });

    // Update group with project
    group.project = project._id;
    await group.save();

    // Notify guide
    const io = req.app.get('io');
    if (io) {
      await notifyUser(io, {
        recipient: group.guide,
        type: 'project_proposal',
        title: 'New Project Proposal',
        message: `Group ${group.name} submitted a project proposal: ${title}`,
        relatedProject: project._id,
        relatedGroup: group._id
      });
    }

    res.status(201).json({ success: true, message: 'Proposal submitted successfully', data: project });
  } catch (error) {
    console.error('Create project proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit proposal' });
  }
};

// Update/edit a project proposal (leader only, before approval)
exports.updateProposal = async (req, res) => {
  try {
    const { title, description, domain, researchPapers } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only allow editing if proposal is pending or rejected
    if (project.proposalStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot edit an already approved proposal' });
    }

    // Verify the requester is the group leader
    const group = await Group.findById(project.group);
    if (!group || group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group leader can edit the proposal' });
    }

    // Update fields
    if (title) project.title = title;
    if (description) project.description = description;
    if (domain) project.domain = domain;
    if (researchPapers) project.researchPapers = researchPapers;

    // If it was rejected, reset to pending for re-review
    if (project.proposalStatus === 'rejected') {
      project.proposalStatus = 'pending';
      project.rejectionReason = undefined;
      project.resubmittedAt = new Date();

      // Re-link group to project (in case it was cleared on rejection previously)
      if (!group.project) {
        group.project = project._id;
        await group.save();
      }
    }

    await project.save();

    // Notify guide about the updated/resubmitted proposal
    const io = req.app.get('io');
    if (io && project.guide) {
      const { notifyUser } = require('../utils/notification.utils');
      await notifyUser(io, {
        recipient: project.guide,
        type: 'project_proposal',
        title: '📝 Proposal Updated',
        message: `Group "${group.name}" has updated their project proposal: "${project.title}"`,
        relatedProject: project._id,
        relatedGroup: group._id
      });
    }

    res.json({ success: true, message: 'Proposal updated successfully', data: project });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to update proposal' });
  }
};

// Guide approves proposal
exports.approveProjectProposal = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('group');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only the assigned guide (or coordinator/admin) can approve
    if (req.user.role === 'guide' && project.guide.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned guide can approve this proposal' });
    }

    if (project.proposalStatus !== 'pending' && project.proposalStatus !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Proposal is already approved' });
    }

    project.proposalStatus = 'approved';
    project.phase = 'DEVELOPMENT';
    project.rejectionReason = undefined;
    project.approvedBy = req.user._id;
    project.approvedAt = new Date();
    await project.save();

    // Update the group's project reference (in case it was cleared after a previous rejection)
    const group = await Group.findById(project.group._id || project.group);
    if (group && !group.project) {
      group.project = project._id;
      await group.save();
    }

    // Notify ONLY the group leader
    const io = req.app.get('io');
    const leaderId = project.group.leader;
    if (io && leaderId) {
      await notifyUser(io, {
        recipient: leaderId,
        type: 'proposal_approved',
        title: '✅ Proposal Approved',
        message: `Great news! Your project proposal "${project.title}" has been approved by your guide. You can now proceed to the development phase.`,
        relatedProject: project._id,
        relatedGroup: project.group._id
      });
    }

    res.json({ success: true, message: 'Project approved successfully', data: project });
  } catch (error) {
    console.error('Approve proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
};

// Guide rejects proposal
exports.rejectProjectProposal = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const project = await Project.findById(req.params.id).populate('group');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only the assigned guide (or coordinator/admin) can reject
    if (req.user.role === 'guide' && project.guide.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned guide can reject this proposal' });
    }

    project.proposalStatus = 'rejected';
    project.rejectionReason = reason;
    await project.save();

    // We DO NOT clear the group's project reference here
    // The group remains linked to the rejected project so the leader can view the reason and resubmit
    // Update timestamps
    project.updatedAt = new Date();
    await project.save();

    // Notify ONLY the group leader with the full rejection reason
    const io = req.app.get('io');
    const leaderId = project.group.leader;
    if (io && leaderId) {
      await notifyUser(io, {
        recipient: leaderId,
        type: 'proposal_rejected',
        title: '❌ Proposal Rejected',
        message: `Your project proposal "${project.title}" was rejected by your guide.\n\nReason: ${reason}\n\nPlease revise your proposal and resubmit.`,
        relatedProject: project._id,
        relatedGroup: project.group._id
      });
    }

    res.json({ success: true, message: 'Project rejected', data: project });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject' });
  }
};

// Get single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('group', 'name members leader')
      .populate('guide', 'name email department')
      .populate('approvedBy', 'name');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Access control: students can only see their group's project
    if (req.user.role === 'student') {
      const Group = require('../models/Group.model');
      const group = await Group.findOne({ members: req.user._id });
      if (!group || group.project?.toString() !== project._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Guides can only see projects assigned to them
    if (req.user.role === 'guide' && project.guide?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Get project by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const { phase, proposalStatus } = req.query;
    const query = {};
    if (phase) query.phase = phase;
    if (proposalStatus) query.proposalStatus = proposalStatus;

    if (req.user.role === 'student') {
      const group = await Group.findOne({ members: req.user._id });
      if (group) query.group = group._id;
    } else if (req.user.role === 'guide') {
      query.guide = req.user._id;
    }

    const projects = await Project.find(query)
      .populate('group', 'name')
      .populate('guide', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// Update Phase directly (Coordinator/Admin)
exports.updatePhase = async (req, res) => {
  try {
    const { phase } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.phase = phase;
    await project.save();

    res.json({ success: true, message: 'Phase updated successfully', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update phase' });
  }
};
