const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/detect-clash', aiController.detectTopicClash);
router.post('/proposal-feedback', aiController.generateProposalFeedback);
router.post('/report-feedback', authorize('guide', 'coordinator', 'admin'), aiController.generateReportFeedback);

module.exports = router;
