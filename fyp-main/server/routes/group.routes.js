const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('student'), groupController.createGroup);
router.post('/coordinator-create', authorize('coordinator', 'admin'), groupController.coordinatorCreateGroup);
router.get('/', groupController.getAllGroups);
router.get('/:id', groupController.getGroupById);
router.post('/:id/join', groupController.joinGroup);
router.post('/:id/approve-request', groupController.approveJoinRequest);
router.post('/:id/reject-request', groupController.rejectJoinRequest);
router.post('/:id/leave', groupController.leaveGroup);
router.post('/:id/remove-member', groupController.removeMember);
router.delete('/:id', groupController.deleteGroup);

// Coordinator/Admin only
router.post('/assign-guide', authorize('coordinator', 'admin'), groupController.assignGuide);
router.post('/auto-assign', authorize('coordinator', 'admin'), groupController.autoAssignGroups);

module.exports = router;
