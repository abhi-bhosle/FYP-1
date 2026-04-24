const Group = require('../models/Group.model');
const User = require('../models/User.model');
const { notifyUser } = require('../utils/notification.utils');

// Create new group
exports.createGroup = async (req, res) => {
  try {
    const { name, maxMembers, department, year } = req.body;

    // Check if user is already in a group
    if (req.user.group) {
      return res.status(400).json({
        success: false,
        message: 'You are already in a group'
      });
    }

    const group = await Group.create({
      name,
      leader: req.user._id,
      members: [req.user._id],
      maxMembers: maxMembers || 4,
      department: department || req.user.department,
      year: year || req.user.year
    });

    // Update user's group
    await User.findByIdAndUpdate(req.user._id, { group: group._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email rollNumber')
      .populate('leader', 'name email')
      .populate('guide', 'name email');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: populatedGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create group'
    });
  }
};

// Coordinator creates a group for stragglers
exports.coordinatorCreateGroup = async (req, res) => {
  try {
    const { name, department, year, memberIds } = req.body;
    
    // Ensure the users are not already in another group
    const users = await User.find({ _id: { $in: memberIds }, group: null });
    if (users.length !== memberIds.length) {
      return res.status(400).json({ success: false, message: 'One or more users are already in a group or not found' });
    }

    const group = await Group.create({
      name,
      leader: memberIds[0], // Arbitrarily make the first member the leader
      members: memberIds,
      maxMembers: Math.max(4, memberIds.length),
      department,
      year
    });

    // Update all users' group references here
    await User.updateMany({ _id: { $in: memberIds } }, { group: group._id });

    res.status(201).json({ success: true, message: 'Straggler group successfully created', data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create straggler group' });
  }
};

// Get all groups
exports.getAllGroups = async (req, res) => {
  try {
    const { department, year, page = 1, limit = 10 } = req.query;
    
    const query = { isActive: true };
    if (department) query.department = department;
    if (year) query.year = parseInt(year);

    const groups = await Group.find(query)
      .populate('members', 'name email rollNumber')
      .populate('leader', 'name email')
      .populate('guide', 'name email')
      .populate('project', 'title status')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Group.countDocuments(query);

    res.json({
      success: true,
      data: groups,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups'
    });
  }
};

// Get group by ID
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email rollNumber phone avatar')
      .populate('leader', 'name email rollNumber')
      .populate('guide', 'name email phone')
      .populate('joinRequests.user', 'name email rollNumber')
      .populate('project');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group'
    });
  }
};

// Request to join group (sends request to leader for approval)
exports.joinGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    // Check if user is already in a group
    if (req.user.group) {
      return res.status(400).json({
        success: false,
        message: 'You are already in a group'
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }

    // Check if user already has a pending request for this group
    const existingRequest = group.joinRequests.find(
      r => r.user.toString() === req.user._id.toString()
    );
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this group'
      });
    }

    // Add join request instead of directly joining
    group.joinRequests.push({ user: req.user._id });
    await group.save();

    // Notify group leader about the join request
    const io = req.app.get('io');
    await notifyUser(io, {
      recipient: group.leader,
      type: 'group_invitation',
      title: 'New Join Request',
      message: `${req.user.name} has requested to join your group`,
      relatedGroup: group._id
    });

    res.json({
      success: true,
      message: 'Join request sent successfully. Waiting for leader approval.'
    });
  } catch (error) {
    console.error('Join group request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send join request'
    });
  }
};

// Approve join request (leader only)
exports.approveJoinRequest = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Only the leader can approve requests
    if (group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader can approve join requests'
      });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Group is already full'
      });
    }

    // Find and remove the join request
    const requestIndex = group.joinRequests.findIndex(
      r => r.user.toString() === userId
    );
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    // Check if the user is still available (not in another group)
    const requestingUser = await User.findById(userId);
    if (!requestingUser || requestingUser.group) {
      // Remove the stale request
      group.joinRequests.splice(requestIndex, 1);
      await group.save();
      return res.status(400).json({
        success: false,
        message: 'This user is no longer available (already in another group)'
      });
    }

    // Add user to group and remove their request
    group.members.push(userId);
    group.joinRequests.splice(requestIndex, 1);
    await group.save();

    // Update user's group reference
    await User.findByIdAndUpdate(userId, { group: group._id });

    // Notify the approved user
    const io = req.app.get('io');
    await notifyUser(io, {
      recipient: userId,
      type: 'group_invitation',
      title: 'Join Request Approved',
      message: `Your request to join group "${group.name}" has been approved!`,
      relatedGroup: group._id
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email rollNumber')
      .populate('leader', 'name email')
      .populate('guide', 'name email')
      .populate('joinRequests.user', 'name email rollNumber');

    res.json({
      success: true,
      message: 'Join request approved successfully',
      data: populatedGroup
    });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve join request'
    });
  }
};

// Reject join request (leader only)
exports.rejectJoinRequest = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Only the leader can reject requests
    if (group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader can reject join requests'
      });
    }

    // Find and remove the join request
    const requestIndex = group.joinRequests.findIndex(
      r => r.user.toString() === userId
    );
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    group.joinRequests.splice(requestIndex, 1);
    await group.save();

    // Notify the rejected user
    const io = req.app.get('io');
    await notifyUser(io, {
      recipient: userId,
      type: 'group_invitation',
      title: 'Join Request Declined',
      message: `Your request to join group "${group.name}" has been declined.`,
      relatedGroup: group._id
    });

    res.json({
      success: true,
      message: 'Join request rejected'
    });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject join request'
    });
  }
};

// Leave group
exports.leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the leader
    if (group.leader.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Group leader cannot leave. Please transfer leadership first or delete the group.'
      });
    }

    // Remove user from group
    group.members = group.members.filter(
      member => member.toString() !== req.user._id.toString()
    );
    await group.save();

    // Update user's group
    await User.findByIdAndUpdate(req.user._id, { group: null });

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group'
    });
  }
};

// Assign guide to group
exports.assignGuide = async (req, res) => {
  try {
    const { groupId, guideId } = req.body;

    const group = await Group.findById(groupId);
    const guide = await User.findById(guideId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!guide || guide.role !== 'guide') {
      return res.status(404).json({
        success: false,
        message: 'Guide not found'
      });
    }

    // Ensure the group is fully formed before assigning a guide
    if (group.members.length < group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: `Group is not full yet (${group.members.length}/${group.maxMembers} members). A guide can only be assigned when all members have joined.`
      });
    }

    group.guide = guideId;
    await group.save();

    // Notify guide and group members
    const io = req.app.get('io');
    
    await notifyUser(io, {
      recipient: guideId,
      type: 'guide_assigned',
      title: 'New Group Assigned',
      message: `You have been assigned as guide for group: ${group.name}`,
      relatedGroup: group._id
    });

    for (const memberId of group.members) {
      await notifyUser(io, {
        recipient: memberId,
        type: 'guide_assigned',
        title: 'Guide Assigned',
        message: `${guide.name} has been assigned as your project guide`,
        relatedGroup: group._id
      });
    }

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email rollNumber')
      .populate('leader', 'name email')
      .populate('guide', 'name email');

    res.json({
      success: true,
      message: 'Guide assigned successfully',
      data: populatedGroup
    });
  } catch (error) {
    console.error('Assign guide error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign guide'
    });
  }
};

// Remove member from group (leader only)
exports.removeMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { memberId } = req.body;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the group leader
    if (group.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader can remove members'
      });
    }

    // Check if trying to remove the leader
    if (group.leader.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the group leader'
      });
    }

    // Check if member exists in group
    const memberExists = group.members.some(
      member => member.toString() === memberId
    );

    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group'
      });
    }

    // Remove member from group
    group.members = group.members.filter(
      member => member.toString() !== memberId
    );
    await group.save();

    // Update user's group reference
    await User.findByIdAndUpdate(memberId, { group: null });

    // Notify the removed member
    const io = req.app.get('io');
    const removedUser = await User.findById(memberId);
    
    if (removedUser) {
      await notifyUser(io, {
        recipient: memberId,
        type: 'group_removal',
        title: 'Removed from Group',
        message: `You have been removed from group: ${group.name}`,
        relatedGroup: group._id
      });
    }

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email rollNumber')
      .populate('leader', 'name email')
      .populate('guide', 'name email');

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: populatedGroup
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is leader or coordinator/admin
    if (
      group.leader.toString() !== req.user._id.toString() &&
      !['coordinator', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only group leader or coordinator can delete the group'
      });
    }

    // Remove group reference from all members
    await User.updateMany(
      { _id: { $in: group.members } },
      { $unset: { group: 1 } }
    );

    await Group.findByIdAndDelete(groupId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group'
    });
  }
};

// Coordinator action to auto-assign students to groups
exports.autoAssignGroups = async (req, res) => {
  try {
    const { maxMembers = 4 } = req.body;
    
    // Find students with no group
    const students = await User.find({ role: 'student', isActive: true, group: null });
    
    if (students.length === 0) {
      return res.status(200).json({ success: true, message: 'No students found without a group' });
    }

    // Group students by department and year
    const stragglers = {};
    students.forEach(student => {
      const key = `${student.department}_${student.year}`;
      if (!stragglers[key]) stragglers[key] = [];
      stragglers[key].push(student);
    });

    const createdGroups = [];
    const io = req.app.get('io');
    const { logAction } = require('../utils/logger');

    for (const key in stragglers) {
      const list = stragglers[key];
      const [dept, year] = key.split('_');

      // Chunk into groups of maxMembers
      for (let i = 0; i < list.length; i += maxMembers) {
        const chunk = list.slice(i, i + maxMembers);
        const memberIds = chunk.map(s => s._id);

        const group = await Group.create({
          name: `AutoGroup_${dept}_${year}_${Date.now()}_${i}`,
          leader: memberIds[0],
          members: memberIds,
          maxMembers,
          department: dept,
          year: parseInt(year)
        });

        // Update users
        await User.updateMany({ _id: { $in: memberIds } }, { group: group._id });
        createdGroups.push(group);

        // Log audit action
        await logAction({
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'AUTO_ASSIGN_GROUP',
          entityType: 'Group',
          entityId: group._id,
          description: `Auto-created group ${group.name} with ${chunk.length} members`
        });

        // Notify students
        for (const member of chunk) {
          await notifyUser(io, {
            recipient: member._id,
            type: 'group_invitation',
            title: 'Auto-Assigned to Group',
            message: `You have been automatically assigned to group "${group.name}".`,
            relatedGroup: group._id
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdGroups.length} groups for unassigned students`,
      data: createdGroups
    });
  } catch (error) {
    console.error('Auto assign groups error:', error);
    res.status(500).json({ success: false, message: 'Failed to auto-assign groups' });
  }
};
