const Deliverable = require('../models/Deliverable.model');
const Project = require('../models/Project.model');
const Group = require('../models/Group.model');

// Coordinator manually schedules an FTR (or Final Evaluation) for a specific group/project
exports.scheduleDeliverable = async (req, res) => {
  try {
    const { projectId, groupId, title, type, dueDate } = req.body;

    // Must be coordinator/admin
    if (!['coordinator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only coordinators can schedule FTRs' });
    }

    const deliverable = await Deliverable.create({
      project: projectId,
      group: groupId,
      title,
      type,
      dueDate,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Deliverable scheduled successfully', data: deliverable });
  } catch (error) {
    console.error('Schedule deliverable error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule deliverable' });
  }
};

// Student submits their deliverable (PPT, Code, Report) — supports file upload
exports.submitDeliverable = async (req, res) => {
  try {
    const { documentUrl } = req.body;
    const deliverable = await Deliverable.findById(req.params.id).populate('group');

    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'Deliverable not found' });
    }

    // Must be in the group
    const isMember = deliverable.group.members.some(m => m.toString() === req.user._id.toString());
    const isLeader = deliverable.group.leader.toString() === req.user._id.toString();
    if (!isMember && !isLeader) {
      return res.status(403).json({ success: false, message: 'You are not in this group' });
    }

    // If a file was uploaded via multer, use its path; otherwise use the text URL
    if (req.file) {
      deliverable.documentUrl = `/uploads/${req.body.fileType || req.body.uploadType || 'general'}/${req.file.filename}`;
      deliverable.originalFileName = req.file.originalname;
    } else if (documentUrl) {
      deliverable.documentUrl = documentUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Please upload a file or provide a document URL' });
    }

    if (deliverable.dueDate && new Date() > new Date(deliverable.dueDate)) {
      deliverable.status = 'late';
    } else {
      deliverable.status = 'submitted';
    }

    deliverable.submittedAt = new Date();
    deliverable.submittedBy = req.user._id;

    await deliverable.save();

    res.json({ success: true, message: 'Deliverable submitted successfully', data: deliverable });
  } catch (error) {
    console.error('Submit deliverable error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit' });
  }
};

// Guide or Coordinator grades the deliverable and marks attendance
exports.gradeDeliverable = async (req, res) => {
  try {
    const { grade, comments, attendance } = req.body;
    const deliverable = await Deliverable.findById(req.params.id).populate('group');

    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'Deliverable not found' });
    }

    if (req.user.role === 'guide' && deliverable.group.guide?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this group' });
    }

    // Assign grades and attendance
    deliverable.grade = grade;
    deliverable.comments = comments;
    
    if (attendance) {
      deliverable.attendance = attendance; // [{student: ObjectId, isPresent: Boolean}]
    }

    deliverable.status = 'graded';
    deliverable.gradedBy = req.user._id;

    await deliverable.save();

    // Re-calculate the project progress percentage if this was an FTR
    if (deliverable.type === 'monthly_ftr') {
      const project = await Project.findById(deliverable.project);
      
      // Basic auto-increment logic or guide could manually set progress instead
      // if (project && project.progressPercentage < 100) {
      //    project.progressPercentage += 20; 
      //    await project.save();
      // }
    }

    res.json({ success: true, message: 'Deliverable graded successfully', data: deliverable });
  } catch (error) {
    console.error('Grade deliverable error:', error);
    res.status(500).json({ success: false, message: 'Failed to grade' });
  }
};

// Get all deliverables for a project
exports.getProjectDeliverables = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const deliverables = await Deliverable.find({ project: projectId }).sort({ dueDate: 1 });
    
    res.json({ success: true, data: deliverables });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch deliverables' });
  }
};
