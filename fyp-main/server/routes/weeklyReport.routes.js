const express = require('express');
const router = express.Router();
const weeklyReportController = require('../controllers/weeklyReport.controller');
const { protect, authorize, isStudent, isGuideOrCoordinator } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect);

// Student routes
router.post('/', isStudent, upload.single('file'), weeklyReportController.submitReport);

// Group specific routes (accessible by student in group, guide, coordinator)
router.get('/group/:groupId', weeklyReportController.getGroupReports);

// Guide/Coordinator routes
router.put('/:id/review', isGuideOrCoordinator, weeklyReportController.reviewReport);

// Coordinator routes
router.get('/', authorize('coordinator', 'admin'), weeklyReportController.getAllReports);

module.exports = router;
