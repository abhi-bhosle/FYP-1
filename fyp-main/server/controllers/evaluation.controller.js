const Evaluation = require('../models/Evaluation.model');
const Project = require('../models/Project.model');
const Group = require('../models/Group.model');
const { notifyMultipleUsers } = require('../utils/notification.utils');

// Create evaluation
exports.createEvaluation = async (req, res) => {
  try {
    const {
      projectId,
      groupId,
      type,
      criteria,
      comments,
      strengths,
      improvements
    } = req.body;

    const project = await Project.findById(projectId);
    const group = await Group.findById(groupId);

    if (!project || !group) {
      return res.status(404).json({
        success: false,
        message: 'Project or group not found'
      });
    }

    if (req.user.role === 'guide' && group.guide?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this group'
      });
    }

    // Calculate total scores
    const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
    const maxTotalScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);

    const evaluation = await Evaluation.create({
      project: projectId,
      group: groupId,
      evaluator: req.user._id,
      type,
      criteria,
      totalScore,
      maxTotalScore,
      comments,
      strengths,
      improvements
    });

    // Notify group members
    const io = req.app.get('io');
    await notifyMultipleUsers(io, group.members, {
      type: 'evaluation_added',
      title: 'New Evaluation',
      message: `Your ${type} evaluation has been completed. Grade: ${evaluation.grade}`,
      relatedProject: projectId,
      relatedGroup: groupId,
      sender: req.user._id
    });

    const populatedEvaluation = await Evaluation.findById(evaluation._id)
      .populate('evaluator', 'name email')
      .populate('project', 'title')
      .populate('group', 'name');

    res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      data: populatedEvaluation
    });
  } catch (error) {
    console.error('Create evaluation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create evaluation'
    });
  }
};

// Get all evaluations
exports.getAllEvaluations = async (req, res) => {
  try {
    const { projectId, groupId, type, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (projectId) query.project = projectId;
    if (groupId) query.group = groupId;
    if (type) query.type = type;

    // Filter based on user role
    if (req.user.role === 'student') {
      const group = await Group.findOne({ members: req.user._id });
      if (group) {
        query.group = group._id;
      }
    } else if (req.user.role === 'guide') {
      const projects = await Project.find({ guide: req.user._id }).select('_id');
      query.project = { $in: projects.map(p => p._id) };
    }

    const evaluations = await Evaluation.find(query)
      .populate('evaluator', 'name email role')
      .populate('project', 'title')
      .populate('group', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Evaluation.countDocuments(query);

    res.json({
      success: true,
      data: evaluations,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluations'
    });
  }
};

// Get evaluation by ID
exports.getEvaluationById = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('evaluator', 'name email role')
      .populate('project', 'title domain')
      .populate({
        path: 'group',
        populate: { path: 'members', select: 'name email rollNumber' }
      });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evaluation'
    });
  }
};

// Update evaluation
exports.updateEvaluation = async (req, res) => {
  try {
    const evaluationId = req.params.id;
    const updates = req.body;

    const evaluation = await Evaluation.findById(evaluationId);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if user is the evaluator
    if (evaluation.evaluator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own evaluations'
      });
    }

    // Recalculate scores if criteria changed
    if (updates.criteria) {
      updates.totalScore = updates.criteria.reduce((sum, c) => sum + c.score, 0);
      updates.maxTotalScore = updates.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    }

    const updatedEvaluation = await Evaluation.findByIdAndUpdate(
      evaluationId,
      updates,
      { new: true, runValidators: true }
    ).populate('evaluator', 'name email')
      .populate('project', 'title')
      .populate('group', 'name');

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      data: updatedEvaluation
    });
  } catch (error) {
    console.error('Update evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evaluation'
    });
  }
};

// Delete evaluation
exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check permissions
    if (
      evaluation.evaluator.toString() !== req.user._id.toString() &&
      !['coordinator', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this evaluation'
      });
    }

    await Evaluation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    console.error('Delete evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete evaluation'
    });
  }
};
