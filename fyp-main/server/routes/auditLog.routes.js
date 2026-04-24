const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Only coordinators and admins can view audit logs
router.use(protect);
router.use(authorize('coordinator', 'admin'));

router.get('/', auditLogController.getAuditLogs);

module.exports = router;
